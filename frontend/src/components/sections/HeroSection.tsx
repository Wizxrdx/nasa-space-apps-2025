'use client';

import { Container, Stack, Title, Text, Button, Group } from '@mantine/core';

export default function HeroSection({
  onLearnClick,
  onStartClick,
}: {
  onLearnClick: () => void;
  onStartClick: () => void;
}) {
  return (
    <Container
      size="lg"
      py="xl"
      id="hero"
      style={{
        height: '100svh',
        display: 'flex',
        alignItems: 'center',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
    >
      <Stack gap="md" style={{ width: '100%' }}>
        <Title order={1}>HERMES  — Heuristic Exoplanet Recognition and Model Evaluation System</Title>
        <Text size="lg" c="dimmed" maw={760}>
          Built on NASA&apos;s Kepler and TESS mission data, this tool analyzes over 100 measured parameters per object to
          determine if a signal is a confirmed planet, candidate, or false positive.
        </Text>
        <Group gap="sm">
          {/* Primary now scrolls to Quick Start */}
          <Button size="md" onClick={onStartClick}>
            Start Classifying
          </Button>
          <Button variant="light" size="md" onClick={onLearnClick}>
            How Does It Work?
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}