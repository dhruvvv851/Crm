export const menu = [
  { text: 'Users', items: [
    ['Call History', '/calls', 'call_history'],
    ['Technician', '/technicians', 'technician_list'],
    ['App Authorization', '/app-authorization', 'administrator'],
    ['Leave Management', '/leaves', 'leave_pending'],
    ['Start/End Day', '/start-end-day', 'start_end_day'],
    ['Reports', '/reports', 'reports']
  ] },
  { text: 'Sales', items: [
    ['Add Customer', '/customers/add', 'create_uqn'],
    ['List of Customer', '/customers', 'company_list'],
    ['Re-UQN List', '/re-uqn', 'create_uqn'],
    ['Model Master', '/models', 'masters'],
    ['Model Attachment', '/model-attachments', 'masters'],
    ['UQN Report', '/uqn-report', 'company_list']
  ] },
  { text: 'Quotation (After Sales)', items: [
    ['New Quotation', '/quotations/new', 'company_list'],
    ['Quotation List', '/quotations', 'company_list']
  ] },
  { text: 'Location', items: [
    ['Add Location', '/locations/add', 'company_list'],
    ['Location List', '/locations', 'company_list']
  ] },
  { text: 'Details', items: [['Parts', '/parts', 'masters']] },
  { text: 'Setting', items: [
    ['Admin List', '/admin', 'administrator'],
    ['Profile', '/profile'],
    ['Change Password', '/password']
  ] }
]