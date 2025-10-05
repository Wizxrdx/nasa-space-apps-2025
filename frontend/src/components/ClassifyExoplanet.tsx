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
  onEvaluation?: (evaluation: Evaluation) => void;
  onPredictions?: (labels: string[], meta?: { rows?: number; model_version?: string; evaluation?: Evaluation }) => void;
}

function isErrorDetail(val: unknown): val is { detail?: unknown } {
  return typeof val === 'object' && val !== null && 'detail' in val;
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

  // Fetch models on modal open; abort if re-opened fast
  useEffect(() => {
    if (!opened) return;

    inflightRef.current?.abort();
    const ac = new AbortController();
    inflightRef.current = ac;

    (async () => {
      try {
        setModelsLoading(true);
        const resp = await fetch('https://52.77.216.0:8000/api/v1/models/all/', { signal: ac.signal });
        if (!resp.ok) throw new Error(`Failed to fetch models (HTTP ${resp.status})`);
        const data = (await resp.json()) as ModelsResponse;
        const map = data?.all_models ?? {};
        setModelsMap(map);

        // Build combined list: base array entries + other keys
        const baseList = Array.isArray(map.base) ? map.base : [];
        const versionedNames = Object.keys(map).filter((k) => k !== 'base');
        const combinedNames = [...baseList, ...versionedNames];

        if (combinedNames.length) {
          const nextModel = combinedNames.includes(modelName) ? modelName : combinedNames[0];
          if (nextModel !== modelName) setModelName(nextModel);

          const versions = Array.isArray(map[nextModel]) ? map[nextModel] : [];
          const isVersioned = versions.length > 0 && versions.every((v) => /^\d+$/.test(v));
          // reset version selection when switching model
          setModelVersion(isVersioned ? '' : '');
        } else {
          setModelName('');
          setModelVersion('');
        }
      } catch (e: unknown) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          const message = e instanceof Error ? e.message : 'Unable to load models';
          notifications.show({ color: 'red', title: 'Models fetch failed', message });
        }
      } finally {
        if (!ac.signal.aborted) setModelsLoading(false);
        if (inflightRef.current === ac) inflightRef.current = null;
      }
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const modelOptions = useMemo(() => {
    const baseList = Array.isArray(modelsMap.base) ? modelsMap.base : [];
    const versionedNames = Object.keys(modelsMap).filter((k) => k !== 'base');
    return [
      ...baseList.map((n) => ({ value: n, label: n })),
      ...versionedNames.map((n) => ({ value: n, label: n })),
    ];
  }, [modelsMap]);

  const currentVersions = useMemo(() => {
    if (!modelName) return [] as string[];
    const arr = modelsMap[modelName];
    return Array.isArray(arr) ? arr : [];
  }, [modelName, modelsMap]);

  const versioned = currentVersions.length > 0 && currentVersions.every((v) => /^\d+$/.test(v));

  const versionOptions = useMemo(
    () => (versioned ? [...currentVersions].sort((a, b) => Number(b) - Number(a)).map((v) => ({ value: v, label: v })) : []),
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
      const allowed = new Set<string>([...REQUIRED_HEADERS, ...OPTIONAL_HEADERS]);

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
        if (!hasLabel) {
          notifications.show({
            color: 'yellow',
            title: 'Missing label column',
            message: "Evaluation requires a 'label' column in the table.",
          });
          return;
        }
        if (!sendHeaders.includes('label') && headers.includes('label') && allowed.has('label')) {
          sendHeaders.push('label');
        }
      } else {
        sendHeaders = sendHeaders.filter((h) => h !== 'label');
      }

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

      const resp = await fetch(`https://52.77.216.0:8000/api/v1/predict/?${qs.toString()}`, { method: 'POST', body: form });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => null) as unknown;
        const msg = isErrorDetail(errJson) && typeof errJson.detail === 'string' ? errJson.detail : `HTTP ${resp.status}`;
        throw new Error(msg);
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
      setRows((prev) => {
        const annotated: Row[] = [];
        let idx = 0;
        for (const r of prev) {
          const candidate: Record<string, string> = {};
          for (const h of sendHeaders) {
            const v = r[h] as unknown;
            candidate[h] =
              v === undefined || v === null || v === 'undefined' || v === 'null'
                ? ''
                : String(v).trim();
          }
          const wasSent = sendHeaders.some((h) => candidate[h] !== '');
          annotated.push(wasSent ? { ...r, prediction: String(data.prediction[idx++] ?? '') } : r);
        }
        return annotated;
      });

      if (data.evaluation) onEvaluation?.(data.evaluation);
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Request failed';
      notifications.show({ color: 'red', title: 'Classification failed', message });
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
              const versions = Array.isArray(modelsMap[v]) ? (modelsMap[v] as string[]) : [];
              const isVersioned = versions.length > 0 && versions.every((t) => /^\d+$/.test(t));
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