'use client';

import { Card, Title, Text, Box, Tooltip, Badge } from '@mantine/core';

export default function LightCurveVisualizer() {
  return (
    <Card withBorder padding="lg">
      <Title order={4}>Light Curve Visualizer</Title>
      <Text c="dimmed" mt="xs">
        Small animated plot showing a brightness dip. Hover the markers to reveal: Transit Depth, Duration, Repetition Interval.
      </Text>

      <Box mt="md" style={{ position: 'relative', height: 180, width: '100%' }}>
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 6,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0 / 100% 36px no-repeat, linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0 / 48px 100% no-repeat',
          }}
        />
        <svg width="100%" height="100%" viewBox="0 0 480 180" preserveAspectRatio="none" style={{ display: 'block' }}>
          <line x1="0" y1="150" x2="480" y2="150" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
          <line x1="40" y1="0" x2="40" y2="180" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
          <path
            d="M 40 60 L 160 60 C 190 60, 210 105, 240 105 C 270 105, 290 60, 320 60 L 440 60"
            fill="none"
            stroke="var(--mantine-color-blue-6)"
            strokeWidth="3"
          >
            <animate attributeName="stroke-dasharray" from="0, 1000" to="1000, 0" dur="2s" repeatCount="indefinite" />
          </path>
          <line x1="40" y1="60" x2="440" y2="60" stroke="rgba(0,0,0,0.25)" strokeDasharray="4 6" />
        </svg>

        <Tooltip label="Transit Depth: Brightness drop magnitude during transit" withArrow>
          <Badge variant="filled" color="blue" style={{ position: 'absolute', left: '47%', top: 88, transform: 'translate(-50%, -50%)', cursor: 'default' }}>
            Transit Depth
          </Badge>
        </Tooltip>
        <Tooltip label="Duration: Time from ingress to egress (width of the dip)" withArrow>
          <Badge variant="light" color="blue" style={{ position: 'absolute', left: '58%', top: 130, transform: 'translate(-50%, -50%)', cursor: 'default' }}>
            Duration
          </Badge>
        </Tooltip>
        <Tooltip label="Repetition Interval: Time between successive transits (dip-to-dip)" withArrow>
          <Badge variant="light" color="grape" style={{ position: 'absolute', left: '82%', top: 40, transform: 'translate(-50%, -50%)', cursor: 'default' }}>
            Repetition Interval
          </Badge>
        </Tooltip>
      </Box>
    </Card>
  );
}