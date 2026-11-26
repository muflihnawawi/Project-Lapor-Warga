import { query, uuid } from './db';

/** Simpan notifikasi dalam aplikasi. */
export async function notify(conn, userId, type, title, message, report) {
  await query(
    'INSERT INTO notifications (id, user_id, type, title, message, report_id, report_number, is_read, created_at) VALUES (?,?,?,?,?,?,?,0,?)',
    [uuid(), userId, type, title, message, report?.id ?? null, report?.report_number ?? null, new Date()],
    conn
  );
}

/** Catat aktivitas penting ke audit log. */
export async function audit(conn, actorId, action, entityType, entityId, metadata, ip) {
  await query(
    'INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, ip_address, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [uuid(), actorId, action, entityType, entityId ?? null, metadata ? JSON.stringify(metadata) : null, ip ?? null, new Date()],
    conn
  );
}
