// Usage:  node create-user.js <username> <password> <admin|engineer> [technician id]
// Running it again for the same username resets that password.

const db = require('./database');
const { hashPassword } = require('./auth');

const [username, password, role, techId] = process.argv.slice(2);

function stop(message) {
  console.log(message);
  process.exit(1);
}

if (!username || !password || !role) {
  stop('Usage: node create-user.js <username> <password> <admin|engineer> [technician id]');
}
if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) {
  stop('Username must be 3 to 40 characters: letters, numbers, dot, dash or underscore');
}
if (password.length < 8) {
  stop('The password must be at least 8 characters');
}
if (!['admin', 'engineer'].includes(role)) {
  stop('Role must be admin or engineer');
}

let technicianId = null;
if (role === 'engineer') {
  technicianId = Number(techId);
  if (!Number.isInteger(technicianId) || !db.prepare('SELECT id FROM technicians WHERE id = ?').get(technicianId)) {
    stop('An engineer needs a valid technician id, like: node create-user.js engineer1 YourPassword engineer 1');
  }
}

const hash = hashPassword(password);
const old = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

if (old) {
  db.prepare('UPDATE users SET password_hash = ?, role = ?, technician_id = ?, active = 1 WHERE id = ?')
    .run(hash, role, technicianId, old.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(old.id);
  console.log('Password reset for', username);
} else {
  db.prepare('INSERT INTO users (username, password_hash, role, technician_id) VALUES (?, ?, ?, ?)')
    .run(username, hash, role, technicianId);
  console.log('User created:', username, '(' + role + ')');
}