import ExcelJS from 'exceljs';
import { handle, Errors } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { requireUser, toIso } from '@/lib/server/auth';
import { analyticsFilters } from '@/lib/server/analytics';
import { STATUS_LABEL } from '@/lib/server/reports';
import { buildTablePdf } from '@/lib/server/pdf';

const fmtDate = (d) => (d ? toIso(d).slice(0, 16).replace('T', ' ') : '-');

export const GET = handle(async (req) => {
  await requireUser(req, ['admin']);
  const sp = new URL(req.url).searchParams;
  const format = sp.get('format');
  if (!['pdf', 'xlsx'].includes(format)) throw Errors.validation({ format: ['Format harus pdf atau xlsx.'] });
  const { where, params } = analyticsFilters(sp);
  const rows = await query(
    `SELECT r.report_number, r.title, c.name AS category, r.status, r.address, r.region, r.created_at, r.resolved_at,
            o.name AS officer
     FROM reports r JOIN categories c ON c.id = r.category_id LEFT JOIN users o ON o.id = r.assigned_officer_id
     WHERE ${where} ORDER BY r.created_at DESC LIMIT 5000`,
    params
  );
  const stamp = toIso(new Date()).slice(0, 10);
  const filterInfo = [
    `Dicetak: ${fmtDate(new Date())} WIB`,
    `Periode: ${sp.get('date_from') || 'awal'} s.d. ${sp.get('date_to') || 'sekarang'}  |  Status: ${sp.get('status') ? STATUS_LABEL[sp.get('status')] : 'Semua'}  |  Total: ${rows.length} laporan`,
  ];

  if (format === 'xlsx') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Laporan');
    ws.columns = [
      { header: 'No. Laporan', key: 'report_number', width: 20 },
      { header: 'Judul', key: 'title', width: 40 },
      { header: 'Kategori', key: 'category', width: 20 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Alamat', key: 'address', width: 40 },
      { header: 'Wilayah', key: 'region', width: 18 },
      { header: 'Petugas', key: 'officer', width: 20 },
      { header: 'Dibuat', key: 'created_at', width: 18 },
      { header: 'Selesai', key: 'resolved_at', width: 18 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD8F3E3' } };
    for (const r of rows) {
      ws.addRow({
        ...r, status: STATUS_LABEL[r.status], region: r.region || '-', officer: r.officer || '-',
        created_at: fmtDate(r.created_at), resolved_at: fmtDate(r.resolved_at),
      });
    }
    const buf = await wb.xlsx.writeBuffer();
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="laporan-laporwarga-${stamp}.xlsx"`,
      },
    });
  }

  const pdf = buildTablePdf(
    'Rekap Laporan LaporWarga',
    filterInfo,
    [
      { header: 'No. Laporan', width: 100, chars: 20 },
      { header: 'Judul', width: 190, chars: 40 },
      { header: 'Kategori', width: 95, chars: 19 },
      { header: 'Status', width: 85, chars: 17 },
      { header: 'Wilayah', width: 85, chars: 17 },
      { header: 'Petugas', width: 90, chars: 18 },
      { header: 'Dibuat', width: 80, chars: 16 },
    ],
    rows.map((r) => [r.report_number, r.title, r.category, STATUS_LABEL[r.status], r.region || '-', r.officer || '-', fmtDate(r.created_at)])
  );
  return new Response(pdf, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="laporan-laporwarga-${stamp}.pdf"` },
  });
});
