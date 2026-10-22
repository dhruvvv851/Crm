const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const crypto = require('crypto');
const { hashPassword, verifyPassword } = require('./auth');
const { PERMISSIONS, ALL_KEYS } = require('./permissions');

const app = express();
app.use(express.json());
app.use(express.static('public'));

function count(sql) {
  return db.prepare(sql).get().n;
}
// ---------- Login and sessions ----------
const SESSION_HOURS = { admin: 12, engineer: 24 * 30 };
const DUMMY_HASH = hashPassword('dummy-password-for-timing');
const failedLogins = new Map();
const LOCK_MS = 15 * 60 * 1000;

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch (e) {
        return '';
      }
    }
  }
  return '';
}

function setSessionCookie(res, token, seconds) {
  const age = seconds ? '; Max-Age=' + seconds : '';
  res.setHeader('Set-Cookie', 'sid=' + token + '; HttpOnly; SameSite=Lax; Path=/' + age);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}

function effectivePermissions(row) {
  if (row.role !== 'admin') return [];
  if (row.permissions == null) return ALL_KEYS;
  try {
    return JSON.parse(row.permissions).filter(k => ALL_KEYS.includes(k));
  } catch (e) {
    return [];
  }
}

function loadUser(req, res, next) {
  req.user = null;
  const token = readCookie(req, 'sid');
  if (token) {
    const row = db.prepare(`
      SELECT u.id, u.username, u.role, u.technician_id, u.permissions, t.name AS technician_name
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN technicians t ON t.id = u.technician_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1
    `).get(sha256(token), Date.now());
    if (row) {
      req.user = {
        id: row.id,
        username: row.username,
        role: row.role,
        technician_id: row.technician_id,
        technician_name: row.technician_name,
        permissions: effectivePermissions(row)
      };
    }
  }
  next();
}

app.use('/api', loadUser);

app.post('/api/login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter the username and password' });
  }

  const key = req.ip + '|' + username.toLowerCase();
  const tries = failedLogins.get(key);
  if (tries && tries.count >= 5 && Date.now() - tries.first < LOCK_MS) {
    return res.status(429).json({ error: 'Too many wrong attempts. Please try again after 15 minutes.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  const passwordOk = verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !passwordOk || !user.active) {
    const now = Date.now();
    const rec = tries && now - tries.first < LOCK_MS ? tries : { count: 0, first: now };
    rec.count += 1;
    failedLogins.set(key, rec);
    return res.status(401).json({ error: 'Wrong username or password' });
  }
  failedLogins.delete(key);
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  const token = crypto.randomBytes(32).toString('hex');
    const remember = req.body.remember !== false;
  let seconds = 3600 * (SESSION_HOURS[user.role] || 12);
  let keepCookie = true;
  if (user.role === 'admin') {
    seconds = remember ? 3600 * 24 * 7 : 3600 * 12;
    keepCookie = remember;
  }
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(sha256(token), user.id, Date.now() + seconds * 1000);
   setSessionCookie(res, token, keepCookie ? seconds : 0);
  res.json({ ok: true, role: user.role });
});

app.post('/api/logout', (req, res) => {
  const token = readCookie(req, 'sid');
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  res.json(req.user);
});

// Everything below this line needs a login
app.use('/api', (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Please log in' });
  next();
});

// Field engineers may only use the /api/field addresses
app.use('/api', (req, res, next) => {
  if (req.user.role === 'engineer' && !req.path.startsWith('/field')) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  next();
});

app.use('/api/field', (req, res, next) => {
  if (req.user.role !== 'engineer') {
    return res.status(403).json({ error: 'Only field engineers can use this' });
  }
  next();
});
// Office users: what each address needs
const OPEN_READS = [
  ['GET', /^\/(technicians|models|call-options)$/],
  ['GET', /^\/masters\/\w+$/],
  ['GET', /^\/accounts(\/\d+(\/machines)?)?$/]
];

