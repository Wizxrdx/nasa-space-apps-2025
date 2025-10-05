'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Container, Divider, Grid, Group, Stack, Text, Title } from '@mantine/core'; // removed Paper
import { FEATURE_GROUPS } from '@/lib/csvColumns';
import ClassifySingleExoplanetPanel from '@/components/classification/ClassifySingleExoplanetPanel';
import SingleEntryPanel from '@/components/classification/SingleEntryPanel';
import ResultPanel from '@/components/classification/ResultPanel';

export type Prediction = {
  label: 'Confirmed' | 'Candidate' | 'False Positive';
  color: 'teal' | 'yellow' | 'red';
  contributions: { group: string; value: number }[];
};

type ShapValues = { class_index: number; base_value: number; per_feature: Record<string, number> };

export default function ClassificationPage() {
  const [showExplain, setShowExplain] = useState(true);
  const [predA, setPredA] = useState<Prediction | null>(null);
  const [shapValues, setShapValues] = useState<ShapValues | null>(null);

  // Inputs for all columns
  const [inputs, setInputs] = useState<Record<string, number | boolean | ''>>(() => {
    const init: Record<string, number | boolean | ''> = {};
    for (const g of FEATURE_GROUPS) {
      for (const c of g.columns) init[c] = '';
    }
    return init;
  });

  // Table state used by the CSV ClassifyExoplanet button (kept for SingleEntryPanel sync)
  const [, setHeaders] = useState<string[]>([]);
  const [, setRows] = useState<Record<string, string>[]>([]);

  const reset = useCallback(() => {
    setPredA(null);
    setShapValues(null);
  }, []);

  // Normalize label and capture SHAP from /predict/single/
  const handlePredictions = useCallback((labels: string[], meta?: { shap_values?: ShapValues }) => {
    const first = (labels && labels[0]) || '';
    const norm = String(first).toLowerCase();
    const label: Prediction['label'] =
      norm.includes('confirm') ? 'Confirmed' :
      norm.includes('false') ? 'False Positive' :
      'Candidate';
    const color: Prediction['color'] =
      label === 'Confirmed' ? 'teal' : label === 'False Positive' ? 'red' : 'yellow';
    setPredA({ label, color, contributions: [] });
    setShapValues(meta?.shap_values ?? null);
  }, []);

  const headerNote = useMemo(
    () => 'Enter features, then classify a single case or upload CSV for batch predictions.',
    []
  );

  return (
    <Container size="xl" px="md" py="md">
      <Stack gap="sm">
        <Group align="center" justify="space-between">
          <div>
            <Title order={2}>Classification Sandbox</Title>
            <Text c="dimmed" size="sm">{headerNote}</Text>
          </div>

          {/* Removed top-right classify button; use sidebar panel instead */}
        </Group>

        <Divider my="sm" />

        <Grid gutter="xl" align="flex-start">
          {/* Left: inputs */}
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <SingleEntryPanel
              predA={predA}
              reset={reset}
              showExplain={showExplain}
              setShowExplain={setShowExplain}
              inputs={inputs}
              setInputs={setInputs}
              setHeaders={setHeaders}
              setRows={setRows}
              shapValues={shapValues}
            />
          </Grid.Col>

          {/* Right: panel when no result, result when available */}
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <div style={{ position: 'sticky', top: 16 }}>
              {predA ? (
                <ResultPanel
                  pred={predA}
                  showExplain={showExplain}
                  onReset={reset}
                  shapValues={shapValues ?? undefined}
                />
              ) : (
                <ClassifySingleExoplanetPanel
                  inputs={inputs}
                  onPredictions={handlePredictions} // reuse handler; removes any-cast
                />
              )}
            </div>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}