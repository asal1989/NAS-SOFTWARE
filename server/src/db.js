const path = require('path');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, '..', 'data', 'nas.sqlite');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user'
    allowed_paths TEXT NOT NULL DEFAULT '[]', -- JSON array of folder paths relative to STORAGE_ROOT
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function seedAdmin() {
  const existing = db.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (existing.c === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      'INSERT INTO users (username, password_hash, role, allowed_paths) VALUES (?, ?, ?, ?)'
    ).run('admin', hash, 'admin', '["/"]');
    console.log('Seeded default admin user -> username: admin  password: admin123 (change this immediately)');
  }
}

seedAdmin();

module.exports = db;