const RULES = [
  ['GET', /^\/dashboard$/, 'dashboard'],
  ['GET', /^\/calls$/, 'call_history'],
  ['GET', /^\/calls\/\d+$/, 'call_view'],
  ['POST', /^\/calls$/, 'add_call'],
  ['POST', /^\/calls\/\d+\/swipe$/, 'call_edit'],
  ['POST', /^\/calls\/\d+\/cancel$/, 'call_cancel'],
  ['GET', /^\/customers(\/\d+(\/quotations)?)?$/, ['company_list', 'create_uqn']],
  ['GET', /^\/quotations$/, ['company_list', 'create_uqn']],
  ['POST', /^\/(customers|quotations)$/, 'create_uqn'],
  ['POST', /^\/technicians$/, 'add_user'],
  ['PUT', /^\/technicians\/\d+$/, 'edit_user'],
  ['POST', /^\/(models|masters\/\w+)$/, 'masters'],
  ['PUT', /^\/(models|masters\/\w+)\/\d+$/, 'masters'],
  ['DELETE', /^\/masters\/\w+\/\d+$/, 'masters'],
  ['POST', /^\/accounts$/, 'accounts'],
  ['PUT', /^\/accounts\/\d+$/, 'accounts'],
  ['DELETE', /^\/accounts\/\d+$/, 'accounts'],
  ['*', /^\/(commissions|attachments)(\/|$)/, 'commission'],
  ['*', /^\/(users|permissions)(\/|$)/, 'administrator']
];

