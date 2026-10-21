const BASE = 'http://localhost:3000';

async function get(path) {
  const res = await fetch(BASE + path);
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, data: text.slice(0, 120) };
  }
}

async function main() {
  const accounts = await get('/api/accounts');
  const equipment = await get('/api/masters/equipment');
  const models = await get('/api/models');
  const technicians = await get('/api/technicians');
  const commissions = await get('/api/commissions');

  const checks = [
    ['accounts', accounts], ['equipment', equipment], ['models', models],
    ['technicians', technicians], ['commissions', commissions]
  ];
  for (const [name, r] of checks) {
    console.log(
      name.padEnd(13), 'status', r.status,
      Array.isArray(r.data) ? 'rows: ' + r.data.length : 'ANSWER: ' + JSON.stringify(r.data)
    );
  }

  if (![accounts, equipment, models].every(r => Array.isArray(r.data) && r.data.length > 0)) {
    console.log('\nStop: accounts, equipment and models must each have at least 1 row.');
    return;
  }

  const form = new FormData();
  form.append('account_id', accounts.data[0].id);
  form.append('equipment_id', equipment.data[0].id);
  form.append('model_id', models.data[0].id);
  form.append('part_no', 'TEST-PART');
  form.append('serial_no', 'TEST-' + Date.now());

  const res = await fetch(BASE + '/api/commissions', { method: 'POST', body: form });
  console.log('\nSave test: status', res.status);
  console.log(await res.text());
}

main().catch(e => console.log('Could not reach the server:', e.message));