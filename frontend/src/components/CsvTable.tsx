'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Table, Button, Group, Box, TextInput } from '@mantine/core';

type Row = Record<string, string>;

export interface CsvTableProps {
  headers: string[];
  rows: Row[]; // current page slice
  startRowIndex?: number;
  onEditCell?: (absRowIndex: number, colIndex: number, header: string, value: string) => void;
  height?: string | number;
  onDeleteRow?: (absRowIndex: number) => void;
  onInsertRowAbove?: (absRowIndex: number) => void;
  onInsertRowBelow?: (absRowIndex: number) => void;
  // NEW: pagination UI (controlled by parent)
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  // NEW: top toolbar actions
  onAddRow?: () => void;
  onExportCsv?: () => void;
}

// Helpers to render compact pagination (copied locally)
function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}
function getPages(total: number, current: number, boundaryCount = 1, siblingCount = 1): Array<number | 'dots'> {
  if (!total || total <= 0) return [];
  const totalNumbers = boundaryCount * 2 + siblingCount * 2 + 3;
  if (total <= totalNumbers) return range(1, total);
  const startPages = range(1, boundaryCount);
  const endPages = range(total - boundaryCount + 1, total);
  const siblingsStart = Math.max(current - siblingCount, boundaryCount + 1);
  const siblingsEnd = Math.min(current + siblingCount, total - boundaryCount);
  const pages: Array<number | 'dots'> = [];
  pages.push(...startPages);
  if (siblingsStart > boundaryCount + 1) pages.push('dots');
  pages.push(...range(siblingsStart, siblingsEnd));
  if (siblingsEnd < total - boundaryCount) pages.push('dots');
  pages.push(...endPages);
  // dedup
  const dedup: Array<number | 'dots'> = [];
  let prev: number | 'dots' | null = null;
  for (const p of pages) {
    if (p === 'dots' && prev === 'dots') continue;
    if (typeof p === 'number' && typeof prev === 'number' && p === prev) continue;
    dedup.push(p);
    prev = p;
  }
  return dedup;
}

