// Pretends to be the engineer app (it logs in first, like the real app will).
// Usage:  node test-engineer.js <call id> <pending|complete> <engineer username> <engineer password>

const BASE = 'http://localhost:3000';
const [callId, mode, username, password] = process.argv.slice(2);
const outcome = mode === 'complete' ? 'Complete' : 'Pending';

async function main() {
  if (!callId || !username || !password) {
    console.log('Usage: node test-engineer.js <call id> <pending|complete> <engineer username> <engineer password>');
    return;
  }

  const login = await fetch(BASE + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!login.ok) {
    console.log('Login failed:', await login.text());
    return;
  }
  const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');

  const day = new Date().toLocaleDateString('en-CA');
  const body = outcome === 'Pending'
    ? { check_in: day + 'T10:00', check_out: day + 'T12:30', reason: 'Job in progress' }
    : {
        check_in: day + 'T14:00', check_out: day + 'T14:40',
        running_hours: 6500, load_hours: 5200,
        contact_person: 'Test Person', contact_phone: '9999999999', contact_email: 'test@example.com'
      };

  Object.assign(body, {
    outcome,
    check_in_lat: 28.6139, check_in_lng: 77.2090,
    check_out_lat: 28.6140, check_out_lng: 77.2091
  });

  const out = await fetch(BASE + '/api/field/calls/' + callId + '/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body)
  });
  console.log('Status', out.status, await out.text());
}

main().catch(e => console.log('Could not reach the server:', e.message));