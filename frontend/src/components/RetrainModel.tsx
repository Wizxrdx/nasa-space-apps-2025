'use client';

import React, { useMemo, useState } from 'react';
import { Button, Group, Modal, TextInput, Switch } from '@mantine/core';
import Papa from 'papaparse';
import { notifications } from '@mantine/notifications';

type Row = Record<string, string>;
type EvalMetrics = { precision: number; recall: number; 'f1-score': number; support: number };
export type Evaluation = Record<string, EvalMetrics | number>;

export interface RetrainModelProps {
  headers: string[];
  rows: Row[];
  buttonSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  buttonVariant?: 'filled' | 'light' | 'outline' | 'default' | 'subtle';
  onEvaluation?: (evaluation: Evaluation) => void; // show metrics on data page if backend returns them
}

export default function RetrainModel({
  headers,
  rows,
  buttonSize = 'md',
  buttonVariant = 'filled',
  onEvaluation,
}: RetrainModelProps) {
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);

  // Persisted params
  const [targetModel, setTargetModel] = useState<string>(() => localStorage.getItem('rt:model') || '');
  const [targetVersion, setTargetVersion] = useState<string>(() => localStorage.getItem('rt:version') || '');
  const [evaluate, setEvaluate] = useState<boolean>(() => localStorage.getItem('rt:evaluate') === 'true');

  const label = useMemo(
    () =>
      targetModel || targetVersion
        ? `Retrain (${targetModel || 'model'}${targetVersion ? `@${targetVersion}` : ''})`
        : 'Retrain / Fine‑tune Model',
    [targetModel, targetVersion]
  );

  function persist() {
    localStorage.setItem('rt:model', targetModel);
    localStorage.setItem('rt:version', targetVersion);
    localStorage.setItem('rt:evaluate', String(evaluate));
  }

  async function handleRetrain() {
    if (loading) return;
    try {
      setLoading(true);

      if (!rows.length) {
        notifications.show({ color: 'yellow', title: 'No data', message: 'There are no rows to retrain with.' });
        return;
      }
      if (!targetModel) {
        notifications.show({ color: 'yellow', title: 'Model required', message: 'Enter a target model name.' });
        return;
      }
      // Retraining requires labels
      if (!headers.includes('label')) {
        notifications.show({
          color: 'red',
          title: 'Missing label column',
          message: "Retraining requires a 'label' column in the table.",
        });
        return;
      }

      persist();

      // Build CSV from current table headers, excluding UI columns like prediction
      const sendHeaders = headers.filter((h) => h && h !== 'prediction');
      // Ensure 'label' is included for training
      if (!sendHeaders.includes('label') && headers.includes('label')) sendHeaders.push('label');

      const sendRows = rows.map((r) => {
        const o: Record<string, string> = {};
        for (const h of sendHeaders) o[h] = r[h] ?? '';
        return o;
      });

      const csv = Papa.unparse({ fields: sendHeaders, data: sendRows });
      const form = new FormData();
      // Use allowed MIME type; let browser set multipart boundary
      const filePrimary = new File([csv], 'train.csv', { type: 'text/csv' });
      const file =
        ['text/csv', 'application/csv', 'application/vnd.ms-excel'].includes(filePrimary.type)
          ? filePrimary
          : new File([csv], 'train.csv', { type: 'application/csv' });
      form.append('file', file);

      const qs = new URLSearchParams();
      qs.set('model', targetModel);
      if (targetVersion) qs.set('version', targetVersion);
      if (evaluate) qs.set('evaluate', 'true');

      const resp = await fetch(`http://localhost:8000/api/v1/retrain/?${qs.toString()}`, {
        method: 'POST',
        body: form,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error((err)?.detail || `HTTP ${resp.status}`);
      }
      const data = (await resp.json()) as {
        message?: string;
        model?: string;
        model_version?: string;
        rows?: number;
        evaluation?: Evaluation;
      };

      if (data.evaluation) onEvaluation?.(data.evaluation);

      notifications.show({
        color: 'teal',
        title: 'Retrain submitted',
        message:
          data.message ??
          `Retrain ${targetModel}${targetVersion ? `@${targetVersion}` : ''} ${
            evaluate ? '(with evaluation)' : ''
          } started.`,
      });
      setOpened(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Request failed';
      notifications.show({ color: 'red', title: 'Retrain failed', message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant={buttonVariant} size={buttonSize} onClick={() => setOpened(true)} disabled={!rows.length}>
        {label}
      </Button>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Retrain / Fine‑tune Model" centered>
        <Group grow>
          <TextInput
            label="Target model"
            placeholder="e.g., my-model"
            value={targetModel}
            onChange={(e) => setTargetModel(e.currentTarget.value)}
          />
          <TextInput
            label="Target version (optional)"
            placeholder="e.g., 20251004123000"
            value={targetVersion}
            onChange={(e) => setTargetVersion(e.currentTarget.value)}
          />
        </Group>
        <Switch
          mt="md"
          checked={evaluate}
          onChange={(e) => setEvaluate(e.currentTarget.checked)}
          label="Run evaluation after training (requires 'label' column)"
        />
        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={() => setOpened(false)} disabled={loading}>
            Cancel
          </Button>
          <Button loading={loading} onClick={handleRetrain}>
            Retrain
          </Button>
        </Group>
      </Modal>
    </>
  );
}