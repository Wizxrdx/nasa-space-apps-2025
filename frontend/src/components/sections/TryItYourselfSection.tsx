'use client';

import { useState } from 'react';
import { Container, Stack, Title, Text, Slider, Card, Group, Badge, Space } from '@mantine/core';

type Guess = { label: 'Likely Planet' | 'Uncertain' | 'Rejected'; color: string };

function getGuess(depthPct: number, periodDays: number): Guess {
  // Toy heuristic to build intuition (not the real model)
  const depthOk = depthPct >= 0.1 && depthPct <= 2.5;
  const periodOk = periodDays >= 1 && periodDays <= 100;
  if (depthOk && periodOk) return { label: 'Likely Planet', color: 'teal' };

  const depthPlausible = depthPct >= 0.02 && depthPct <= 5;
  const periodPlausible = periodDays >= 1 && periodDays <= 300;
  if (depthPlausible && periodPlausible) return { label: 'Uncertain', color: 'yellow' };

  return { label: 'Rejected', color: 'red' };
}

export default function TryItYourselfSection() {
  const [depth, setDepth] = useState<number>(0.2);   // percent
  const [period, setPeriod] = useState<number>(10);  // days
  const guess = getGuess(depth, period);

  return (
    <Container
      size="lg"
      py="xl"
      id="try"
      style={{
        height: '100svh',
        display: 'flex',
        alignItems: 'center',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
    >
      <Stack gap="md" style={{ width: '100%' }}>
        <Title order={2}>Try a Mini Simulation</Title>
        <Text c="dimmed">Just a toy classifier to build intuition — not the full model yet.</Text>

        <Card withBorder padding="lg">
          <Stack gap="md">
            <div>
              <Text size="sm" fw={600}>Transit Depth (%)</Text>
              <Slider
                value={depth}
                onChange={setDepth}
                min={0}
                max={5}
                step={0.05}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 0.1, label: '0.1%' },
                  { value: 1, label: '1%' },
                  { value: 2.5, label: '2.5%' },
                  { value: 5, label: '5%' },
                ]}
                label={(v) => `${v.toFixed(2)}%`}
              />
            </div>

            <div>
              <Text size="sm" fw={600}>Repetition Period (Days)</Text>
              <Slider
                value={period}
                onChange={setPeriod}
                min={1}
                max={300}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 30, label: '30' },
                  { value: 100, label: '100' },
                  { value: 200, label: '200' },
                  { value: 300, label: '300' },
                ]}
                label={(v) => `${v}d`}
              />
            </div>
          </Stack>
        </Card>

        <Card withBorder padding="lg">
          <Title order={5}>Output</Title>
          <Space h="xs" />
          <Group align="center" gap="sm" wrap="nowrap">
            <Text>The AI would consider this:</Text>
            <Badge color={guess.color} size="lg" variant="light">{guess.label}</Badge>
          </Group>
          <Text c="dimmed" size="sm" mt="xs">
            depth ≈ {depth.toFixed(2)}%, period ≈ {period} days
          </Text>
        </Card>
      </Stack>
    </Container>
  );
}