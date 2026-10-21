// Pretends to be the engineer app.
// Usage:  node test-engineer.js <call id> pending     (visit ends, job not finished)
//         node test-engineer.js <call id> complete    (visit ends, job complete)

const BASE = 'http://localhost:3000';
const callId = process.argv[2];
const outcome = process.argv[3] === 'complete' ? 'Complete' : 'Pending';

async function main() {
  if (!callId) {
    console.log('Please give the call number, like: node test-engineer.js 5 pending');
    return;
  }

  const res = await fetch(BASE + '/api/calls/' + callId);
  if (!res.ok) {
    console.log('Call not found');
    return;
  }
  const data = await res.json();
  const day = new Date().toLocaleDateString('en-CA');

  const body = outcome === 'Pending'
    ? {
        check_in: day + 'T10:00', check_out: day + 'T12:30',
        reason: 'Job in progress'
      }
    : {
        check_in: day + 'T14:00', check_out: day + 'T14:40',
        running_hours: 6500, load_hours: 5200,
        contact_person: 'Test Person', contact_phone: '9999999999', contact_email: 'test@example.com'
      };

  Object.assign(body, {
    technician_id: data.call.technician_id,
    outcome,
    check_in_lat: 28.6139, check_in_lng: 77.2090,
    check_out_lat: 28.6140, check_out_lng: 77.2091
  });

  const out = await fetch(BASE + '/api/field/calls/' + callId + '/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  console.log('Status', out.status, await out.text());
}

main().catch(e => console.log('Could not reach the server:', e.message));