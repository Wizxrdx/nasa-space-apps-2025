'use client';

import Link from 'next/link';
import { Container, Stack, Title, Text, Group, Button, Divider, Box } from '@mantine/core';

type Props = {
  id?: string;
  snap?: boolean; // full-height snap section when true
  sampleHref?: string;
  classifyHref?: string;
  githubHref?: string;
  privacyHref?: string;
  termsHref?: string;
  showCTAButtons?: boolean;
  showLinks?: boolean;
};

export default function Footer({
  id = 'footer',
  snap = false,
  sampleHref = '/samples',
  classifyHref = '/classify',
  githubHref = 'https://github.com/Wizxrdx',
  showCTAButtons = true,
  showLinks = true,
}: Props) {
  return (
    <Container
      size="lg"
      py="xl"
      id={id}
      style={{
        ...(snap
          ? {
              height: '100svh',
              display: 'flex',
              alignItems: 'center',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
            }
          : { paddingTop: '48px', paddingBottom: '48px' }),
      }}
    >
      <Stack gap="lg" style={{ width: '100%' }}>
        {showCTAButtons && (
          <Group gap="sm">
            <Button component={Link} href={sampleHref}>📁 Browse Sample Data</Button>
            <Button component={Link} href={classifyHref} color="teal">🧪 Classify My Data</Button>
          </Group>
        )}

        <Divider my="md" />

        {showLinks && (
          <Box>
            <Group gap="md">
              <Link href={githubHref} target="_blank">GitHub</Link>
            </Group>
            <Text c="dimmed" size="sm" mt="sm">
              Built for NASA Space Apps Challenge 2025. Uses public data from Kepler and TESS missions.
            </Text>
          </Box>
        )}
      </Stack>
    </Container>
  );
}