app.use('/api', (req, res, next) => {
  if (req.user.role !== 'admin') return next();
  if (OPEN_READS.some(([method, re]) => method === req.method && re.test(req.path))) return next();

  const rule = RULES.find(([method, re]) => (method === '*' || method === req.method) && re.test(req.path));
  const need = rule ? [].concat(rule[2]) : [];
  if (!need.some(key => req.user.permissions.includes(key))) {
    return res.status(403).json({ error: 'You do not have permission for this' });
  }
  next();
});

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
      SELECT calls.id, calls.call_no, calls.created_at,
             COALESCE(a.name, cu.name) AS customer
      FROM calls
      LEFT JOIN accounts a ON a.id = calls.account_id
      LEFT JOIN customers cu ON cu.id = calls.customer_id
      ORDER BY calls.id DESC LIMIT 5
    `).all(),
    technicianList: db.prepare('SELECT id, name FROM technicians ORDER BY name').all()
  });
});

// ---------- Calls ----------
const VISITS = ['AMC', 'Warranty', 'Goodwill', 'Chargeable', 'AMC/Payment Followup'];
const PRIORITIES = ['Low Priority', 'Medium Priority', 'High Priority'];

function nextCallNo() {
  const d = new Date();
  const prefix =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  const row = db.prepare('SELECT MAX(call_no) AS m FROM calls WHERE call_no LIKE ?').get(prefix + '%');
  const next = row.m ? Number(row.m.slice(6)) + 1 : 1;
  return prefix + String(next).padStart(4, '0');
}

function ensureFirstStep(call) {
  const has = db.prepare('SELECT id FROM call_steps WHERE call_id = ? LIMIT 1').get(call.id);
  if (!has) {
    db.prepare("INSERT INTO call_steps (call_id, status, technician_id, created_at) VALUES (?, 'Pending', ?, ?)")
      .run(call.id, call.technician_id, call.created_at);
  }
}

function pendingCall(id, res) {
  const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(id);
  if (!call) {
    res.status(404).json({ error: 'Call not found' });
    return null;
  }
  if (call.status !== 'Pending') {
    res.status(400).json({ error: 'Only a pending call can be changed' });
    return null;
  }
  ensureFirstStep(call);
  return call;
}

function wholeOrNull(v) {
  const t = toText(v);
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

function readCoord(v, limit) {
  const t = toText(v);
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : NaN;
}

app.get('/api/call-options', (req, res) => {
  res.json({ visits: VISITS, priorities: PRIORITIES });
});

app.get('/api/accounts/:id/machines', (req, res) => {
  res.json(db.prepare(`
    SELECT cm.id, cm.part_no, cm.serial_no, m.name AS model_name, e.name AS equipment_name
    FROM commissions cm
    LEFT JOIN models m ON m.id = cm.model_id
    LEFT JOIN masters e ON e.id = cm.equipment_id
    WHERE cm.account_id = ?
    ORDER BY m.name, cm.serial_no
  `).all(Number(req.params.id)));
});

app.get('/api/calls', (req, res) => {
  res.json(db.prepare(`
    SELECT calls.id, calls.call_no, calls.problem, calls.status, calls.nature_of_visit,
           calls.priority, calls.call_date, calls.created_at, calls.technician_id,
           COALESCE(a.name, cu.name) AS customer, t.name AS technician_name
    FROM calls
    LEFT JOIN accounts a ON a.id = calls.account_id
    LEFT JOIN customers cu ON cu.id = calls.customer_id
    LEFT JOIN technicians t ON t.id = calls.technician_id
    ORDER BY calls.id DESC
  `).all());
});

app.get('/api/calls/:id', (req, res) => {
  const id = Number(req.params.id);
  const call = db.prepare(`
    SELECT calls.*, COALESCE(a.name, cu.name) AS company,
           COALESCE(a.address, cu.address) AS address,
           COALESCE(a.contact_person, cu.contact_person) AS contact_person,
           t.name AS technician_name,
           m.name AS model_name, cm.part_no, cm.serial_no, e.name AS equipment_name
    FROM calls
    LEFT JOIN accounts a ON a.id = calls.account_id
    LEFT JOIN customers cu ON cu.id = calls.customer_id
    LEFT JOIN technicians t ON t.id = calls.technician_id
    LEFT JOIN commissions cm ON cm.id = calls.commission_id
    LEFT JOIN models m ON m.id = cm.model_id
    LEFT JOIN masters e ON e.id = cm.equipment_id
    WHERE calls.id = ?
  `).get(id);
  if (!call) return res.status(404).json({ error: 'Call not found' });

  ensureFirstStep(call);
  const steps = db.prepare(`
    SELECT s.*, t.name AS technician_name, f.name AS from_technician_name
    FROM call_steps s
    LEFT JOIN technicians t ON t.id = s.technician_id
    LEFT JOIN technicians f ON f.id = s.from_technician_id
    WHERE s.call_id = ?
    ORDER BY s.id
  `).all(id);
  const summary = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN status = 'Swiped' THEN 1 ELSE 0 END), 0) AS swipes,
           COALESCE(SUM(CASE WHEN check_in IS NOT NULL THEN 1 ELSE 0 END), 0) AS visits,
           COALESCE(SUM(total_minutes), 0) AS minutes
    FROM call_steps WHERE call_id = ?
  `).get(id);
  res.json({ call, steps, summary });
});

