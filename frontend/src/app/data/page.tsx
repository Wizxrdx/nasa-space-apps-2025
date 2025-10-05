'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Container, Title, Space, Group, Button, Center, Loader, Text, Tooltip, ActionIcon } from '@mantine/core'; // removed Box
import { IconHelpCircle } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCsv } from '../../lib/csvStore';
import CsvTable from '../../components/CsvTable';
import Papa from 'papaparse';
import ClassifyExoplanet from '../../components/ClassifyExoplanet';
import EvaluationTable from '../../components/EvaluationTable';
import RetrainModel from '../../components/RetrainModel';

const PAGE_SIZE = 30; // only render 30 rows at a time

type EvalMetrics = { precision: number; recall: number; 'f1-score': number; support: number };
type Evaluation = Record<string, EvalMetrics | number>;

// Rename the original component to a client inner component
function DataPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  // Prevent multiple navigations/loops on param changes
  const handledRef = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (handledRef.current) return;
        handledRef.current = true;

        const id = searchParams.get('id');
        if (id) {
          const csv = getCsv(id);
          if (!csv) {
            router.replace('/');
            return;
          }
          if (!active) return;
          // Keep original headers as-is (including empty names) so first column with empty header remains editable
          setHeaders(csv.headers);
          // load all rows; rendering is limited by PAGE_SIZE
          setRows(csv.rows);
          setName(csv.name);
          return;
        }

        // No valid source found; go back home
        router.replace('/');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [searchParams, router]);

  // Compute current page slice
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(rows.length, start + PAGE_SIZE);
  const pageRows = rows.slice(start, end);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    // If current page is out of new bounds, clamp
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  //

  // Edits are applied via this callback from CsvTable
  const handleEditCell = (absRowIndex: number, colIndex: number, header: string, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      const target = next[absRowIndex] ?? {};
      next[absRowIndex] = { ...target, [header]: value };
      return next;
    });
  };

  const handleDeleteRow = (absRowIndex: number) => {
    setRows((prev) => {
      const next = prev.slice(0, absRowIndex).concat(prev.slice(absRowIndex + 1));
      return next;
    });
    // If we deleted the last item of the page and page is now out of range, move back a page
    const remaining = rows.length - 1;
    const newTotalPages = Math.max(1, Math.ceil(remaining / PAGE_SIZE));
    if (page > newTotalPages) setPage(newTotalPages);
  };

  const handleAddRow = () => {
    const empty: Record<string, string> = {};
    headers.forEach((h) => (empty[h] = ''));
    setRows((prev) => [...prev, empty]);
    const newCount = rows.length + 1;
    const newTotalPages = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
    setPage(newTotalPages); // jump to last page where the new row will be visible
  };

  const insertRowAt = (absRowIndex: number) => {
    const empty: Record<string, string> = {};
    headers.forEach((h) => (empty[h] = ''));
    setRows((prev) => {
      const next = [...prev];
      next.splice(absRowIndex, 0, empty);
      return next;
    });
    const newCount = rows.length + 1;
    const newTotalPages = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
    // keep page the same unless the new row is beyond current end; if we inserted before current start, adjust page backward if needed
    if (page > newTotalPages) setPage(newTotalPages);
  };

  const handleInsertRowAbove = (absRowIndex: number) => insertRowAt(absRowIndex);
  const handleInsertRowBelow = (absRowIndex: number) => insertRowAt(absRowIndex + 1);

  const handleExportCsv = () => {
    try {
      const csvString = Papa.unparse({
        fields: headers,
        data: rows.map((r) => headers.map((h) => r[h] ?? '')),
      });
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (name?.trim() || 'data').replace(/[\\/:*?"<>|]/g, '_');
      a.href = url;
      a.download = `${safeName}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export CSV', e);
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="md">
        <Center mih={200}>
          <Loader />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" align="center">
        <Title order={3}>{name || 'CSV Editor'}</Title>
        <Group gap="sm" align="center">
          <Text size="sm" c="dimmed">
            Showing rows {rows.length === 0 ? 0 : start + 1}-{end} of {rows.length}
          </Text>

          {/* Tips icon sits to the left of Classify */}
          <Tooltip
            label={
              <div style={{ maxWidth: 320, lineHeight: 1.4 }}>
                <div><strong>Tips</strong></div>
                <div>• Click a cell to edit (numbers and decimals only).</div>
                <div>• Enter moves down; Tab/Shift+Tab moves right/left.</div>
                <div>• Right‑click a row for insert/delete actions.</div>
                <div>• Use pagination below to navigate rows.</div>
                <div>• Click the current page number to edit it, then press Enter to jump.</div>
              </div>
            }
            withArrow
            position="bottom"
          >
            <ActionIcon aria-label="Help" variant="light" radius="xl" size="lg">
              <IconHelpCircle size={20} />
            </ActionIcon>
          </Tooltip>

          <ClassifyExoplanet
            headers={headers}
            rows={rows}
            setHeaders={setHeaders}
            setRows={setRows}
            buttonVariant="filled"
            buttonSize="md"
            onEvaluation={setEvaluation}
          />

          <RetrainModel
            headers={headers}
            rows={rows}
            buttonVariant="filled"
            buttonSize="md"
            onEvaluation={setEvaluation}
          />

          <Button variant="light" onClick={() => router.push('/')}>Back</Button>
        </Group>
      </Group>

      <Space h="md" />

      {/* Evaluation summary before the CSV table */}
      <EvaluationTable evaluation={evaluation} onClear={() => setEvaluation(null)} />

      {/* CsvTable */}
      <CsvTable
        headers={headers}
        rows={pageRows}
        startRowIndex={start}
        onEditCell={handleEditCell}
        onDeleteRow={handleDeleteRow}
        onInsertRowAbove={handleInsertRowAbove}
        onInsertRowBelow={handleInsertRowBelow}
        height={"60vh"}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onAddRow={handleAddRow}
        onExportCsv={handleExportCsv}
      />
    </Container>
  );
}

// New default export: wrap in Suspense to satisfy Next.js requirement
export default function DataPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <DataPageInner />
    </Suspense>
  );
}