const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'utils', 'email.js');
const s = fs.readFileSync(p, 'utf8');
const lines = s.split('\n');

const escDef = lines.findIndex(l => l.includes('function esc('));
const escCalls = s.split('esc(').length - 1;
const bareMarkers = [
  '${message.message}', '${message.subject}', '${message.name}',
  '${message.email}', '${firstName}', '${booking.firstName}',
  '${payment.phoneNumber}', '${payment.accountRef}', '${payment.receiptNumber}',
  '${payment.paymentReference}', '${payment.bookingReference}',
  '${payment.bankDetails.bankName}', '${payment.bankDetails.accountName}',
  '${payment.bankDetails.accountNumber}', '${payment.bankDetails.branch}',
  '${payment.bankDetails.swiftCode}',
];

const bare = {};
for (const m of bareMarkers) {
  const c = s.split(m).length - 1;
  if (c > 0) bare[m] = c;
}

console.log('esc() defined at line:', escDef + 1);
console.log('esc( call sites in file (including def):', escCalls);
console.log('CONTENT IS ESCAPED:', Object.keys(bare).length === 0);
if (Object.keys(bare).length) {
  console.log('--- STILL BARE (unescaped) user-data interpolations ---');
  for (const k of Object.keys(bare)) console.log(`  ${k}  (x${bare[k]})`);
}
