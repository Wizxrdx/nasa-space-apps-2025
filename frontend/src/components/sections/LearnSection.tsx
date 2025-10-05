'use client';

import { Container, Stack, Title, Text } from '@mantine/core';
import LightCurveVisualizer from '@/components/LightCurveVisualizer';

export default function LearnSection() {
  return (
    <Container
      size="lg"
      py="xl"
      id="learn"
      style={{
        height: '100svh',
        display: 'flex',
        alignItems: 'center',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
    >
      <Stack gap="md" style={{ width: '100%' }}>
        <Title order={2}>Learn the Basics — What Is a Transit?</Title>

        <LightCurveVisualizer />

        <Text c="dimmed">
          “When a planet passes in front of its star, it blocks some light. AI looks for this repeated dimming pattern.”
        </Text>
      </Stack>
    </Container>
  );
}