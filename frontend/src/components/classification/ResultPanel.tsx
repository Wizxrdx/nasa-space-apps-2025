'use client';

import React, { useMemo, useState } from 'react';
import { Badge, Button, Divider, Group, Stack, Text, Title, Table, ScrollArea, Tooltip } from '@mantine/core';
import InputGroup from '../classification/InputGroup';

type Prediction = {
  label: 'Confirmed' | 'Candidate' | 'False Positive';
  color: 'teal' | 'yellow' | 'red';
  contributions: { group: string; value: number }[]; // kept for backward-compat
};

type ShapValues = {
  class_index: number;
  base_value: number;
  per_feature: Record<string, number>;
};

export default function ResultPanel({
  pred,
  showExplain,
  onReset,
  shapValues, // NEW: optional SHAP payload from /predict/single/
}: {
  pred: Prediction | null;
  showExplain: boolean;
  onReset: () => void;
  shapValues?: ShapValues | null;
}) {
  if (!pred) return null;

  // Build contributions list: prefer SHAP > legacy contributions
  const contributions = useMemo(() => {
    if (shapValues?.per_feature) {
      return Object.entries(shapValues.per_feature).map(([group, value]) => ({ group, value }));
    }
    return pred.contributions || [];
  }, [shapValues, pred]);

  // Sort by absolute impact
  const sorted = useMemo(
    () => [...contributions].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
    [contributions]
  );

  // Helpful/harmful split for quick reading
  const helpful = useMemo(() => sorted.filter((x) => x.value > 0).slice(0, 5), [sorted]);
  const harmful = useMemo(() => sorted.filter((x) => x.value < 0).slice(0, 5), [sorted]);

  const [showAll, setShowAll] = useState(false);

  function downloadCsv() {
    const rows = [['feature', 'contribution']];
    for (const { group, value } of sorted) rows.push([group, String(value)]);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shap_contributions_${pred?.label.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <InputGroup
      title={
        <Group justify="space-between" align="center" w="100%">
          <Title order={4} m={0}>Result</Title>
          <Button size="xs" variant="default" onClick={onReset}>
            Retry New Case
          </Button>
        </Group>
      }
    >
      <Stack gap="xs">
        <Group justify="flex-start" align="center">
          <Badge color={pred.color} size="lg" variant="light">
            {pred.label}
          </Badge>
          {typeof shapValues?.class_index === 'number' && (
            <Badge color="gray" variant="light">Class index: {shapValues.class_index}</Badge>
          )}
          {typeof shapValues?.base_value === 'number' && (
            <Tooltip
              label="Baseline prediction for this class before adding feature effects (model-specific units)."
              withArrow
            >
              <Badge color="gray" variant="outline">Baseline: {shapValues.base_value.toFixed(4)}</Badge>
            </Tooltip>
          )}
        </Group>

        {showExplain && (
          <>
            <Text size="sm" c="dimmed">
              Why this decision? These lists show which features pushed the model towards or away from the predicted class.
              Positive values support the prediction; negative values oppose it. Magnitude reflects relative impact (SHAP value).
            </Text>

            {/* Side-by-side Top 5 only */}
            <Group justify="space-between" mt="sm" align="flex-start" wrap="nowrap">
              <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                <Text fw={700} size="sm">Top 5 Helpful</Text>
                {helpful.length ? (
                  <Stack gap={4}>
                    {helpful.map((h) => (
                      <Group key={h.group} justify="space-between" wrap="nowrap">
                        <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.group}
                        </Text>
                        <Text size="sm" c="teal">{h.value.toFixed(3)}</Text>
                      </Group>
                    ))}
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">No positive drivers detected.</Text>
                )}
              </Stack>

              <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                <Text fw={700} size="sm">Top 5 Harmful</Text>
                {harmful.length ? (
                  <Stack gap={4}>
                    {harmful.map((h) => (
                      <Group key={h.group} justify="space-between" wrap="nowrap">
                        <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.group}
                        </Text>
                        <Text size="sm" c="red">{h.value.toFixed(3)}</Text>
                      </Group>
                    ))}
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">No negative drivers detected.</Text>
                )}
              </Stack>
            </Group>

            <Divider my="sm" />

            <Group gap="sm">
              <Button variant="default" onClick={() => setShowAll((s) => !s)}>
                {showAll ? 'Hide all features' : 'Show all features'}
              </Button>
              <Button variant="light" onClick={downloadCsv}>Download SHAP CSV</Button>
            </Group>

            {showAll && (
              <ScrollArea h={260} mt="xs">
                <Table striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Feature</Table.Th>
                      <Table.Th style={{ width: 140 }}>Contribution</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sorted.map(({ group, value }) => (
                      <Table.Tr key={group}>
                        <Table.Td>{group}</Table.Td>
                        <Table.Td>
                          <Text c={value > 0 ? 'teal' : value < 0 ? 'red' : undefined}>
                            {value.toFixed(6)}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </>
        )}
      </Stack>
    </InputGroup>
  );
}
