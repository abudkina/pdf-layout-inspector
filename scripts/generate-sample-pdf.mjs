/**
 * Генерация минимального валидного PDF для e2e-фикстур.
 * Запуск: npx tsx scripts/generate-sample-pdf.mjs
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, '../tests/fixtures/sample.pdf');

function obj(id, body) {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

const objects = [];
objects.push(obj(1, '<< /Type /Catalog /Pages 2 0 R >>'));
objects.push(obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
objects.push(
  obj(
    3,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  ),
);

const stream =
  'BT\n/F1 24 Tf\n72 720 Td\n(PDF Layout Inspector) Tj\n0 -36 Td\n/F1 12 Tf\n(Proverka verstki tekstovyh blokov) Tj\nET';
objects.push(
  obj(4, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`),
);
objects.push(
  obj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),
);

let pdf = '%PDF-1.4\n';
const offsets = [0];
for (const o of objects) {
  offsets.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += o;
}

const xrefStart = Buffer.byteLength(pdf, 'utf8');
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += '0000000000 65535 f \n';
for (let i = 1; i <= objects.length; i++) {
  pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
pdf += `startxref\n${xrefStart}\n%%EOF\n`;

writeFileSync(out, pdf);
console.info('Записан', out);
