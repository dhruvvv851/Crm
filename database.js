const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(__dirname, 'crm.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    city TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    pages_added INTEGER,
    total_pages INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    problem TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS technicians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    scope TEXT,
    finalization_place TEXT,
    installation_place TEXT,
    application TEXT,
    quotation_date TEXT,
    status TEXT DEFAULT 'Draft',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Adds a column to an existing table, only if it is not there yet
function addColumn(table, column, type) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

addColumn('customers', 'contact_person', 'TEXT');
addColumn('customers', 'contact_designation', 'TEXT');
addColumn('customers', 'address', 'TEXT');
addColumn('customers', 'phone2', 'TEXT');
addColumn('customers', 'gstin', 'TEXT');

addColumn('calls', 'model_id', 'INTEGER');
addColumn('calls', 'technician_id', 'INTEGER');
addColumn('calls', 'nature_of_visit', 'TEXT');
addColumn('calls', 'priority', 'TEXT');
addColumn('calls', 'call_date', 'TEXT');

addColumn('technicians', 'email', 'TEXT');
addColumn('technicians', 'address', 'TEXT');
addColumn('technicians', 'call_limit', 'INTEGER DEFAULT 10');

db.exec(`
  CREATE TABLE IF NOT EXISTS masters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    segment_id INTEGER,
    technician_id INTEGER,
    name TEXT NOT NULL,
    email TEXT,
    contact_person TEXT,
    contact_designation TEXT,
    phone TEXT,
    phone2 TEXT,
    address TEXT,
    city_id INTEGER,
    area_id INTEGER,
    pincode TEXT,
    state TEXT,
    gst_no TEXT,
    pan_no TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    technician_id INTEGER,
    equipment_id INTEGER,
    model_id INTEGER,
    part_no TEXT,
    serial_no TEXT,
    mfg_year TEXT,
    compre_pressure TEXT,
    commission_date TEXT,
    pressure_setting TEXT,
    service_interval INTEGER,
    pdf_file TEXT,
    pdf_name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commission_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    stored TEXT NOT NULL,
    name TEXT NOT NULL,
    size INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  INSERT INTO attachments (commission_id, kind, stored, name, size)
  SELECT id, 'other', pdf_file, COALESCE(NULLIF(pdf_name, ''), pdf_file), NULL
  FROM commissions
  WHERE COALESCE(pdf_file, '') != '';

  UPDATE commissions SET pdf_file = '' WHERE COALESCE(pdf_file, '') != '';
`);
addColumn('calls', 'account_id', 'INTEGER');
addColumn('calls', 'commission_id', 'INTEGER');
addColumn('calls', 'call_no', 'TEXT');

db.exec(`
  CREATE TABLE IF NOT EXISTS call_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    technician_id INTEGER,
    check_in TEXT,
    check_out TEXT,
    total_minutes INTEGER,
    running_hours INTEGER,
    load_hours INTEGER,
    contact_person TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

addColumn('call_steps', 'reason', 'TEXT');
addColumn('call_steps', 'from_technician_id', 'INTEGER');
addColumn('call_steps', 'check_in_lat', 'REAL');
addColumn('call_steps', 'check_in_lng', 'REAL');
addColumn('call_steps', 'check_out_lat', 'REAL');
addColumn('call_steps', 'check_out_lng', 'REAL');

db.exec("UPDATE call_steps SET status = 'Swiped' WHERE status = 'Reassigned'");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    technician_id INTEGER,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

addColumn('users', 'permissions', 'TEXT');
addColumn('users', 'last_login', 'TEXT');

module.exports = db;