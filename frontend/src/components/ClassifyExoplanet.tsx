'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Group, Modal, Select, Switch, TextInput } from '@mantine/core';
import Papa from 'papaparse';
import { notifications } from '@mantine/notifications';
import { REQUIRED_HEADERS, OPTIONAL_HEADERS } from '@/lib/csvColumns';

type Row = Record<string, string>;

type ModelsResponse = { all_models: Record<string, string[]> };

type EvalMetrics = { precision: number; recall: number; 'f1-score': number; support: number };
type Evaluation = Record<string, EvalMetrics | number>;

export interface ClassifyExoplanetProps {
  headers: string[];
  rows: Row[];
  setHeaders: React.Dispatch<React.SetStateAction<string[]>>;
  setRows: React.Dispatch<React.SetStateAction<Row[]>>;
  buttonSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  buttonVariant?: 'filled' | 'light' | 'outline' | 'default' | 'subtle';
  buttonLabel?: string;
  onEvaluation?: (evaluation: Evaluation) => void; // NEW
  onPredictions?: (labels: string[], meta?: { rows?: number; model_version?: string; evaluation?: Evaluation }) => void; // NEW
}

export default function ClassifyExoplanet({
  headers,
  rows,
  setHeaders,
  setRows,
  buttonSize = 'md',
  buttonVariant = 'filled',
  buttonLabel,
  onEvaluation,
  onPredictions,
}: ClassifyExoplanetProps) {
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);

  // Persisted params
  const [modelName, setModelName] = useState<string>(() => localStorage.getItem('cls:model') || '');
  const [modelVersion, setModelVersion] = useState<string>(() => localStorage.getItem('cls:version') || '');
  const [evaluate, setEvaluate] = useState<boolean>(() => localStorage.getItem('cls:evaluate') === 'true');

  // Models fetched on each open
  const [modelsMap, setModelsMap] = useState<Record<string, string[]>>({});
  const [modelsLoading, setModelsLoading] = useState(false);
  const inflightRef = useRef<AbortController | null>(null);

  const label = useMemo(
    () =>
      buttonLabel ??
      (modelName || modelVersion
        ? `Classify (${modelName || 'model'}${modelVersion ? `@${modelVersion}` : ''})`
        : 'Classify Exoplanets'),
    [buttonLabel, modelName, modelVersion]
  );

  const allowedHeaders = useMemo(() => [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS], []);

  // Fetch models every time the modal opens; abort if re-opened fast
  useEffect(() => {
    if (!opened) return;

    inflightRef.current?.abort();
    const ac = new AbortController();
    inflightRef.current = ac;

    (async () => {
      try {
        setModelsLoading(true);
        // keep /all/
        const resp = await fetch('http://localhost:8000/api/v1/models/all/', { signal: ac.signal });
        if (!resp.ok) throw new Error(`Failed to fetch models (HTTP ${resp.status})`);
        const data = (await resp.json()) as ModelsResponse;
        const map = data?.all_models ?? {};
        setModelsMap(map);

        // Build combined list: base array entries + other keys
        const baseList = Array.isArray((map as any).base) ? ((map as any).base as string[]) : [];
        const versionedNames = Object.keys(map).filter((k) => k !== 'base');
        const combinedNames = [...baseList, ...versionedNames];

        if (combinedNames.length) {
          const nextModel = combinedNames.includes(modelName) ? modelName : combinedNames[0];
          if (nextModel !== modelName) setModelName(nextModel);

          const versions = Array.isArray((map as any)[nextModel]) ? ((map as any)[nextModel] as string[]) : [];
          const isVersioned = versions.length > 0 && versions.every((v) => /^\d+$/.test(v));
          if (isVersioned) {
            // start empty; user must pick a version
            if (modelVersion) setModelVersion('');
          } else if (modelVersion) {
            setModelVersion('');
          }
        } else {
          setModelName('');
          setModelVersion('');
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          notifications.show({ color: 'red', title: 'Models fetch failed', message: e?.message || 'Unable to load models' });
        }
      } finally {
        if (!ac.signal.aborted) setModelsLoading(false);
        if (inflightRef.current === ac) inflightRef.current = null;
      }
    })();

    return () => ac.abort();
  }, [opened]); // fetch on every open

  const modelOptions = useMemo(() => {
    const baseList = Array.isArray((modelsMap as any).base) ? ((modelsMap as any).base as string[]) : [];
    const versionedNames = Object.keys(modelsMap).filter((k) => k !== 'base');
    return [
      ...baseList.map((n) => ({ value: n, label: n })),           // base models (no versions)
      ...versionedNames.map((n) => ({ value: n, label: n })),      // versioned models (keys)
    ];
  }, [modelsMap]);

  const currentVersions = (modelName && Array.isArray((modelsMap as any)[modelName]))
    ? (((modelsMap as any)[modelName] as string[]))
    : [];
  const versioned = currentVersions.length > 0 && currentVersions.every((v) => /^\d+$/.test(v));
  const versionOptions = useMemo(
    () =>
      versioned
        ? [...currentVersions].sort((a, b) => Number(b) - Number(a)).map((v) => ({ value: v, label: v }))
        : [],
    [currentVersions, versioned]
  );

  function persistParams() {
    localStorage.setItem('cls:model', modelName);
    localStorage.setItem('cls:version', modelVersion);
    localStorage.setItem('cls:evaluate', String(evaluate));
  }

  async function handleClassify() {
    if (loading) return;
    try {
      setLoading(true);
      if (!rows.length) {
        notifications.show({ color: 'yellow', title: 'No data', message: 'There are no rows to classify.' });
        return;
      }
      if (!modelName) {
        notifications.show({ color: 'yellow', title: 'Pick a model', message: 'Please select a model first.' });
        return;
      }
      if (versioned && !modelVersion) {
        notifications.show({ color: 'yellow', title: 'Pick a version', message: 'Please select a version for this model.' });
        return;
      }

      persistParams();

      // Decide which headers to send:
      const allowed = new Set([...REQUIRED_HEADERS, ...OPTIONAL_HEADERS]);

      // Start from current table headers to preserve order
      let sendHeaders = headers.filter((h) => allowed.has(h));

      // Never send our local prediction column
      sendHeaders = sendHeaders.filter((h) => h !== 'prediction');

      // Do not send if no valid columns remain
      if (sendHeaders.length === 0) {
        notifications.show({
          color: 'yellow',
          title: 'No valid columns',
          message: 'There are no allowed columns to send.',
        });
        return;
      }

      const hasLabel = sendHeaders.includes('label') || headers.includes('label');

      if (evaluate) {
        // Require a real label column if evaluation is requested
        if (!hasLabel) {
          notifications.show({
            color: 'yellow',
            title: 'Missing label column',
            message: "Evaluation requires a 'label' column in the table.",
          });
          return;
        }
        // Ensure label is included (in case it exists in headers but got filtered out above)
        if (!sendHeaders.includes('label') && headers.includes('label') && allowed.has('label')) {
          sendHeaders.push('label');
        }
      } else {
        // If not evaluating, strip label to avoid sending it unnecessarily
        sendHeaders = sendHeaders.filter((h) => h !== 'label');
      }

      // Build row objects limited to sendHeaders and sanitize values
      const sendRowsRaw = rows.map((r) => {
        const o: Record<string, string> = {};
        for (const h of sendHeaders) {
          const v = r[h] as unknown;
          o[h] =
            v === undefined || v === null || v === 'undefined' || v === 'null'
              ? ''
              : String(v).trim();
        }
        return o;
      });

      // Drop rows that are entirely empty across all sendHeaders
      const sendRows = sendRowsRaw.filter((r) => sendHeaders.some((h) => r[h] !== ''));

      if (sendRows.length === 0) {
        notifications.show({
          color: 'yellow',
          title: 'No data',
          message: 'All rows are empty; nothing to classify.',
        });
        return;
      }

      const csv = Papa.unparse({ fields: sendHeaders, data: sendRows });
      const form = new FormData();
      const filePrimary = new File([csv], 'features.csv', { type: 'text/csv' });
      const file =
        ['text/csv', 'application/csv', 'application/vnd.ms-excel'].includes(filePrimary.type)
          ? filePrimary
          : new File([csv], 'features.csv', { type: 'application/csv' });
      form.append('file', file);

      const qs = new URLSearchParams();
      qs.set('model', modelName);
      if (versioned && modelVersion) qs.set('version', modelVersion);
      if (evaluate) qs.set('evaluate', 'true');

      const resp = await fetch(`http://localhost:8000/api/v1/predict/?${qs.toString()}`, { method: 'POST', body: form });
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error((err as any)?.detail || `HTTP ${resp.status}`);
      }
      const data = (await resp.json()) as {
        prediction: string[];
        rows: number;
        model_version?: string;
        evaluation?: Evaluation;
      };

      if (!Array.isArray(data.prediction)) throw new Error('Invalid response: prediction is not an array');
      if (data.prediction.length !== sendRows.length) {
        throw new Error(`Prediction length mismatch: got ${data.prediction.length}, expected ${sendRows.length}`);
      }

      setHeaders((prev) => (prev.includes('prediction') ? prev : [...prev, 'prediction']));
      // Only annotate the rows we actually sent; leave others untouched
      setRows((prev) => {
        const annotated: Row[] = [];
        let idx = 0;
        for (const r of prev) {
          // Determine if this row would have been included (all-empty rows were dropped)
          const candidate: Record<string, string> = {};
          for (const h of sendHeaders) {
            const v = r[h] as unknown;
            candidate[h] =
              v === undefined || v === null || v === 'undefined' || v === 'null'
                ? ''
                : String(v).trim();
          }
          const wasSent = sendHeaders.some((h) => candidate[h] !== '');
          if (wasSent) {
            annotated.push({ ...r, prediction: String(data.prediction[idx++] ?? '') });
          } else {
            annotated.push(r);
          }
        }
        return annotated;
      });

      // Pass evaluation up to DataPage (if present)
      if (data.evaluation) {
        onEvaluation?.(data.evaluation);
      }
      // Pass predictions up so the page can show ResultPanel
      onPredictions?.(data.prediction, {
        rows: data.rows,
        model_version: data.model_version,
        evaluation: data.evaluation,
      });

      notifications.show({
        color: 'teal',
        title: 'Classification complete',
        message: `Predicted ${data.rows ?? sendRows.length} rows${data.model_version ? ` (model ${data.model_version})` : ''}.`,
      });
      setOpened(false);
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Classification failed', message: e?.message || 'Request failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => {
          if (!rows.length || !headers.length) {
            notifications.show({
              color: 'yellow',
              title: 'No data to classify',
              message: 'Please add at least one row and include headers before classifying.',
            });
            return;
          }
          // Sanitize rows: replace undefined/null/'undefined'/'null' with ''
          const cleaned = rows.map((r) => {
            const o: Record<string, string> = {};
            for (const h of headers) {
              const v = r[h] as unknown;
              o[h] =
                v === undefined || v === null || v === 'undefined' || v === 'null'
                  ? ''
                  : String(v);
            }
            return o;
          });
          setRows(cleaned);
          setOpened(true);
        }}
      >
        {label}
      </Button>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Classify Exoplanets" centered>
        <Group grow>
          <Select
            label="Model"
            placeholder={modelsLoading ? 'Loading models…' : 'Select model'}
            data={modelOptions}
            value={modelName || null}
            onChange={(value) => {
              const v = value || '';
              setModelName(v);
              const versions = Array.isArray((modelsMap as any)[v]) ? ((modelsMap as any)[v] as string[]) : [];
              const isVersioned = versions.length > 0 && versions.every((t) => /^\d+$/.test(t));
              // require user to pick a version when versioned
              setModelVersion(isVersioned ? '' : '');
            }}
            searchable
            disabled={modelsLoading || modelOptions.length === 0}
          />

          {versioned ? (
            <Select
              label="Version"
              placeholder="Select version"
              data={versionOptions}
              value={modelVersion || null}
              onChange={(v) => setModelVersion(v || '')}
              disabled={modelsLoading || versionOptions.length === 0}
            />
          ) : (
            <TextInput label="Version" placeholder="(not required for this model)" value="" readOnly disabled />
          )}
        </Group>

        <Switch
          mt="md"
          checked={evaluate}
          onChange={(e) => setEvaluate(e.currentTarget.checked)}
          label="Include evaluation (requires label column if your model uses it)"
        />

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={() => setOpened(false)} disabled={loading}>
            Cancel
          </Button>
          <Button loading={loading} onClick={handleClassify} disabled={!modelName || (versioned && !modelVersion)}>
            Classify
          </Button>
        </Group>
      </Modal>
    </>
  );
}