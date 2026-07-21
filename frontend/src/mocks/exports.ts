import { Platform } from 'react-native';

import type { PDFFont } from 'pdf-lib/cjs/index.js';

import { MockAppError } from './errors';
import { ExportArtifact, ExportFormat, LogExportRow } from './types';

const exportColumns = [
  'event_id',
  'occurred_at',
  'operation',
  'cabinet_id',
  'key_id',
  'key_name',
  'actor_id',
  'actor_name',
  'borrower_name',
  'borrower_contact',
] as const satisfies readonly (keyof LogExportRow)[];

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function safeSpreadsheetValue(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string): string {
  const safe = safeSpreadsheetValue(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function generateCsv(rows: LogExportRow[]): Uint8Array {
  const lines = [
    exportColumns.join(','),
    ...rows.map((row) => exportColumns.map((column) => csvCell(String(row[column]))).join(',')),
  ];
  return utf8(`\uFEFF${lines.join('\r\n')}`);
}

export async function generateXlsx(rows: LogExportRow[]): Promise<Uint8Array> {
  // Keep the sizeable writer out of the startup execution path.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx');
  const matrix = [
    [...exportColumns],
    ...rows.map((row) => exportColumns.map((column) => safeSpreadsheetValue(String(row[column])))),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(matrix);
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  sheet['!cols'] = exportColumns.map((column) => ({
    wch: Math.min(
      42,
      Math.max(
        column.length + 2,
        ...rows.map((row) => String(row[column]).length + 2),
      ),
    ),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'cabinet_log');
  const output = XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true });
  return output instanceof Uint8Array ? output : new Uint8Array(output as ArrayBuffer);
}

function fallbackPdfText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');
}

function trimToWidth(value: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(value, size) <= maxWidth) {
    return value;
  }
  let result = value;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}...`, size) > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}...`;
}

export async function generatePdf(
  rows: LogExportRow[],
  fontBytes?: Uint8Array,
): Promise<Uint8Array> {
  // Metro selects pdf-lib's ESM build by default, whose tslib interop crashes on
  // Expo Web. The explicit CJS entry is loaded only when PDF export is requested.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFDocument, StandardFonts, rgb } = require(
    'pdf-lib/cjs/index.js'
  ) as typeof import('pdf-lib/cjs/index.js');
  const document = await PDFDocument.create();
  let font: PDFFont;
  let supportsUnicode = false;
  if (fontBytes) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fontkitModule = require('@pdf-lib/fontkit') as typeof import('@pdf-lib/fontkit');
    document.registerFontkit(fontkitModule);
    font = await document.embedFont(fontBytes, { subset: true });
    supportsUnicode = true;
  } else {
    font = await document.embedFont(StandardFonts.Helvetica);
  }

  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 28;
  const rowHeight = 16;
  const fontSize = 7;
  const selectedColumns = [
    'occurred_at',
    'operation',
    'key_name',
    'actor_name',
    'borrower_name',
    'borrower_contact',
  ] as const satisfies readonly (keyof LogExportRow)[];
  const widths = [132, 92, 135, 120, 120, 155];
  let page = document.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawRow = (values: string[], header = false) => {
    let x = margin;
    for (let index = 0; index < values.length; index += 1) {
      const raw = supportsUnicode ? values[index] : fallbackPdfText(values[index]);
      page.drawRectangle({
        x,
        y: y - rowHeight,
        width: widths[index],
        height: rowHeight,
        borderWidth: 0.4,
        borderColor: rgb(0.78, 0.82, 0.88),
        color: header ? rgb(0.06, 0.15, 0.28) : undefined,
      });
      page.drawText(trimToWidth(raw, font, fontSize, widths[index] - 6), {
        x: x + 3,
        y: y - 11,
        size: fontSize,
        font,
        color: header ? rgb(1, 1, 1) : rgb(0.08, 0.12, 0.2),
      });
      x += widths[index];
    }
    y -= rowHeight;
  };

  const drawHeader = () => drawRow([...selectedColumns], true);
  drawHeader();
  for (const row of rows) {
    if (y < margin + rowHeight) {
      page = document.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawHeader();
    }
    drawRow(selectedColumns.map((column) => String(row[column])));
  }

  return document.save();
}

/**
 * Load the bundled Latin Extended font used by interactive PDF exports.
 * The binary is resolved by Metro and read only when a PDF is requested, so
 * it does not increase the normal application startup path.
 */
export async function loadPdfFontBytes(): Promise<Uint8Array> {
  // Keep the asset helpers and the font out of the startup execution path.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Asset } = require('expo-asset') as typeof import('expo-asset');
  const fontModule = require(
    '@expo-google-fonts/noto-sans/400Regular/NotoSans_400Regular.ttf'
  ) as number;
  const asset = Asset.fromModule(fontModule);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new MockAppError('EXPORT_NOT_SUPPORTED');
  }

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new MockAppError('EXPORT_NOT_SUPPORTED');
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { File } = require('expo-file-system') as typeof import('expo-file-system');
  return new File(uri).bytes();
}

export async function generateExportArtifact(input: {
  cabinetId: string;
  format: ExportFormat;
  rows: LogExportRow[];
  generatedAt: string;
  fontBytes?: Uint8Array;
}): Promise<ExportArtifact> {
  const date = input.generatedAt.slice(0, 10);
  const basename = `uniclife-${input.cabinetId}-log-${date}`.replace(/[^a-zA-Z0-9._-]/g, '-');
  if (input.format === 'csv') {
    return {
      filename: `${basename}.csv`,
      mimeType: 'text/csv;charset=utf-8',
      bytes: generateCsv(input.rows),
    };
  }
  if (input.format === 'xlsx') {
    return {
      filename: `${basename}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      bytes: await generateXlsx(input.rows),
    };
  }
  if (input.format === 'pdf') {
    return {
      filename: `${basename}.pdf`,
      mimeType: 'application/pdf',
      bytes: await generatePdf(input.rows, input.fontBytes),
    };
  }
  throw new MockAppError('EXPORT_NOT_SUPPORTED');
}

export async function saveExportArtifact(artifact: ExportArtifact): Promise<string> {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      throw new MockAppError('EXPORT_NOT_SUPPORTED');
    }
    const buffer = artifact.bytes.slice().buffer as ArrayBuffer;
    const url = URL.createObjectURL(new Blob([buffer], { type: artifact.mimeType }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = artifact.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return artifact.filename;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sharing = require('expo-sharing') as typeof import('expo-sharing');
  const file = new File(Paths.cache, artifact.filename);
  file.create({ overwrite: true, intermediates: true });
  file.write(artifact.bytes);
  if (!(await Sharing.isAvailableAsync())) {
    throw new MockAppError('SHARING_NOT_AVAILABLE');
  }
  await Sharing.shareAsync(file.uri, { mimeType: artifact.mimeType });
  return file.uri;
}
