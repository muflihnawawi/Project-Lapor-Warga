-- Skema database LaporWarga (MySQL / MariaDB XAMPP)
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('citizen','officer','admin') NOT NULL DEFAULT 'citizen',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  deleted_at DATETIME NULL,
  INDEX idx_users_role (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_sequences (
  date_key CHAR(8) NOT NULL PRIMARY KEY,
  last_value INT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reports (
  id CHAR(36) NOT NULL PRIMARY KEY,
  report_number VARCHAR(30) NOT NULL UNIQUE,
  user_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  address VARCHAR(255) NOT NULL,
  region VARCHAR(100) NULL,
  status ENUM('submitted','under_review','verified','in_progress','resolved','rejected') NOT NULL DEFAULT 'submitted',
  visibility ENUM('private','public') NOT NULL DEFAULT 'private',
  rejection_reason TEXT NULL,
  assigned_officer_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME NOT NULL,
  resolved_at DATETIME NULL,
  deleted_at DATETIME NULL,
  INDEX idx_reports_user (user_id),
  INDEX idx_reports_officer (assigned_officer_id),
  INDEX idx_reports_status (status),
  INDEX idx_reports_visibility (visibility),
  CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_reports_cat FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_reports_officer FOREIGN KEY (assigned_officer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS status_histories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  report_id CHAR(36) NOT NULL,
  from_status VARCHAR(20) NULL,
  to_status VARCHAR(20) NOT NULL,
  notes TEXT NULL,
  reason TEXT NULL,
  changed_by CHAR(36) NOT NULL,
  changed_at DATETIME(3) NOT NULL,
  INDEX idx_sh_report (report_id),
  CONSTRAINT fk_sh_report FOREIGN KEY (report_id) REFERENCES reports(id),
  CONSTRAINT fk_sh_user FOREIGN KEY (changed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_photos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  report_id CHAR(36) NOT NULL,
  status_history_id CHAR(36) NULL,
  type ENUM('evidence','resolution') NOT NULL DEFAULT 'evidence',
  url VARCHAR(255) NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  deleted_at DATETIME NULL,
  INDEX idx_photos_report (report_id),
  CONSTRAINT fk_photos_report FOREIGN KEY (report_id) REFERENCES reports(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assignments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  report_id CHAR(36) NOT NULL,
  officer_id CHAR(36) NOT NULL,
  assigned_by CHAR(36) NOT NULL,
  notes TEXT NULL,
  reason TEXT NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 1,
  assigned_at DATETIME(3) NOT NULL,
  INDEX idx_assign_report (report_id),
  CONSTRAINT fk_assign_report FOREIGN KEY (report_id) REFERENCES reports(id),
  CONSTRAINT fk_assign_officer FOREIGN KEY (officer_id) REFERENCES users(id),
  CONSTRAINT fk_assign_by FOREIGN KEY (assigned_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  report_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  body VARCHAR(1000) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME NULL,
  INDEX idx_comments_report (report_id),
  CONSTRAINT fk_comments_report FOREIGN KEY (report_id) REFERENCES reports(id),
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  report_id CHAR(36) NULL,
  report_number VARCHAR(30) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_notif_user (user_id, is_read),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  user_id CHAR(36) NOT NULL,
  idem_key VARCHAR(128) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  report_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, idem_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  type ENUM('info','perbaikan','kegiatan','gangguan') NOT NULL DEFAULT 'info',
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  expires_at DATE NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_ann_pub (is_published, created_at),
  CONSTRAINT fk_ann_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  actor_id CHAR(36) NOT NULL,
  action VARCHAR(60) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id CHAR(36) NULL,
  metadata TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
