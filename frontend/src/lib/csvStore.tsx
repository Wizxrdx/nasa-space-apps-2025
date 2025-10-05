export type CsvRow = Record<string, string>;
export type CsvData = { name: string; size: number; headers: string[]; rows: CsvRow[] };

const store = new Map<string, CsvData>();

export function putCsv(data: CsvData): string {
  const id = `csv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  store.set(id, data);
  return id;
}

export function getCsv(id: string): CsvData | undefined {
  return store.get(id);
}