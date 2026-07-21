import { readFileSync } from 'node:fs';

import { generatePdf } from '../src/mocks/exports';
import { LogExportRow } from '../src/mocks/types';

describe('PDF log export', () => {
  it('embeds Latin Extended glyphs for multilingual cabinet logs', async () => {
    const fontPath = require.resolve(
      '@expo-google-fonts/noto-sans/400Regular/NotoSans_400Regular.ttf',
    );
    const fontBytes = new Uint8Array(readFileSync(fontPath));
    const rows: LogExportRow[] = [
      {
        event_id: 'event-multilingual',
        occurred_at: '2026-07-21T08:00:00.000Z',
        operation: 'checkout',
        cabinet_id: 'cabinet-hq',
        key_id: 'key-front',
        key_name: 'Clé d’entrée',
        actor_id: 'user-operator',
        actor_name: 'François Müller',
        borrower_name: 'Łukasz Wiśniewski',
        borrower_contact: 'łukasz@example.com',
      },
    ];

    const pdf = await generatePdf(rows, fontBytes);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFDict, PDFDocument, PDFName } = require(
      'pdf-lib/cjs/index.js',
    ) as typeof import('pdf-lib/cjs/index.js');
    const parsed = await PDFDocument.load(pdf);
    const embedsTrueTypeFont = parsed.context
      .enumerateIndirectObjects()
      .some(([, object]) => object instanceof PDFDict && object.has(PDFName.of('FontFile2')));

    expect(new TextDecoder().decode(pdf.slice(0, 4))).toBe('%PDF');
    expect(embedsTrueTypeFont).toBe(true);
    expect(pdf.length).toBeGreaterThan(5_000);
  });
});
