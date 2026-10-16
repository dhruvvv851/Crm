const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('./database');

const app = express();
app.use(express.json());
app.use(express.static('public'));

function count(sql) {
  return db.prepare(sql).get().n;
}

// ---------- Customers (Sales) ----------
app.get('/api/customers', (req, res) => {
  res.json(db.prepare('SELECT * FROM customers ORDER BY id DESC').all());
});

app.get('/api/customers/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Customer not found' });
  res.json(row);
});

app.post('/api/customers', (req, res) => {
  const { name, contact_person, contact_designation, address, phone, phone2, email, city, gstin } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  const result = db.prepare(`
    INSERT INTO customers
      (name, contact_person, contact_designation, address, phone, phone2, email, city, gstin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(),
    contact_person || '',
    contact_designation || '',
    address || '',
    phone || '',
    phone2 || '',
    email || '',
    city || '',
    gstin || ''
  );
  res.json({ ok: true, id: Number(result.lastInsertRowid) });
});

// ---------- Quotations ----------
app.get('/api/quotations', (req, res) => {
  res.json(db.prepare(`
    SELECT quotations.*, customers.name AS customer
    FROM quotations JOIN customers ON customers.id = quotations.customer_id
    ORDER BY quotations.id DESC
  `).all());
});

app.get('/api/customers/:id/quotations', (req, res) => {
  res.json(db.prepare(
    'SELECT * FROM quotations WHERE customer_id = ? ORDER BY id DESC'
  ).all(Number(req.params.id)));
});

app.post('/api/quotations', (req, res) => {
  const { customer_id, scope, finalization_place, installation_place, application, quotation_date } = req.body;
  const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(Number(customer_id));
  if (!customer) {
    return res.status(400).json({ error: 'Customer not found' });
  }
  if (!scope || !scope.trim()) {
    return res.status(400).json({ error: 'Please write the proposed scope of supply' });
  }
  const result = db.prepare(`
    INSERT INTO quotations
      (customer_id, scope, finalization_place, installation_place, application, quotation_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    customer.id,
    scope.trim(),
    finalization_place || '',
    installation_place || '',
    application || '',
    quotation_date || ''
  );
  res.json({ ok: true, id: Number(result.lastInsertRowid) });
});

// ---------- Models ----------
function readModel(body) {
  const name = (body.name || '').trim();
  if (!name) return { error: 'Model name is required' };
  return { name };
}

app.get('/api/models', (req, res) => {
  res.json(db.prepare('SELECT * FROM models ORDER BY name').all());
});

app.post('/api/models', (req, res) => {
  const m = readModel(req.body);
  if (m.error) return res.status(400).json({ error: m.error });
  const same = db.prepare('SELECT id FROM models WHERE LOWER(name) = LOWER(?)').get(m.name);
  if (same) return res.status(400).json({ error: 'This model already exists' });
  const result = db.prepare('INSERT INTO models (name) VALUES (?)').run(m.name);
  res.json({ ok: true, id: Number(result.lastInsertRowid) });
});

app.put('/api/models/:id', (req, res) => {
  const m = readModel(req.body);
  if (m.error) return res.status(400).json({ error: m.error });
  const id = Number(req.params.id);
  const same = db.prepare('SELECT id FROM models WHERE LOWER(name) = LOWER(?) AND id != ?').get(m.name, id);
  if (same) return res.status(400).json({ error: 'This model already exists' });
  const result = db.prepare('UPDATE models SET name = ? WHERE id = ?').run(m.name, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Model not found' });
  res.json({ ok: true });
});

// ---------- Technicians ----------
function readTechnician(body) {
  const name = (body.name || '').trim();
  const limit = body.call_limit === '' || body.call_limit == null ? 10 : Number(body.call_limit);
  if (!name) return { error: 'Technician name is required' };
  if (!Number.isInteger(limit) || limit < 0) return { error: 'Call limit must be a whole number' };
  return { values: [name, body.phone || '', body.email || '', body.address || '', limit] };
}

app.get('/api/technicians', (req, res) => {
  res.json(db.prepare('SELECT * FROM technicians ORDER BY name').all());
});

app.post('/api/technicians', (req, res) => {
  const t = readTechnician(req.body);
  if (t.error) return res.status(400).json({ error: t.error });
  const result = db.prepare(
    'INSERT INTO technicians (name, phone, email, address, call_limit) VALUES (?, ?, ?, ?, ?)'
  ).run(...t.values);
  res.json({ ok: true, id: Number(result.lastInsertRowid) });
});

app.put('/api/technicians/:id', (req, res) => {
  const t = readTechnician(req.body);
  if (t.error) return res.status(400).json({ error: t.error });
  const result = db.prepare(
    'UPDATE technicians SET name = ?, phone = ?, email = ?, address = ?, call_limit = ? WHERE id = ?'
  ).run(...t.values, Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Technician not found' });
  res.json({ ok: true });
});

// ---------- Dashboard ----------
app.get('/api/dashboard', (req, res) => {
  res.json({
    customers: count('SELECT COUNT(*) AS n FROM customers'),
    calls: count('SELECT COUNT(*) AS n FROM calls'),
    pending: count("SELECT COUNT(*) AS n FROM calls WHERE status = 'Pending'"),
    technicians: count('SELECT COUNT(*) AS n FROM technicians'),
    models: count('SELECT COUNT(*) AS n FROM models'),
    parts: count('SELECT COUNT(*) AS n FROM parts'),
    recentCalls: db.prepare(`
      SELECT calls.id, calls.created_at, customers.name AS customer
      FROM calls JOIN customers ON customers.id = calls.customer_id
      ORDER BY calls.id DESC LIMIT 5
    `).all(),
    technicianList: db.prepare('SELECT id, name FROM technicians ORDER BY name').all()
  });
});

// ---------- Calls ----------
app.get('/api/calls', (req, res) => {
  res.json(db.prepare(`
    SELECT calls.id, calls.problem, calls.status, calls.created_at, customers.name AS customer
    FROM calls JOIN customers ON customers.id = calls.customer_id
    ORDER BY calls.id DESC
  `).all());
});

app.post('/api/calls', (req, res) => {
  const { customer_id, model_id, technician_id, problem, nature_of_visit, priority, call_date } = req.body;

  const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(Number(customer_id));
  if (!customer) {
    return res.status(400).json({ error: 'Please select a company' });
  }
  if (!problem || !problem.trim()) {
    return res.status(400).json({ error: 'Please write the nature of the problem' });
  }

  const result = db.prepare(`
    INSERT INTO calls
      (customer_id, model_id, technician_id, problem, nature_of_visit, priority, call_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    customer.id,
    model_id ? Number(model_id) : null,
    technician_id ? Number(technician_id) : null,
    problem.trim(),
    nature_of_visit || '',
    priority || 'Low Priority',
    call_date || ''
  );
  res.json({ ok: true, id: Number(result.lastInsertRowid) });
});

// ---------- Masters: segment, city, area, equipment ----------
const MASTERS = {
  segment: { parent: null },
  city: { parent: null },
  area: { parent: 'city' },
  equipment: { parent: null }
};

function masterKind(req, res) {
  const kind = req.params.kind;
  if (!MASTERS[kind]) {
    res.status(404).json({ error: 'Unknown master' });
    return null;
  }
  return kind;
}

function readMaster(kind, body, id) {
  const name = (body.name || '').trim();
  if (!name) return { error: 'Name is required' };

  let parentId = null;
  if (MASTERS[kind].parent) {
    parentId = Number(body.parent_id) || 0;
    const parent = db.prepare('SELECT id FROM masters WHERE id = ? AND kind = ?').get(parentId, MASTERS[kind].parent);
    if (!parent) return { error: 'Please select a ' + MASTERS[kind].parent };
  }

  const same = db.prepare(
    'SELECT id FROM masters WHERE kind = ? AND LOWER(name) = LOWER(?) AND COALESCE(parent_id, 0) = ? AND id != ?'
  ).get(kind, name, parentId || 0, id || 0);
  if (same) return { error: 'This name already exists' };

  return { name, parentId };
}

app.get('/api/masters/:kind', (req, res) => {
  const kind = masterKind(req, res);
  if (!kind) return;
  res.json(db.prepare(`
    SELECT m.*, p.name AS parent_name
    FROM masters m LEFT JOIN masters p ON p.id = m.parent_id
    WHERE m.kind = ?
    ORDER BY m.name
  `).all(kind));
});

app.post('/api/masters/:kind', (req, res) => {
  const kind = masterKind(req, res);
  if (!kind) return;
  const m = readMaster(kind, req.body, 0);
  if (m.error) return res.status(400).json({ error: m.error });
  const result = db.prepare('INSERT INTO masters (kind, name, parent_id) VALUES (?, ?, ?)').run(kind, m.name, m.parentId);
  res.json({ ok: true, id: Number(result.lastInsertRowid) });
});

app.put('/api/masters/:kind/:id', (req, res) => {
  const kind = masterKind(req, res);
  if (!kind) return;
  const id = Number(req.params.id);
  const m = readMaster(kind, req.body, id);
  if (m.error) return res.status(400).json({ error: m.error });
  const result = db.prepare('UPDATE masters SET name = ?, parent_id = ? WHERE id = ? AND kind = ?').run(m.name, m.parentId, id, kind);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

app.delete('/api/masters/:kind/:id', (req, res) => {
  const kind = masterKind(req, res);
  if (!kind) return;
  const id = Number(req.params.id);
  const child = db.prepare('SELECT id FROM masters WHERE parent_id = ?').get(id);
  if (child) return res.status(400).json({ error: 'This entry is used by other entries. Delete those first.' });
  const used = db.prepare('SELECT id FROM accounts WHERE segment_id = ? OR city_id = ? OR area_id = ?').get(id, id, id);
  if (used) return res.status(400).json({ error: 'This entry is used by an account, so it cannot be deleted.' });
  const usedEquipment = db.prepare('SELECT id FROM commissions WHERE equipment_id = ?').get(id);
  if (usedEquipment) return res.status(400).json({ error: 'This entry is used in a Commission Report, so it cannot be deleted.' });
  const result = db.prepare('DELETE FROM masters WHERE id = ? AND kind = ?').run(id, kind);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// ---------- Accounts ----------
const ACCOUNT_FIELDS = [
  'segment_id', 'technician_id', 'name', 'email', 'contact_person', 'contact_designation',
  'phone', 'phone2', 'address', 'city_id', 'area_id', 'pincode', 'state', 'gst_no', 'pan_no'
];

function toId(v) {
  const n = Number(v);
  return v !== '' && v != null && Number.isInteger(n) ? n : null;
}

function toText(v) {
  return v == null ? '' : String(v).trim();
}

function readAccount(body, id) {
  const name = toText(body.name);
  if (!name) return { error: 'Account name is required' };

  const cityId = toId(body.city_id);
  const areaId = toId(body.area_id);
  if (areaId) {
    const area = db.prepare("SELECT parent_id FROM masters WHERE id = ? AND kind = 'area'").get(areaId);
    if (!area) return { error: 'Selected area was not found' };
    if (cityId && area.parent_id !== cityId) return { error: 'The area does not belong to the selected city' };
  }

  const same = db.prepare(
    'SELECT id FROM accounts WHERE LOWER(name) = LOWER(?) AND COALESCE(city_id, 0) = ? AND id != ?'
  ).get(name, cityId || 0, id || 0);
  if (same) return { error: 'This account already exists' };

  return {
    values: [
      toId(body.segment_id), toId(body.technician_id), name, toText(body.email),
      toText(body.contact_person), toText(body.contact_designation), toText(body.phone),
      toText(body.phone2), toText(body.address), cityId, areaId, toText(body.pincode),
      toText(body.state), toText(body.gst_no), toText(body.pan_no)
    ]
  };
}

app.get('/api/accounts', (req, res) => {
  res.json(db.prepare(`
    SELECT a.*, c.name AS city_name, ar.name AS area_name,
           s.name AS segment_name, t.name AS technician_name
    FROM accounts a
    LEFT JOIN masters c ON c.id = a.city_id
    LEFT JOIN masters ar ON ar.id = a.area_id
    LEFT JOIN masters s ON s.id = a.segment_id
    LEFT JOIN technicians t ON t.id = a.technician_id
    ORDER BY a.name
  `).all());
});

app.get('/api/accounts/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Account not found' });
  res.json(row);
});

app.post('/api/accounts', (req, res) => {
  const a = readAccount(req.body, 0);
  if (a.error) return res.status(400).json({ error: a.error });
  const result = db.prepare(
    `INSERT INTO accounts (${ACCOUNT_FIELDS.join(', ')}) VALUES (${ACCOUNT_FIELDS.map(() => '?').join(', ')})`
  ).run(...a.values);
  res.json({ ok: true, id: Number(result.lastInsertRowid) });
});

app.put('/api/accounts/:id', (req, res) => {
  const id = Number(req.params.id);
  const a = readAccount(req.body, id);
  if (a.error) return res.status(400).json({ error: a.error });
  const result = db.prepare(
    `UPDATE accounts SET ${ACCOUNT_FIELDS.map(f => f + ' = ?').join(', ')} WHERE id = ?`
  ).run(...a.values, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Account not found' });
  res.json({ ok: true });
});

app.delete('/api/accounts/:id', (req, res) => {
  const id = Number(req.params.id);
  const used = db.prepare('SELECT id FROM commissions WHERE account_id = ?').get(id);
  if (used) return res.status(400).json({ error: 'This account has machines in Commission Report, so it cannot be deleted.' });
  const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Account not found' });
  res.json({ ok: true });
});

// ---------- Commission Report ----------
const COMMISSION_DIR = path.join(__dirname, 'uploads', 'commission');
fs.mkdirSync(COMMISSION_DIR, { recursive: true });

const MAX_FILE = 10 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE, files: 30 } });

const KINDS = {
  bom: { field: 'bom', ext: ['pdf', 'xls', 'xlsx', 'csv'] },
  image: { field: 'images', ext: ['jpg', 'jpeg', 'png', 'webp'] },
  other: { field: 'other', ext: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'jpg', 'jpeg', 'png'] }
};

const SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46],
  jpg: [0xff, 0xd8, 0xff],
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  xlsx: [0x50, 0x4b, 0x03, 0x04],
  docx: [0x50, 0x4b, 0x03, 0x04],
  xls: [0xd0, 0xcf, 0x11, 0xe0],
  doc: [0xd0, 0xcf, 0x11, 0xe0]
};

function fileProblem(file, kind) {
  const ext = path.extname(file.originalname).slice(1).toLowerCase();
  const allowed = KINDS[kind].ext;
  if (!allowed.includes(ext)) {
    return file.originalname + ': not allowed here. Allowed: ' + allowed.join(', ').toUpperCase();
  }
  if (file.size === 0) return file.originalname + ': the file is empty';

  if (ext === 'webp') {
    const real = file.buffer.slice(0, 4).toString() === 'RIFF' && file.buffer.slice(8, 12).toString() === 'WEBP';
    return real ? null : file.originalname + ': this is not a real WEBP image';
  }
  const sig = SIGNATURES[ext];
  if (sig && !sig.every((b, i) => file.buffer[i] === b)) {
    return file.originalname + ': this is not a real ' + ext.toUpperCase() + ' file';
  }
  return null;
}

function uploadFiles(req, res, next) {
  upload.fields([
    { name: 'bom', maxCount: 10 },
    { name: 'images', maxCount: 20 },
    { name: 'other', maxCount: 10 }
  ])(req, res, err => {
    if (err) {
      let msg = 'Could not read the uploaded files';
      if (err.code === 'LIMIT_FILE_SIZE') msg = 'Each file must be 10 MB or smaller';
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
        msg = 'Too many files. Upload fewer files at a time';
      }
      return res.status(400).json({ error: msg });
    }
    next();
  });
}

function collectFiles(req) {
  const items = [];
  const groups = req.files || {};
  for (const kind of Object.keys(KINDS)) {
    for (const file of groups[KINDS[kind].field] || []) {
      items.push({ kind, file });
    }
  }
  return items;
}

function checkFiles(items) {
  for (const item of items) {
    const problem = fileProblem(item.file, item.kind);
    if (problem) return problem;
  }
  return null;
}

function storeFiles(commissionId, items) {
  const insert = db.prepare(
    'INSERT INTO attachments (commission_id, kind, stored, name, size) VALUES (?, ?, ?, ?, ?)'
  );
  for (const { kind, file } of items) {
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    const stored = Date.now() + '-' + Math.random().toString(36).slice(2, 10) + '.' + ext;
    fs.writeFileSync(path.join(COMMISSION_DIR, stored), file.buffer);
    insert.run(commissionId, kind, stored, path.basename(file.originalname), file.size);
  }
}

function removeStored(stored) {
  if (!stored) return;
  const file = path.join(COMMISSION_DIR, path.basename(stored));
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

const COMMISSION_FIELDS = [
  'account_id', 'technician_id', 'equipment_id', 'model_id', 'part_no', 'serial_no',
  'mfg_year', 'compre_pressure', 'commission_date', 'pressure_setting', 'service_interval'
];

function readCommission(body, id) {
  const accountId = toId(body.account_id);
  const technicianId = toId(body.technician_id);
  const equipmentId = toId(body.equipment_id);
  const modelId = toId(body.model_id);

  if (!accountId || !db.prepare('SELECT id FROM accounts WHERE id = ?').get(accountId)) {
    return { error: 'Please select an account' };
  }
  if (technicianId && !db.prepare('SELECT id FROM technicians WHERE id = ?').get(technicianId)) {
    return { error: 'Selected technician was not found' };
  }
  if (!equipmentId || !db.prepare("SELECT id FROM masters WHERE id = ? AND kind = 'equipment'").get(equipmentId)) {
    return { error: 'Please select an equipment' };
  }
  if (!modelId || !db.prepare('SELECT id FROM models WHERE id = ?').get(modelId)) {
    return { error: 'Please select a model' };
  }

  const mfgYear = toText(body.mfg_year);
  if (mfgYear && !/^\d{4}$/.test(mfgYear)) {
    return { error: 'Mfg. Year must be 4 digits, like 2011' };
  }

  const intervalText = toText(body.service_interval);
  let interval = null;
  if (intervalText) {
    interval = Number(intervalText);
    if (!Number.isInteger(interval) || interval < 0) {
      return { error: 'Service Interval must be a whole number' };
    }
  }

  const date = toText(body.commission_date);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'Commission date is not valid' };
  }

  const part = toText(body.part_no);
  const serial = toText(body.serial_no);
  if (serial) {
    const same = db.prepare(`
      SELECT id FROM commissions
      WHERE account_id = ? AND model_id = ?
        AND LOWER(COALESCE(part_no, '')) = LOWER(?)
        AND LOWER(COALESCE(serial_no, '')) = LOWER(?)
        AND id != ?
    `).get(accountId, modelId, part, serial, id || 0);
    if (same) {
      return { error: 'This machine (same model, part number and serial number) is already added for this account' };
    }
  }

  return {
    values: [
      accountId, technicianId, equipmentId, modelId, part, serial,
      mfgYear, toText(body.compre_pressure), date, toText(body.pressure_setting), interval
    ]
  };
}

app.get('/api/commissions', (req, res) => {
  res.json(db.prepare(`
    SELECT cm.*, a.name AS account_name, m.name AS model_name,
           e.name AS equipment_name, t.name AS technician_name
    FROM commissions cm
    JOIN accounts a ON a.id = cm.account_id
    LEFT JOIN models m ON m.id = cm.model_id
    LEFT JOIN masters e ON e.id = cm.equipment_id
    LEFT JOIN technicians t ON t.id = cm.technician_id
    ORDER BY cm.commission_date DESC, cm.id DESC
  `).all());
});

app.get('/api/commissions/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM commissions WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Commission report not found' });
  res.json(row);
});

app.get('/api/commissions/:id/attachments', (req, res) => {
  res.json(db.prepare(
    'SELECT id, kind, name, size, created_at FROM attachments WHERE commission_id = ? ORDER BY id'
  ).all(Number(req.params.id)));
});

app.get('/api/attachments/:id/file', (req, res) => {
  const a = db.prepare('SELECT * FROM attachments WHERE id = ?').get(Number(req.params.id));
  if (!a) return res.status(404).send('File not found');
  const file = path.join(COMMISSION_DIR, path.basename(a.stored));
  if (!fs.existsSync(file)) return res.status(404).send('The file is missing from the uploads folder');

  const ext = path.extname(a.stored).slice(1).toLowerCase();
  const inline = ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    (inline ? 'inline' : 'attachment') + "; filename*=UTF-8''" + encodeURIComponent(a.name)
  );
  res.sendFile(file);
});

app.delete('/api/attachments/:id', (req, res) => {
  const id = Number(req.params.id);
  const a = db.prepare('SELECT stored FROM attachments WHERE id = ?').get(id);
  if (!a) return res.status(404).json({ error: 'File not found' });
  db.prepare('DELETE FROM attachments WHERE id = ?').run(id);
  removeStored(a.stored);
  res.json({ ok: true });
});

app.post('/api/commissions', uploadFiles, (req, res) => {
  const c = readCommission(req.body, 0);
  if (c.error) return res.status(400).json({ error: c.error });
  const items = collectFiles(req);
  const problem = checkFiles(items);
  if (problem) return res.status(400).json({ error: problem });

  const result = db.prepare(
    `INSERT INTO commissions (${COMMISSION_FIELDS.join(', ')}) VALUES (${COMMISSION_FIELDS.map(() => '?').join(', ')})`
  ).run(...c.values);
  const id = Number(result.lastInsertRowid);
  storeFiles(id, items);
  res.json({ ok: true, id });
});

app.put('/api/commissions/:id', uploadFiles, (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT id FROM commissions WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Commission report not found' });
  }
  const c = readCommission(req.body, id);
  if (c.error) return res.status(400).json({ error: c.error });
  const items = collectFiles(req);
  const problem = checkFiles(items);
  if (problem) return res.status(400).json({ error: problem });

  db.prepare(
    `UPDATE commissions SET ${COMMISSION_FIELDS.map(f => f + ' = ?').join(', ')} WHERE id = ?`
  ).run(...c.values, id);
  storeFiles(id, items);
  res.json({ ok: true });
});

app.delete('/api/commissions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT id FROM commissions WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Commission report not found' });
  }
  const files = db.prepare('SELECT stored FROM attachments WHERE commission_id = ?').all(id);
  db.prepare('DELETE FROM attachments WHERE commission_id = ?').run(id);
  db.prepare('DELETE FROM commissions WHERE id = ?').run(id);
  files.forEach(f => removeStored(f.stored));
  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log('CRM running at http://localhost:3000');
});