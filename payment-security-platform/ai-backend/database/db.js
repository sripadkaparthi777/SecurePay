import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { hashPassword } from '../services/cryptoService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(config.dbPath);
    initSchema(dbInstance);
    seedDemoUsers(dbInstance);
  }
  return dbInstance;
}

export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      upi_id TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      upi_id TEXT UNIQUE NOT NULL,
      balance REAL NOT NULL DEFAULT 0.0,
      currency TEXT NOT NULL DEFAULT 'INR',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      sender_user_id TEXT NOT NULL,
      sender_upi TEXT NOT NULL,
      receiver_user_id TEXT NOT NULL,
      receiver_upi TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      type TEXT NOT NULL,
      idempotency_key TEXT,
      created_at TEXT NOT NULL,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL,
      transaction_id TEXT,
      timestamp TEXT NOT NULL,
      authenticated_user_id TEXT,
      endpoint TEXT NOT NULL,
      decision TEXT NOT NULL,
      reason TEXT NOT NULL,
      security_score REAL,
      findings TEXT,
      scan_id TEXT,
      policy_version TEXT
    );

    CREATE TABLE IF NOT EXISTS security_findings (
      id TEXT PRIMARY KEY,
      owasp_category TEXT,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      endpoint TEXT,
      method TEXT,
      description TEXT,
      evidence TEXT,
      recommendation TEXT,
      payment_critical INTEGER DEFAULT 0,
      scan_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS security_scans (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      status TEXT NOT NULL,
      scanner TEXT,
      scanner_version TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS security_incidents (
      incident_id TEXT PRIMARY KEY,
      attack_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      test_user_id TEXT,
      target_user_id TEXT,
      transaction_id TEXT,
      original_request TEXT,
      modified_request TEXT,
      expected_result TEXT,
      actual_result TEXT,
      security_decision TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const tableInfo = db.prepare("PRAGMA table_info(audit_logs)").all();
  const columns = tableInfo.map(c => c.name);

  const userTableInfo = db.prepare("PRAGMA table_info(users)").all();
  const userColumns = userTableInfo.map(c => c.name);

  if (!userColumns.includes('phone')) {
    db.exec("ALTER TABLE users ADD COLUMN phone TEXT UNIQUE;");
  }

  if (!columns.includes('security_score')) {
    db.exec("ALTER TABLE audit_logs ADD COLUMN security_score REAL;");
  }
  if (!columns.includes('findings')) {
    db.exec("ALTER TABLE audit_logs ADD COLUMN findings TEXT;");
  }
  if (!columns.includes('scan_id')) {
    db.exec("ALTER TABLE audit_logs ADD COLUMN scan_id TEXT;");
  }
  if (!columns.includes('policy_version')) {
    db.exec("ALTER TABLE audit_logs ADD COLUMN policy_version TEXT;");
  }
}

export function seedDemoUsers(db) {
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();

  if (existingUsers && existingUsers.count > 0) {
    return;
  }

  const demoUsers = [
    {
      id: 'usr_admin',
      email: 'admin@securepay.local',
      name: 'System Admin',
      role: 'ADMIN',
      password: 'Admin@123',
      upi: 'admin@upi',
      initialBalance: 100000.0,
    },
    {
      id: 'usr_reviewer',
      email: 'reviewer@securepay.local',
      name: 'Security Reviewer',
      role: 'SECURITY_REVIEWER',
      password: 'Reviewer@123',
      upi: 'reviewer@upi',
      initialBalance: 50000.0,
    },
    {
      id: 'usr_a',
      email: 'userA@securepay.local',
      name: 'User A',
      phone: '9876543210',
      role: 'USER',
      password: 'UserA@123',
      upi: 'userA@upi',
      initialBalance: 0.0,
    },
    {
      id: 'usr_b',
      email: 'userB@securepay.local',
      name: 'User B',
      phone: '8765432109',
      role: 'USER',
      password: 'UserB@123',
      upi: 'userB@upi',
      initialBalance: 0.0,
    },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, name, phone, role, password_hash, upi_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAccount = db.prepare(`
    INSERT INTO accounts (id, user_id, upi_id, balance, currency, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  for (const u of demoUsers) {
    const passwordHash = hashPassword(u.password);

    insertUser.run(
      u.id,
      u.email,
      u.name,
      u.phone || null,
      u.role,
      passwordHash,
      u.upi,
      now
    );

    insertAccount.run(
      `acc_${u.id}`,
      u.id,
      u.upi,
      u.initialBalance,
      'INR',
      now
    );
  }
}

export function resetDatabase(db) {
  db.exec(`
    DELETE FROM security_incidents;
    DELETE FROM audit_logs;
    DELETE FROM transactions;
    DELETE FROM accounts;
    DELETE FROM users;
  `);

  seedDemoUsers(db);
}
