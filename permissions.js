const PERMISSIONS = [
  { key: 'administrator', label: 'Admin List (administrator)' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'company_list', label: 'Company List' },
  { key: 'accounts', label: 'Account Master' },
  { key: 'commission', label: 'Commission Report' },
  { key: 'masters', label: 'Masters (City, Area, Segment, Equipment, Model)' },
  { key: 'call_history', label: 'Users - Call History' },
  { key: 'call_view', label: 'Users - Call View Details' },
  { key: 'add_call', label: 'Add Call' },
  { key: 'call_edit', label: 'Users - Call Edit (swipe call)' },
  { key: 'call_cancel', label: 'Users - Call Cancel' },
  { key: 'technician_list', label: 'Users - Technician List' },
  { key: 'add_user', label: 'Users - Add User (technician)' },
  { key: 'edit_user', label: 'Users - Edit User (technician)' },
  { key: 'start_end_day', label: 'Users - Start/End Day', soon: true },
  { key: 'reports', label: 'Users - Reports', soon: true },
  { key: 'leave_pending', label: 'Leave - Pending List', soon: true },
  { key: 'leave_approved', label: 'Leave - Approved List', soon: true },
  { key: 'create_uqn', label: 'Can user create UQN?' }
];

const ALL_KEYS = PERMISSIONS.map(p => p.key);

module.exports = { PERMISSIONS, ALL_KEYS };