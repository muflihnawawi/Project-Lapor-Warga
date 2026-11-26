// Generator PDF minimal (font Helvetica bawaan, teks saja) tanpa dependensi tambahan.

const esc = (s) =>
  String(s ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const fit = (s, n) => {
  const t = String(s ?? '');
  return t.length > n ? `${t.slice(0, n - 1)}~` : t;
};

/**
 * @param {string} title
 * @param {string[]} subtitleLines
 * @param {{header: string, width: number, chars: number}[]} columns lebar dalam pt
 * @param {string[][]} rows
 */
export function buildTablePdf(title, subtitleLines, columns, rows) {
  const W = 842; // A4 landscape
  const H = 595;
  const margin = 36;
  const lineH = 16;
  const pages = [];
  let ops = [];
  let y = 0;

  const text = (x, yy, size, s, bold = false) =>
    ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${yy} Td (${esc(s)}) Tj ET`);

  const header = () => {
    y = H - margin;
    if (!pages.length) {
      text(margin, y - 4, 16, title, true);
      y -= 24;
      for (const s of subtitleLines) { text(margin, y, 9, s); y -= 13; }
      y -= 6;
    }
    ops.push(`0.92 0.96 0.94 rg ${margin} ${y - 5} ${W - margin * 2} ${lineH} re f 0 0 0 rg`);
    let x = margin + 4;
    for (const c of columns) { text(x, y, 9, c.header, true); x += c.width; }
    y -= lineH;
  };

  header();
  for (const row of rows) {
    if (y < margin + lineH) {
      pages.push(ops);
      ops = [];
      header();
    }
    let x = margin + 4;
    columns.forEach((c, i) => { text(x, y, 8, fit(row[i], c.chars)); x += c.width; });
    ops.push(`0.85 0.88 0.9 RG ${margin} ${y - 5} m ${W - margin} ${y - 5} l S 0 0 0 RG`);
    y -= lineH;
  }
  if (!rows.length) text(margin + 4, y, 9, 'Tidak ada data.');
  pages.push(ops);

  // Susun objek PDF.
  const objects = [];
  const add = (s) => { objects.push(s); return objects.length; };
  const catalogId = add(null);
  const pagesId = add(null);
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds = [];
  pages.forEach((p, i) => {
    const footer = `BT /F1 8 Tf ${W - margin - 60} 20 Td (Halaman ${i + 1} / ${pages.length}) Tj ET`;
    const stream = [...p, footer].join('\n');
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contentId} 0 R >>`));
  });
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}
