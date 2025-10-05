'use client';

import React from 'react';
import { Card, Group, Title, Badge, Table, Button, Space } from '@mantine/core';

type EvalMetrics = { precision: number; recall: number; 'f1-score': number; support: number };
export type Evaluation = Record<string, EvalMetrics | number>;

export interface EvaluationTableProps {
  evaluation: Evaluation | null;
  onClear?: () => void;
}

export default function EvaluationTable({ evaluation, onClear }: EvaluationTableProps) {
  if (!evaluation) return null;

  const accuracy = typeof evaluation?.accuracy === 'number' ? (evaluation.accuracy as number) : undefined;
  const metricKeys = Object.keys(evaluation).filter((k) => k !== 'accuracy' && typeof (evaluation as any)[k] === 'object');
  const orderedMetricKeys = metricKeys
    .filter((k) => !['macro avg', 'weighted avg'].includes(k))
    .concat(['macro avg', 'weighted avg'].filter((k) => metricKeys.includes(k)));

  return (
    <>
      <Space h="md" />
      <Card withBorder>
        <Group justify="space-between" align="center" mb="xs">
          <Group gap="sm">
            <Title order={5}>Evaluation</Title>
            {typeof accuracy === 'number' && (
              <Badge color="teal" variant="light">accuracy: {(accuracy * 100).toFixed(2)}%</Badge>
            )}
          </Group>
          <Group gap="xs">
            {onClear && (
              <Button size="xs" variant="subtle" onClick={onClear}>
                Clear
              </Button>
            )}
          </Group>
        </Group>

        <Table striped withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Label</Table.Th>
              <Table.Th>Precision</Table.Th>
              <Table.Th>Recall</Table.Th>
              <Table.Th>F1-score</Table.Th>
              <Table.Th>Support</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {orderedMetricKeys.map((k) => {
              const m = (evaluation as any)[k] as EvalMetrics | undefined;
              if (!m) return null;
              return (
                <Table.Tr key={k}>
                  <Table.Td>{k}</Table.Td>
                  <Table.Td>{typeof m.precision === 'number' ? m.precision.toFixed(3) : ''}</Table.Td>
                  <Table.Td>{typeof m.recall === 'number' ? m.recall.toFixed(3) : ''}</Table.Td>
                  <Table.Td>{typeof m['f1-score'] === 'number' ? m['f1-score'].toFixed(3) : ''}</Table.Td>
                  <Table.Td>{typeof m.support === 'number' ? m.support : ''}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Card>
    </>
  );
}