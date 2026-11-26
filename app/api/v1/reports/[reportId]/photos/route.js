import { handle, ok, readForm, Errors } from '@/lib/server/http';
import { query, queryOne, transaction } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { getFiles, readPhotos, savePhotos, removeFiles, MAX_FILES } from '@/lib/server/upload';
import { findAccessibleReport, serializePhoto } from '@/lib/server/reports';

export const POST = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const r = await findAccessibleReport(user, params.reportId);
  if (user.role !== 'citizen') throw Errors.forbiddenRole('Hanya pemilik laporan yang dapat menambah foto');
  if (r.status !== 'submitted') throw Errors.conflict('REPORT_NOT_EDITABLE', 'Laporan tidak lagi berstatus submitted');

  const form = await readForm(req);
  const files = getFiles(form);
  const { n } = await queryOne(
    "SELECT COUNT(*) AS n FROM report_photos WHERE report_id = ? AND type = 'evidence' AND deleted_at IS NULL", [r.id]
  );
  if (n + files.length > MAX_FILES) {
    throw Errors.validation({ photos: [`Total foto bukti maksimal ${MAX_FILES}. Saat ini sudah ada ${n} foto.`] });
  }
  const photos = await readPhotos(files, { min: 1 });
  const saved = await savePhotos(photos, r.id, 'evidence');
  const now = new Date();
  try {
    await transaction(async (conn) => {
      for (const s of saved) {
        await query('INSERT INTO report_photos (id, report_id, type, url, is_public, created_at) VALUES (?,?,?,?,0,?)', [s.id, r.id, 'evidence', s.url, now], conn);
      }
      await query('UPDATE reports SET updated_at = ? WHERE id = ?', [now, r.id], conn);
    });
  } catch (e) {
    await removeFiles(saved);
    throw e;
  }
  const rows = await query('SELECT * FROM report_photos WHERE id IN (?)', [saved.map((s) => s.id)]);
  return ok(rows.map(serializePhoto), 'Foto berhasil ditambahkan', 201);
});
