const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'spc_claims.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      planner_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('planner','supervisor','manager')),
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS terminals (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      claim_id TEXT UNIQUE NOT NULL,
      terminal_code TEXT NOT NULL,
      claim_date TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      week INTEGER NOT NULL,
      vessel_visit TEXT,
      vessel_name TEXT,
      description TEXT NOT NULL,
      sqdcpi TEXT,
      status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','In Progress','Resolved','Closed')),
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(terminal_code) REFERENCES terminals(code),
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS claim_photos (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      uploaded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(claim_id) REFERENCES claims(id),
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS claim_d2 (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL UNIQUE,
      shift_alert_by TEXT,
      alert_date TEXT,
      shift_d_day1 TEXT, shift_c_day1 TEXT, shift_b_day1 TEXT, shift_a_day1 TEXT,
      shift_d_day2 TEXT, shift_c_day2 TEXT, shift_b_day2 TEXT, shift_a_day2 TEXT,
      shift_d_day3 TEXT, shift_c_day3 TEXT, shift_b_day3 TEXT, shift_a_day3 TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(claim_id) REFERENCES claims(id)
    );

    CREATE TABLE IF NOT EXISTS claim_d3 (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL UNIQUE,
      due_date TEXT,
      investigation_status TEXT DEFAULT 'Not Started' CHECK(investigation_status IN ('Not Started','In Progress','Completed')),
      completion_date TEXT,
      planner_accountable TEXT,
      root_cause TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(claim_id) REFERENCES claims(id),
      FOREIGN KEY(planner_accountable) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS claim_d4 (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL UNIQUE,
      due_date TEXT,
      pca1_status TEXT DEFAULT 'Not Started',
      pca1_date TEXT,
      pca2_shift_d TEXT, pca2_shift_c TEXT, pca2_shift_b TEXT, pca2_shift_a TEXT,
      pca3_shift_d TEXT, pca3_shift_c TEXT, pca3_shift_b TEXT, pca3_shift_a TEXT,
      pca4_assigned_to TEXT,
      pca4_wi_status TEXT DEFAULT 'Not Started',
      pca4_completion_date TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(claim_id) REFERENCES claims(id)
    );

    CREATE TABLE IF NOT EXISTS claim_d5 (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL UNIQUE,
      due_date TEXT,
      process_confirmation_status TEXT DEFAULT 'Not Started',
      process_confirmation_date TEXT,
      effectiveness_verified INTEGER DEFAULT 0,
      resolution_status TEXT DEFAULT 'Open' CHECK(resolution_status IN ('Open','Verified','Closed')),
      verified_by TEXT,
      verified_at TEXT,
      notes TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(claim_id) REFERENCES claims(id),
      FOREIGN KEY(verified_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS claim_history (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      change_type TEXT NOT NULL,
      field_changed TEXT,
      old_value TEXT,
      new_value TEXT,
      notes TEXT,
      changed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(claim_id) REFERENCES claims(id),
      FOREIGN KEY(changed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS internal_deviations (
      id TEXT PRIMARY KEY,
      deviation_id TEXT UNIQUE NOT NULL,
      terminal_code TEXT NOT NULL,
      detection_date TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      week INTEGER NOT NULL,
      detecting_supervisor TEXT,
      accountable_supervisor TEXT,
      planner_accountable TEXT,
      vessel_name TEXT,
      vessel_visit TEXT,
      description TEXT NOT NULL,
      potential_impact TEXT,
      sqdcpi TEXT,
      phase_of_detection TEXT,
      immediate_action TEXT,
      investigation_results TEXT,
      status TEXT NOT NULL DEFAULT 'Open',
      escalated INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed terminals
  const terminalCount = db.prepare('SELECT COUNT(*) as c FROM terminals').get();
  if (terminalCount.c === 0) {
    const insertTerminal = db.prepare('INSERT OR IGNORE INTO terminals(code, name) VALUES (?,?)');
    const terminals = [
      ['SEGOT', 'Sines Terminal (SEGOT)'],
      ['JOAQJ', 'Jeddah Terminal (JOAQJ)'],
      ['MAMED', 'Mediterranean Terminal (MAMED)'],
      ['EGPSD', 'Port Said Terminal (EGPSD)'],
      ['BHBAH', 'Bahrain Terminal (BHBAH)'],
      ['MAPNM', 'Port of Namibe (MAPNM)'],
      ['OMSAL', 'Salalah Terminal (OMSAL)'],
      ['DKAAR', 'Dakar Terminal (DKAAR)'],
      ['ITVAD', 'Vado Terminal (ITVAD)'],
      ['CISPT', 'San Pedro Terminal (CISPT)'],
    ];
    terminals.forEach(([code, name]) => insertTerminal.run(code, name));
  }

  // Seed default manager account
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (userCount.c === 0) {
    const { v4: uuidv4 } = require('uuid');
    const hash = bcrypt.hashSync('Admin@2025', 10);
    db.prepare(`INSERT INTO users(id, planner_id, name, password_hash, role) VALUES (?,?,?,?,?)`)
      .run(uuidv4(), 'ADMIN', 'System Administrator', hash, 'manager');

    // Seed some sample users from the Excel
    const sampleUsers = [
      ['HBO068', 'Houda Boulaich', 'supervisor'],
      ['AAJ078', 'Abdessamad Ajana', 'supervisor'],
      ['MYE021', 'Mohamed Yassine El Kassimi', 'planner'],
      ['NLA129', 'N. Lahcen', 'planner'],
      ['OOU007', 'O. Ouali', 'planner'],
      ['YHM011', 'Y. Hmamou', 'planner'],
      ['AEZ016', 'A. Ez-zahraoui', 'planner'],
    ];
    sampleUsers.forEach(([pid, name, role]) => {
      db.prepare(`INSERT OR IGNORE INTO users(id, planner_id, name, password_hash, role) VALUES (?,?,?,?,?)`)
        .run(uuidv4(), pid, name, bcrypt.hashSync('Spc@2025!', 10), role);
    });
  }

  console.log('✅ Database initialized');
}

module.exports = { db, initDatabase };
