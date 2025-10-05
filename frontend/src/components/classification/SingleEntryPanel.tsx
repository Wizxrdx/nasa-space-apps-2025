'use client';

import React, { useEffect, useMemo } from 'react';
import { Grid, Accordion, NumberInput, Paper, Text, Group } from '@mantine/core'; // removed Badge
import { FEATURE_GROUPS, IMPORTANT_HEADERS } from '@/lib/csvColumns';
import { Prediction } from '../../app/classification/page';

type ShapValues = { class_index: number; base_value: number; per_feature: Record<string, number> };

function isFlagColumn(col: string) {
  return col.includes('fpflag') || col.endsWith('_flag');
}
function toLabel(col: string) {
  return col;
}

export default function SingleEntryPanel(props: {
  predA: React.SetStateAction<Prediction | null>;
  reset: () => void;
  showExplain: boolean;
  setShowExplain: (v: boolean) => void;
  inputs: Record<string, number | boolean | ''>;
  setInputs: React.Dispatch<React.SetStateAction<Record<string, number | boolean | ''>>>;
  setHeaders: React.Dispatch<React.SetStateAction<string[]>>;
  setRows: React.Dispatch<React.SetStateAction<Record<string, string>[]>>;
  shapValues?: ShapValues | null;
}) {
  const { inputs, setInputs, setHeaders, setRows } = props;

  const importantSet = useMemo(() => new Set(IMPORTANT_HEADERS), []);

  const allColumns = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    for (const g of FEATURE_GROUPS) {
      for (const c of g.columns) {
        if (!seen.has(c)) {
          seen.add(c);
          list.push(c);
        }
      }
    }
    return list;
  }, []);

  const groupsMissingImportant = useMemo(() => {
    const res = new Set<string>();
    for (const g of FEATURE_GROUPS) {
      const hasMissing = g.columns.some((c) => {
        if (!importantSet.has(c)) return false;
        const v = inputs[c];
        return v === '' || v === undefined || v === null;
      });
      if (hasMissing) res.add(g.key);
    }
    return res;
  }, [inputs, importantSet]);

  const currentRow = useMemo(() => {
    const row: Record<string, string> = {};
    for (const col of allColumns) {
      const v = inputs[col];
      if (v === undefined || v === null) {
        row[col] = '';
      } else if (typeof v === 'number') {
        row[col] = Number.isFinite(v) ? String(v) : '';
      } else if (typeof v === 'boolean') {
        row[col] = v ? '1' : '0';
      } else if (v === '' || v === 'undefined' || v === 'null') {
        row[col] = '';
      } else {
        row[col] = String(v);
      }
    }
    return row;
  }, [inputs, allColumns]);

  useEffect(() => {
    setHeaders(allColumns);
    setRows([currentRow]);
  }, [allColumns, currentRow, setHeaders, setRows]);

  return (
    <Grid gutter="lg">
      <Grid.Col span={{ base: 12, md: 12 }}>
        <Paper withBorder p="md" radius="md">
          <Text c="dimmed" size="sm" mb="xs">
            You can leave some fields empty, but important ones should be filled first for best results.
          </Text>
          <Accordion multiple mt="md" defaultValue={[]}>
            {FEATURE_GROUPS.map((g) => {
              const showDot = groupsMissingImportant.has(g.key);
              return (
                <Accordion.Item key={g.key} value={g.key}>
                  <Accordion.Control>
                    <Group gap={8}>
                      <span>{g.displayName}</span>
                      {showDot && (
                        <span
                          aria-label="Missing important fields in this group"
                          title="Missing important fields in this group"
                          style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: 9999,
                            background: 'var(--mantine-color-red-6, #e03131)',
                          }}
                        />
                      )}
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Grid>
                      {g.columns.map((col) => {
                        const val = inputs[col];
                        const isImportant = importantSet.has(col);

                        const labelStyle: React.CSSProperties = {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          ...(isImportant
                            ? {
                                background: 'var(--mantine-color-red-1, rgba(224, 49, 49, 0.12))',
                                borderRadius: 6,
                                padding: '0 6px',
                              }
                            : {}),
                        };

                        const labelNode = (
                          <Group gap={6} wrap="nowrap">
                            <span style={labelStyle}>{toLabel(col)}</span>
                          </Group>
                        );

                        if (isFlagColumn(col)) {
                          const display =
                            typeof val === 'number'
                              ? val
                              : val === ''
                              ? undefined
                              : typeof val === 'boolean'
                              ? (val ? 1 : 0)
                              : Number(val);

                          return (
                            <Grid.Col key={col} span={{ base: 12, sm: 6, md: 4, lg: 3, xl: 2 }}>
                              <NumberInput
                                label={labelNode}
                                value={Number.isFinite(display as number) ? (display as number) : undefined}
                                onChange={(v) =>
                                  setInputs((prev) => {
                                    if (typeof v !== 'number' || Number.isNaN(v)) return { ...prev, [col]: '' };
                                    const n = Math.max(0, Math.min(1, Math.round(v)));
                                    return { ...prev, [col]: n };
                                  })
                                }
                                min={0}
                                max={1}
                                step={1}
                                clampBehavior="strict"
                                placeholder="0 or 1"
                                rightSectionWidth={0}
                                w="10ch"
                              />
                            </Grid.Col>
                          );
                        }

                        return (
                          <Grid.Col key={col} span={{ base: 12, sm: 6, md: 4, lg: 3, xl: 2 }}>
                            <NumberInput
                              label={labelNode}
                              value={
                                typeof val === 'number'
                                  ? val
                                  : val === ''
                                  ? undefined
                                  : Number(val)
                              }
                              onChange={(v) =>
                                setInputs((prev) => ({
                                  ...prev,
                                  [col]: typeof v === 'number' && !Number.isNaN(v) ? v : '',
                                }))
                              }
                              step={0.1}
                              placeholder="Enter value"
                              rightSectionWidth={0}
                              w="12ch"
                            />
                          </Grid.Col>
                        );
                      })}
                    </Grid>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </Paper>
      </Grid.Col>
    </Grid>
  );
}