export default function CsvTable({
  headers,
  rows,
  startRowIndex = 0,
  onEditCell,
  height = '60vh',
  onDeleteRow,
  onInsertRowAbove,
  onInsertRowBelow,
  page,
  totalPages,
  onPageChange,
  onAddRow,
  onExportCsv,
}: CsvTableProps) {
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; absRow: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const CELL_MIN_HEIGHT = 34; // ensure consistent row height even for empty cells

  // Sanitize arbitrary string to numeric format: optional leading '-', digits, and a single '.'
  const sanitizeNumericInput = useCallback((val: string) => {
    // Keep only digits, '-' and '.'
    let s = val.replace(/[^0-9.-]/g, '');
    // Allow only one leading '-'
    const isNegative = s.startsWith('-');
    s = (isNegative ? '-' : '') + s.slice(isNegative ? 1 : 0).replace(/-/g, '');
    // Allow only one '.'
    const firstDot = s.indexOf('.');
    if (firstDot !== -1) {
      const before = s.slice(0, firstDot + 1);
      const after = s.slice(firstDot + 1).replace(/\./g, '');
      s = before + after;
    }
    return s;
  }, []);

  // Normalize edge-case partials on commit
  const finalizeNumeric = useCallback((val: string) => {
    const t = val.trim();
    if (t === '' || t === '-' || t === '.' || t === '-.') return '';
    return t;
  }, []);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // When page changes (startRowIndex), reset editing to prevent referencing old rows
  useEffect(() => {
    setEditing(null);
  }, [startRowIndex]);

  // Close context menu on Escape and on scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const startEdit = useCallback((rowIndex: number, colIndex: number) => {
    const h = headers[colIndex];
    if (typeof h === 'undefined') return; // allow empty string header
    const current = rows[rowIndex]?.[h] ?? '';
    setEditing({ row: rowIndex, col: colIndex });
    setEditValue(current);
  }, [headers, rows]);

  const commitEdit = useCallback((next?: { row: number; col: number }) => {
    if (!editing) return;
    const { row, col } = editing;
    const h = headers[col];
    if (typeof h === 'undefined') {
      setEditing(null);
      return;
    }
    const absRow = startRowIndex + row;
    const original = rows[row]?.[h] ?? '';
    if (editValue === original) {
      // No change by user; keep original (even if non-numeric)
      onEditCell?.(absRow, col, h, original);
    } else {
      const sanitized = sanitizeNumericInput(editValue);
      const finalized = finalizeNumeric(sanitized);
      onEditCell?.(absRow, col, h, finalized);
    }
    setEditing(null);
    if (next) {
      requestAnimationFrame(() => startEdit(next.row, next.col));
    }
  }, [editing, headers, rows, editValue, onEditCell, startRowIndex, startEdit, sanitizeNumericInput, finalizeNumeric]);

  const cancelEdit = () => setEditing(null);

  const moveRight = (row: number, col: number): { row: number; col: number } | null => {
    const nextCol = col + 1;
    if (nextCol < headers.length) return { row, col: nextCol };
    const nextRow = row + 1;
    if (nextRow < rows.length) return { row: nextRow, col: 0 };
    return null;
  };

  const moveLeft = (row: number, col: number): { row: number; col: number } | null => {
    const prevCol = col - 1;
    if (prevCol >= 0) return { row, col: prevCol };
    const prevRow = row - 1;
    if (prevRow >= 0) return { row: prevRow, col: headers.length - 1 };
    return null;
  };

  const moveDown = (row: number, col: number): { row: number; col: number } | null => {
    const nextRow = row + 1;
    if (nextRow < rows.length) return { row: nextRow, col };
    return null;
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!editing) return;
    const { row, col } = editing;
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const nxt = moveDown(row, col);
      if (nxt) commitEdit(nxt); else commitEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        const nxt = moveLeft(row, col);
        if (nxt) commitEdit(nxt); else commitEdit();
      } else {
        const nxt = moveRight(row, col);
        if (nxt) commitEdit(nxt); else commitEdit();
      }
    }
  };

  // Inline editable current page state (local to the component UI)
  const [editingPage, setEditingPage] = React.useState(false);
  const [pageEditValue, setPageEditValue] = React.useState('');

  const canPaginate = typeof page === 'number' && typeof totalPages === 'number' && !!onPageChange;

  return (
    <>
     {(onAddRow || onExportCsv) && (
       <Group justify="space-between" align="center" mb="xs">
         <Group gap="sm">
           {onAddRow && (
             <Button variant="default" onClick={onAddRow}>
               Add Row
             </Button>
           )}
           {onExportCsv && (
             <Button variant="outline" onClick={onExportCsv}>
               Export CSV
             </Button>
           )}
         </Group>
       </Group>
     )}
      <div
        ref={scrollRef}
        className="csvTableWrap" // NEW: force light bg & dark text
        style={{ maxHeight: typeof height === 'number' ? `${height}px` : height, overflow: 'auto', position: 'relative' }}
        onScroll={() => setMenu(null)}
        onClick={() => setMenu(null)}
      >
        <Table striped highlightOnHover withColumnBorders className="csvTable">{/* NEW class */}
          <Table.Thead>
            <Table.Tr>
              {headers.map((h, colIndex) => (
                <Table.Th key={colIndex}>{h}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r, i) => {
              const absRow = startRowIndex + i;
              const isActive = !!menu && menu.absRow === absRow;
              return (
              <Table.Tr
                key={absRow}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const x = e.clientX + 4;
                  const y = e.clientY + 4;
                  requestAnimationFrame(() => setMenu({ x, y, absRow }));
                }}
                style={isActive ? { background: 'var(--mantine-color-gray-1)' } : undefined}
              >
                {headers.map((h, colIndex) => {
                  const isEditing = !!editing && editing.row === i && editing.col === colIndex;
                  return (
                    <Table.Td
                      key={colIndex}
                      onClick={() => {
                        if (isEditing) return;
                        if (editing && (editing.row !== i || editing.col !== colIndex)) {
                          commitEdit({ row: i, col: colIndex });
                        } else {
                          startEdit(i, colIndex);
                        }
                      }}
                      style={{ cursor: 'text', padding: 0 }}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(sanitizeNumericInput(e.currentTarget.value))}
                          onBlur={() => commitEdit()}
                          onKeyDown={onInputKeyDown}
                          inputMode="decimal"
                          pattern="-?[0-9]*\.?[0-9]*"
                          style={{
                            width: '100%',
                            height: '100%',
                            minHeight: CELL_MIN_HEIGHT,
                            boxSizing: 'border-box',
                            padding: '6px 8px',
                            border: '1px solid var(--mantine-color-gray-4)',
                            outline: 'none',
                            font: 'inherit',
                            background: '#ffffff',  // CHANGED: light input bg
                            color: '#111827',       // CHANGED: dark text
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            padding: '6px 8px',
                            whiteSpace: 'pre-wrap',
                            minHeight: CELL_MIN_HEIGHT,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {r[h] ?? ''}
                        </div>
                      )}
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            );})}
          </Table.Tbody>
        </Table>

        {menu && (
          <div
            style={{
              position: 'fixed',
              top: Math.min(menu.y, (typeof window !== 'undefined' ? window.innerHeight : 0) - 150),
              left: Math.min(menu.x, (typeof window !== 'undefined' ? window.innerWidth : 0) - 180),
              background: '#ffffff',                // CHANGED
              color: '#111827',                     // CHANGED
              border: '1px solid var(--mantine-color-gray-4)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              borderRadius: 8,
              padding: 6,
              zIndex: 1000,
              minWidth: 160,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {onInsertRowAbove && (
              <Button
                variant="subtle"
                fullWidth
                onClick={() => {
                  onInsertRowAbove(menu.absRow);
                  setMenu(null);
                }}
              >
                Insert row above
              </Button>
            )}
            {onInsertRowBelow && (
              <Button
                variant="subtle"
                fullWidth
                onClick={() => {
                  onInsertRowBelow(menu.absRow);
                  setMenu(null);
                }}
              >
                Insert row below
              </Button>
            )}
            {onDeleteRow && (
              <Button
                variant="subtle"
                color="red"
                fullWidth
                onClick={() => {
                  onDeleteRow(menu.absRow);
                  setMenu(null);
                }}
              >
                Delete row
              </Button>
            )}
          </div>
        )}
      </div>

      {canPaginate && (
        <Group justify="center" mt="md" gap="xs" wrap="wrap">
          <Button
            size="xs"
            variant="default"
            onClick={() => onPageChange!(Math.max(1, (page as number) - 1))}
            disabled={(page as number) <= 1}
          >
            Prev
          </Button>
          {getPages(totalPages as number, page as number, 1, 1).map((it, idx) => {
            if (it === 'dots') {
              return (
                <Box key={`dots-${idx}`} px={8} py={4} c="dimmed">
                  …
                </Box>
              );
            }
            const n = it as number;
            const isActive = n === page;
            if (isActive) {
              return (
                <Box key={n}>
                  {editingPage ? (
                    <TextInput
                      size="xs"
                      value={pageEditValue}
                      onChange={(e) => setPageEditValue(e.currentTarget.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const v = parseInt(pageEditValue || '0', 10);
                          if (!isNaN(v)) {
                            const clamped = Math.min(Math.max(1, v), totalPages as number);
                            onPageChange!(clamped);
                          }
                          setEditingPage(false);
                        } else if (e.key === 'Escape') {
                          setEditingPage(false);
                        }
                      }}
                      autoFocus
                      inputMode="numeric"
                      styles={{ input: { width: 52, textAlign: 'center' } }}
                      onBlur={() => setEditingPage(false)}
                      placeholder={`${page}`}
                    />
                  ) : (
                    <Button
                      size="xs"
                      variant="filled"
                      onClick={() => {
                        setEditingPage(true);
                        setPageEditValue(String(page));
                      }}
                    >
                      {page}
                    </Button>
                  )}
                </Box>
              );
            }
            return (
              <Button key={n} size="xs" variant="default" onClick={() => onPageChange!(n)}>
                {n}
              </Button>
            );
          })}
          <Button
            size="xs"
            variant="default"
            onClick={() => onPageChange!(Math.min(totalPages as number, (page as number) + 1))}
            disabled={(page as number) >= (totalPages as number)}
          >
            Next
          </Button>
        </Group>
      )}
    </>
  );
}
