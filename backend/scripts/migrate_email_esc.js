// One-time migration: wrap user-supplied email-template interpolations with esc().
// Literal string replaces only (no regex). Idempotent — skips already-escaped.
const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '..', 'utils', 'email.js');
let s = fs.readFileSync(target, 'utf8');

const pairs = [
  ['${message.message}', '${esc(message.message)}'],
  ['${message.subject}', '${esc(message.subject)}'],
  ['${message.name}', '${esc(message.name)}'],
  ['${message.email}', '${esc(message.email)}'],
  ["${message.phone || 'N/A'}", "${esc(message.phone || 'N/A')}"],
  ['${firstName}', '${esc(firstName)}'],
  ["${booking.firstName}", "${esc(booking.firstName)}"],
  ["${booking.bookingReference}", "${esc(booking.bookingReference)}"],
  ["${booking.roomNumber || 'TBD'}", "${esc(booking.roomNumber || 'TBD')}"],
  ["${booking.roomCategory}", "${esc(booking.roomCategory)}"],
  ["${payment.phoneNumber}", "${esc(payment.phoneNumber)}"],
  ["${payment.accountRef}", "${esc(payment.accountRef)}"],
  ["${payment.receiptNumber}", "${esc(payment.receiptNumber)}"],
  ["${payment.paymentReference}", "${esc(payment.paymentReference)}"],
  ["${payment.bookingReference}", "${esc(payment.bookingReference)}"],
  ["${payment.paymentReference || ''}", "${esc(payment.paymentReference || '')}"],
  ["${payment.accountReference}", "${esc(payment.accountReference)}"],
  ["${payment.bankDetails.bankName}", "${esc(payment.bankDetails.bankName)}"],
  ["${payment.bankDetails.accountName}", "${esc(payment.bankDetails.accountName)}"],
  ["${payment.bankDetails.accountNumber}", "${esc(payment.bankDetails.accountNumber)}"],
  ["${payment.bankDetails.branch}", "${esc(payment.bankDetails.branch)}"],
  ["${payment.bankDetails.swiftCode}", "${esc(payment.bankDetails.swiftCode)}"],
];

let total = 0;
for (const [from, to] of pairs) {
  let cnt = 0;
  while (s.includes(from)) { s = s.replace(from, to); cnt++; }
  if (cnt > 0) { console.log(`${from} -> ${to}  (x${cnt})`); total += cnt; }
}
fs.writeFileSync(target, s, 'utf8');
console.log(`total replaced: ${total}`);
