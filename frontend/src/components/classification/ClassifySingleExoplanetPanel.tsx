'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Group, Paper, Select, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { REQUIRED_HEADERS, OPTIONAL_HEADERS, IMPORTANT_HEADERS } from '@/lib/csvColumns';

type ModelsResponse = { all_models: Record<string, string[]> };
type ShapValues = { class_index: number; base_value: number; per_feature: Record<string, number> };

function isErrorDetail(val: unknown): val is { detail?: unknown } {
  return typeof val === 'object' && val !== null && 'detail' in val;
}

export default function ClassifySingleExoplanetPanel({
  inputs,
  onPredictions,
}: {
  inputs: Record<string, number | boolean | ''>;
  onPredictions?: (labels: string[], meta?: { model_version?: string; shap_values?: ShapValues }) => void;
}) {
  const [loading, setLoading] = useState(false);

  // Persisted params
  const [modelName, setModelName] = useState<string>('');
  const [modelVersion, setModelVersion] = useState<string>('');
  const initialModelNameRef = useRef<string>('');
  useEffect(() => {
    try {
      const m = localStorage.getItem('cls:model') || localStorage.getItem('single:model') || '';
      const v = localStorage.getItem('cls:version') || localStorage.getItem('single:version') || '';
      if (m) setModelName(m);
      if (v) setModelVersion(v);
      initialModelNameRef.current = m || '';
    } catch {
      // ignore storage errors
    }
  }, []);

  // Models
  const [modelsMap, setModelsMap] = useState<Record<string, string[]>>({});
  const [modelsLoading, setModelsLoading] = useState(false);
  const inflightRef = useRef<AbortController | null>(null);

  const allowedHeaders = useMemo(() => new Set<string>([...REQUIRED_HEADERS, ...OPTIONAL_HEADERS]), []);

  // Load models once on mount (no modelName dependency here)
  useEffect(() => {
    inflightRef.current?.abort();
    const ac = new AbortController();
    inflightRef.current = ac;

    (async () => {
      try {
        setModelsLoading(true);
        const resp = await fetch('http://52.77.216.0:8000/api/v1/models/all/', { signal: ac.signal });
        if (!resp.ok) throw new Error(`Failed to fetch models (HTTP ${resp.status})`);
        const data = (await resp.json()) as ModelsResponse;
        const map = data?.all_models ?? {};
        setModelsMap(map);

        // Compose list: base array + versioned keys
        const baseList: string[] = Array.isArray(map.base) ? map.base : [];
        const versionedNames = Object.keys(map).filter((k) => k !== 'base');
        const combinedNames = [...baseList, ...versionedNames];

        if (combinedNames.length) {
          const preferred = initialModelNameRef.current;
          const nextModel = preferred && combinedNames.includes(preferred) ? preferred : combinedNames[0];
          setModelName((prev) => (prev || nextModel));
          const versions = Array.isArray(map[nextModel]) ? map[nextModel] : [];
          const isVersioned = versions.length > 0 && versions.every((v) => /^\d+$/.test(v));
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
  }, []);

  const modelOptions = useMemo(
    () => {
      const baseList: string[] = Array.isArray(modelsMap.base) ? modelsMap.base : [];
      const versionedNames = Object.keys(modelsMap).filter((k) => k !== 'base');
      return [
        ...baseList.map((n) => ({ value: n, label: n })),
        ...versionedNames.map((n) => ({ value: n, label: n })),
      ];
    },
    [modelsMap]
  );

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
    try {
      localStorage.setItem('cls:model', modelName);
      localStorage.setItem('cls:version', modelVersion);
      localStorage.setItem('single:model', modelName);
      localStorage.setItem('single:version', modelVersion);
    } catch {
      // ignore storage errors
    }
  }

  async function handleClassify() {
    if (loading) return;
    try {
      setLoading(true);

      if (!modelName) {
        notifications.show({ color: 'yellow', title: 'Pick a model', message: 'Please select a model first.' });
        return;
      }
      if (versioned && !modelVersion) {
        notifications.show({ color: 'yellow', title: 'Pick a version', message: 'Please select a version for this model.' });
        return;
      }

      // Validate: all IMPORTANT_HEADERS must be provided (0 is valid)
      const missingImportant = IMPORTANT_HEADERS.filter((key) => {
        const v = inputs[key];
        return v === '' || v === undefined || v === null;
      });
      if (missingImportant.length > 0) {
        const preview = missingImportant.slice(0, 6).join(', ');
        notifications.show({
          color: 'red',
          title: 'Missing important fields',
          message: `Please fill these before classifying: ${preview}${missingImportant.length > 6 ? '…' : ''}`,
        });
        return;
      }

      // Build JSON payload from inputs (only allowed features)
      const data: Record<string, number> = {};
      for (const key of Object.keys(inputs)) {
        if (!allowedHeaders.has(key)) continue;
        const v = inputs[key];
        if (v === '' || v === null || v === undefined) continue;
        if (typeof v === 'boolean') {
          data[key] = v ? 1 : 0;
        } else {
          const num = typeof v === 'number' ? v : Number(v);
          if (!Number.isNaN(num)) data[key] = num;
        }
      }

      persistParams();

      const qs = new URLSearchParams();
      qs.set('model', modelName);
      if (versioned && modelVersion) qs.set('version', modelVersion);

      const resp = await fetch(`http://52.77.216.0:8000/api/v1/predict/single/?${qs.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (!resp.ok) {
        const errJson: unknown = await resp.json().catch(() => null);
        const message = isErrorDetail(errJson) && typeof errJson.detail === 'string' ? errJson.detail : `HTTP ${resp.status}`;
        throw new Error(message);
      }

      type SinglePredictionResponse = { prediction: string; shap_values?: ShapValues; model_version?: string };
      const json = (await resp.json()) as SinglePredictionResponse;
      const label = json?.prediction ?? '';

      onPredictions?.([String(label)], {
        model_version: json?.model_version ?? (versioned ? modelVersion : undefined),
        shap_values: json?.shap_values,
      });

      notifications.show({
        color: 'teal',
        title: 'Classification complete',
        message: `Predicted: ${String(label)}${json?.model_version ? ` (model ${json.model_version})` : ''}.`,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Request failed';
      notifications.show({ color: 'red', title: 'Classification failed', message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Paper withBorder p="md" radius="md">
      <Text fw={600} mb="xs">Model selection</Text>
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
            searchable
          />
        ) : (
          <TextInput label="Version" placeholder="(not required for this model)" value="" readOnly disabled />
        )}
      </Group>

      <Group justify="flex-end" mt="md">
        <Button loading={loading} onClick={handleClassify}>
          Classify
        </Button>
      </Group>
    </Paper>
  );
}