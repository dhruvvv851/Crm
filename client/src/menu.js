export const menu = [
  { text: 'Users', items: [
    ['Call History', '/calls'], ['Technician', '/technicians'], ['App Authorization', '/app-authorization'],
    ['Leave Management', '/leaves'], ['Start/End Day', '/start-end-day'], ['Reports', '/reports']
  ] },
  { text: 'Sales', items: [
    ['Add Customer', '/customers/add'], ['List of Customer', '/customers'], ['Re-UQN List', '/re-uqn'],
    ['Model Master', '/models'], ['Model Attachment', '/model-attachments'], ['UQN Report', '/uqn-report']
  ] },
  { text: 'Quotation (After Sales)', items: [['New Quotation', '/quotations/new'], ['Quotation List', '/quotations']] },
  { text: 'Location', items: [['Add Location', '/locations/add'], ['Location List', '/locations']] },
  { text: 'Details', items: [['Parts', '/parts']] },
  { text: 'Setting', items: [['Profile', '/profile'], ['Change Password', '/password']] }
]