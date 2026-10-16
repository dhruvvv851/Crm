const menu = [
  { text: 'Users', items: [['Add User', '#'], ['User List', '#']] },
  { text: 'Sales', items: [['Customers', '/customers.html'], ['Enquiries', '#']] },
  { text: 'Quotation (After Sales)', items: [['New Quotation', '#'], ['Quotation List', '#']] },
  { text: 'Location', items: [['Add Location', '#'], ['Location List', '#']] },
  { text: 'Details', items: [['Models', '#'], ['Parts', '#'], ['Technicians', '#']] },
  { text: 'Setting', items: [['Profile', '#'], ['Change Password', '#']] }
];

const target = document.getElementById('header') || document.getElementById('sidebar');

let html = `
  <div class="redbar">
    <div class="back" onclick="history.back()" title="Back">&#8249;</div>
    <div class="icon" title="Messages">&#9993;</div>
    <div class="icon" onclick="location.reload()" title="Refresh">&#8635;</div>
    <a class="tbtn" href="/index.html">Go to CRM</a>
    <a class="tbtn" href="/soft-home.html">Go to Software</a>
    <a class="tbtn" href="/add-call.html">Add Call</a>
    <div class="spacer"></div>
    <div class="icon" id="fs" title="Full screen">&#9974;</div>
    <div class="avatar" title="Profile">&#128100;</div>
  </div>
  <div class="menubar">`;

for (const m of menu) {
  html += `<div class="menu"><span>${m.text} &#9662;</span><div class="drop">`;
  for (const [label, href] of m.items) {
    html += `<a href="${href}">${label}</a>`;
  }
  html += `</div></div>`;
}
html += `</div>`;
target.innerHTML = html;

document.getElementById('fs').onclick = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
};