const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('crm.db');

const columns = table =>
  db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name).join(', ');

console.log('calls columns:', columns('calls'));
console.log('customers columns:', columns('customers'));
console.log('calls saved:', db.prepare('SELECT COUNT(*) AS n FROM calls').get().n);