app.post('/api/calls', (req, res) => {
  const accountId = toId(req.body.account_id);
  const technicianId = toId(req.body.technician_id);
  const commissionId = toId(req.body.commission_id);
  const problem = toText(req.body.problem);
  const visit = toText(req.body.nature_of_visit);
  const priority = toText(req.body.priority) || 'Low Priority';
  const date = toText(req.body.call_date);

  if (!accountId || !db.prepare('SELECT id FROM accounts WHERE id = ?').get(accountId)) {
    return res.status(400).json({ error: 'Please select a company' });
  }
  if (commissionId && !db.prepare('SELECT id FROM commissions WHERE id = ? AND account_id = ?').get(commissionId, accountId)) {
    return res.status(400).json({ error: 'The selected machine does not belong to this company' });
  }
  if (!technicianId || !db.prepare('SELECT id FROM technicians WHERE id = ?').get(technicianId)) {
    return res.status(400).json({ error: 'Please select a technician' });
  }
  if (!VISITS.includes(visit)) {
    return res.status(400).json({ error: 'Please select the nature of visit' });
  }
  if (!problem) {
    return res.status(400).json({ error: 'Please write the nature of the problem' });
  }
  if (!PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'Priority is not valid' });
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Call date is not valid' });
  }

  const callNo = nextCallNo();
  const result = db.prepare(`
    INSERT INTO calls
      (customer_id, account_id, commission_id, technician_id, problem, nature_of_visit, priority, call_date, call_no)
    VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(accountId, commissionId, technicianId, problem, visit, priority, date, callNo);
  const id = Number(result.lastInsertRowid);
  db.prepare("INSERT INTO call_steps (call_id, status, technician_id) VALUES (?, 'Pending', ?)").run(id, technicianId);
  res.json({ ok: true, id, call_no: callNo });
});

app.post('/api/calls/:id/swipe', (req, res) => {
  const call = pendingCall(Number(req.params.id), res);
  if (!call) return;
  const technicianId = toId(req.body.technician_id);
  const reason = toText(req.body.reason);
  if (!technicianId || !db.prepare('SELECT id FROM technicians WHERE id = ?').get(technicianId)) {
    return res.status(400).json({ error: 'Please select a technician' });
  }
  if (technicianId === call.technician_id) {
    return res.status(400).json({ error: 'This call is already assigned to that technician' });
  }
  if (!reason) {
    return res.status(400).json({ error: 'Please write the swipe call reason' });
  }
  db.prepare('UPDATE calls SET technician_id = ? WHERE id = ?').run(technicianId, call.id);
  db.prepare(
    "INSERT INTO call_steps (call_id, status, technician_id, from_technician_id, reason) VALUES (?, 'Swiped', ?, ?, ?)"
  ).run(call.id, technicianId, call.technician_id, reason);
  res.json({ ok: true });
});

app.post('/api/calls/:id/cancel', (req, res) => {
  const call = pendingCall(Number(req.params.id), res);
  if (!call) return;
  db.prepare("UPDATE calls SET status = 'Cancelled' WHERE id = ?").run(call.id);
  db.prepare("INSERT INTO call_steps (call_id, status, technician_id) VALUES (?, 'Cancelled', ?)").run(call.id, call.technician_id);
  res.json({ ok: true });
});

// ---------- Field engineer app (will be protected by login later) ----------
app.post('/api/field/calls/:id/visit', (req, res) => {
  const call = pendingCall(Number(req.params.id), res);
  if (!call) return;

   if (req.user.technician_id !== call.technician_id) {
    return res.status(403).json({ error: 'This call is not assigned to you' });
  }

  const timeFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  const checkIn = toText(req.body.check_in);
  const checkOut = toText(req.body.check_out);
  if (!timeFormat.test(checkIn) || !timeFormat.test(checkOut)) {
    return res.status(400).json({ error: 'Please send the check in and check out time' });
  }
  const minutes = Math.round((new Date(checkOut) - new Date(checkIn)) / 60000);
  if (!(minutes >= 0)) {
    return res.status(400).json({ error: 'Check out time must be after check in time' });
  }

  const outcome = toText(req.body.outcome);
  if (!['Pending', 'Complete'].includes(outcome)) {
    return res.status(400).json({ error: 'Outcome must be Pending or Complete' });
  }
  const reason = toText(req.body.reason);
  if (outcome === 'Pending' && !reason) {
    return res.status(400).json({ error: 'Please write the pending call reason' });
  }

  const inLat = readCoord(req.body.check_in_lat, 90);
  const inLng = readCoord(req.body.check_in_lng, 180);
  const outLat = readCoord(req.body.check_out_lat, 90);
  const outLng = readCoord(req.body.check_out_lng, 180);
  if ([inLat, inLng, outLat, outLng].some(Number.isNaN)) {
    return res.status(400).json({ error: 'The location is not valid' });
  }

  const running = wholeOrNull(req.body.running_hours);
  const load = wholeOrNull(req.body.load_hours);
  if (Number.isNaN(running) || Number.isNaN(load)) {
    return res.status(400).json({ error: 'Running hours and load hours must be whole numbers' });
  }
  const email = toText(req.body.contact_email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Contact email is not valid' });
  }

  db.prepare(`
    INSERT INTO call_steps
      (call_id, status, technician_id, reason, check_in, check_out, total_minutes,
       check_in_lat, check_in_lng, check_out_lat, check_out_lng,
       running_hours, load_hours, contact_person, contact_phone, contact_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    call.id, outcome, call.technician_id, reason, checkIn, checkOut, minutes,
    inLat, inLng, outLat, outLng, running, load,
    toText(req.body.contact_person), toText(req.body.contact_phone), email
  );
  if (outcome === 'Complete') {
    db.prepare("UPDATE calls SET status = 'Complete' WHERE id = ?").run(call.id);
  }
  res.json({ ok: true });
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
// ---------- Office users and permissions ----------
function cleanPermissions(list) {
  if (!Array.isArray(list)) return null;
  return ALL_KEYS.filter(key => list.includes(key));
}

function otherAdmins(exceptId) {
  const rows = db.prepare("SELECT role, permissions FROM users WHERE role = 'admin' AND active = 1 AND id != ?").all(exceptId);
  return rows.filter(r => effectivePermissions(r).includes('administrator')).length;
}

function userRow(u) {
  return {
    id: u.id,
    username: u.username,
    last_login: u.last_login,
    permissions: effectivePermissions(u)
  };
}

app.get('/api/permissions', (req, res) => {
  res.json(PERMISSIONS);
});

app.get('/api/users', (req, res) => {
  const rows = db.prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY username").all();
  res.json(rows.map(userRow));
});

app.post('/api/users', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const permissions = cleanPermissions(req.body.permissions);

  if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3 to 40 characters: letters, numbers, dot, dash or underscore' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'The password must be at least 8 characters' });
  }
  if (!permissions) {
    return res.status(400).json({ error: 'Permissions are not valid' });
  }
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
    return res.status(400).json({ error: 'This username already exists' });
  }

  const result = db.prepare(
    "INSERT INTO users (username, password_hash, role, permissions) VALUES (?, ?, 'admin', ?)"
  ).run(username, hashPassword(password), JSON.stringify(permissions));
  res.json({ ok: true, id: Number(result.lastInsertRowid) });
});

app.put('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'admin'").get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const permissions = cleanPermissions(req.body.permissions);
  if (!permissions) return res.status(400).json({ error: 'Permissions are not valid' });

  const wasAdministrator = effectivePermissions(user).includes('administrator');
  if (wasAdministrator && !permissions.includes('administrator') && otherAdmins(id) === 0) {
    return res.status(400).json({ error: 'At least one active user must keep the Admin List (administrator) permission' });
  }

  db.prepare('UPDATE users SET permissions = ? WHERE id = ?').run(JSON.stringify(permissions), id);
  res.json({ ok: true });
});

app.put('/api/users/:id/password', (req, res) => {
  const id = Number(req.params.id);
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'admin'").get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const password = String(req.body.password || '');
  if (password.length < 8) {
    return res.status(400).json({ error: 'The password must be at least 8 characters' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), id);
  const keep = id === req.user.id ? sha256(readCookie(req, 'sid')) : '';
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(id, keep);
  res.json({ ok: true });
});

app.delete('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'admin'").get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (effectivePermissions(user).includes('administrator') && otherAdmins(id) === 0) {
    return res.status(400).json({ error: 'You cannot delete the last administrator' });
  }
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log('CRM running at http://localhost:3000');
});