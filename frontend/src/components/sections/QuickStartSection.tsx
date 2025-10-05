'use client';

import Link from 'next/link';
import React, { useCallback } from 'react';
import { Container, Stack, Title, Text, Grid, Card, Button, Group, Divider } from '@mantine/core';
import Footer from '@/components/Footer';
import { REQUIRED_HEADERS } from '@/lib/csvColumns';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { putCsv } from '@/lib/csvStore';

type Props = {
  onBrowseSamples?: () => void;
  onClassify?: () => void;
  onTrySingle?: () => void;
  onDownloadTemplate?: () => void;
};

export default function QuickStartSection({
  onBrowseSamples,
  onClassify,
  onTrySingle,
  onDownloadTemplate,
}: Props) {
  const router = useRouter();

  const downloadTemplateCSV = useCallback(() => {
    const csv = REQUIRED_HEADERS.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleUpload = useCallback(async () => {
    try {
      let file: File | null = null;

      if ('showOpenFilePicker' in window) {
        // @ts-expect-error: guarded at runtime
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [{ description: 'CSV files', accept: { 'text/csv': ['.csv'] } }],
          excludeAcceptAllOption: true,
        });
        file = await handle.getFile();
      } else {
        // Fallback for browsers without File System Access API
        file = await new Promise<File | null>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.csv,text/csv';
          input.onchange = () => resolve(input.files?.[0] ?? null);
          input.click();
        });
      }

      if (!file) return;

      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: false,
      });

      const headers = (parsed.meta.fields ?? []).map((h) => String(h ?? ''));
      const rows = (parsed.data ?? []).map((r) => {
        const rec: Record<string, string> = {};
        headers.forEach((h) => (rec[h] = r[h] != null ? String(r[h]) : ''));
        return rec;
      });

      const id = putCsv({ name: file.name, size: file.size, headers, rows });
      router.push(`/data?id=${encodeURIComponent(id)}`);
    } catch (e) {
      console.error('CSV open failed', e);
    }
  }, [router]);

  return (
    <Container
      size="lg"
      py="xl"
      id="quick-start"
      style={{
        height: '100svh',
        display: 'flex',
        alignItems: 'center',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
    >
      <Stack gap="lg" style={{ width: '100%' }}>
        <Title order={2}>Let&apos;s get started!</Title>
        <Text c="dimmed">Pick an action to jump in. You can switch paths anytime — nothing is locked in.</Text>

        <Grid gutter="lg" align="stretch">
          {/* Try a Single Classification */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder padding="lg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
                <Title order={4}>🧫 Try a Single Classification</Title>
                <Text c="dimmed">
                  For users who want to manually input one object or test AI behavior interactively.
                </Text>
                <div style={{ marginTop: 'auto' }}>
                  <Group>
                    {onTrySingle ? (
                      <Button color="teal" onClick={onTrySingle}>🧫 Try Single Classification</Button>
                    ) : (
                      <Button color="teal" component={Link} href="/classification">🧫 Try Single Classification</Button>
                    )}
                  </Group>
                </div>
              </Stack>
            </Card>
          </Grid.Col>

          {/* Upload My Data */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder padding="lg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
                <Title order={4}>🔬 Running Your Own Classification</Title>
                <Text c="dimmed">
                  Upload observations to get full AI analysis and confidence scoring.
                </Text>
                <div style={{ marginTop: 'auto' }}>
                  <Group>
                    {onClassify ? (
                      <Button color="teal" onClick={onClassify}>🧪 Upload My Data</Button>
                    ) : (
                      <Button color="teal" onClick={handleUpload}>🧪 Upload My Data</Button>
                    )}
                    <Button
                      variant="default"
                      onClick={onDownloadTemplate ? onDownloadTemplate : downloadTemplateCSV}
                    >
                      ⬇ Download Template
                    </Button>
                  </Group>
                </div>
              </Stack>
            </Card>
          </Grid.Col>

          {/* Browse Sample Data */}
          <Grid.Col span={{ base: 12, md: 12 }}>
            <Card withBorder padding="lg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
                <Title order={4}>🧑‍🚀 Just Exploring / Learning</Title>
                <Text c="dimmed">
                  Browse real exoplanet detections and experiment safely without uploading anything.
                </Text>
                <div style={{ marginTop: 'auto' }}>
                  <Group>
                    {onBrowseSamples ? (
                      <Button onClick={onBrowseSamples}>📁 Browse Sample Data</Button>
                    ) : (
                      <Button component={Link} href="/samples">📁 Browse Sample Data</Button>
                    )}
                  </Group>
                </div>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        <Divider my="md" />
        <Footer snap={false} showCTAButtons={false} />
      </Stack>
    </Container>
  );
}