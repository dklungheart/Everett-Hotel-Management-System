const https = require('https');
const http = require('http');
const { queryOne, insert, execute } = require('../config/database');

const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  passkey: process.env.MPESA_PASSKEY,
  shortcode: process.env.MPESA_SHORTCODE || '174379',
  callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://everetthotel.com/api/mpesa/callback',
  environment: process.env.MPESA_ENV || 'sandbox',
};

function getBaseUrl() {
  return MPESA_CONFIG.environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('254')) return cleaned;
  if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
  if (cleaned.startsWith('+254')) return cleaned.slice(1);
  return cleaned;
}

function generatePassword() {
  const timestamp = getTimestamp();
  const dataToEncode = `${MPESA_CONFIG.shortcode}${MPESA_CONFIG.passkey}${timestamp}`;
  return Buffer.from(dataToEncode).toString('base64');
}

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function makeRequest(url, options, postData) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error(`Invalid response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function getAccessToken() {
  const credentials = Buffer.from(
    `${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`
  ).toString('base64');

  const url = `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;
  const response = await makeRequest(url, {
    method: 'GET',
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!response.access_token) {
    throw new Error('Failed to get M-Pesa access token');
  }

  return response.access_token;
}

async function initiateSTKPush(phoneNumber, amount, accountReference, transactionDesc) {
  const accessToken = await getAccessToken();
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const timestamp = getTimestamp();
  const password = generatePassword();

  const url = `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`;

  const body = JSON.stringify({
    BusinessShortCode: MPESA_CONFIG.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: formattedPhone,
    PartyB: MPESA_CONFIG.shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: MPESA_CONFIG.callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc || 'Everett Hotel Payment',
  });

  const response = await makeRequest(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }, body);

  if (response.ResponseCode === '0') {
    await insert(
      `INSERT INTO mpesa_transactions (checkout_request_id, merchant_request_id, phone_number, amount, account_reference, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [response.CheckoutRequestID, response.MerchantRequestID, formattedPhone, amount, accountReference]
    );
  }

  return {
    success: response.ResponseCode === '0',
    checkoutRequestId: response.CheckoutRequestID,
    merchantRequestId: response.MerchantRequestID,
    responseCode: response.ResponseCode,
    responseDescription: response.ResponseDescription,
    customerMessage: response.CustomerMessage,
  };
}

async function checkTransactionStatus(checkoutRequestId) {
  const accessToken = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword();

  const url = `${getBaseUrl()}/mpesa/transactionstatus/v1/query`;

  const body = JSON.stringify({
    BusinessShortCode: MPESA_CONFIG.shortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
    ResultURL: `${MPESA_CONFIG.callbackUrl}/result`,
  });

  const response = await makeRequest(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }, body);

  return response;
}

async function processCallback(callbackData) {
  const { Body } = callbackData;
  const stkCallback = Body?.stkCallback;

  if (!stkCallback) {
    return { success: false, message: 'Invalid callback data' };
  }

  const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
  const metadata = CallbackMetadata?.Item || [];

  const amount = metadata.find(i => i.Name === 'Amount')?.Value;
  const mpesaReceiptNumber = metadata.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
  const transactionDate = metadata.find(i => i.Name === 'TransactionDate')?.Value;
  const phoneNumber = metadata.find(i => i.Name === 'PhoneNumber')?.Value;

  // Security: verify the transaction actually exists and is still pending
  // (prevents forged callbacks marking arbitrary transactions complete)
  const txn = await queryOne(
    "SELECT * FROM mpesa_transactions WHERE checkout_request_id = ?",
    [CheckoutRequestID]
  );

  if (!txn) {
    return { success: false, message: 'Unknown CheckoutRequestID' };
  }

  if (txn.status === 'completed') {
    return { success: true, message: 'Callback already processed', receiptNumber: txn.mpesa_receipt_number, paymentId: txn.payment_id };
  }

  if (txn.status !== 'pending') {
    return { success: false, message: `Transaction is not in a completable state (${txn.status})` };
  }

  // Security: amount in the callback must match the amount we initiated
  if (ResultCode === 0 && amount !== undefined && String(amount) !== String(txn.amount)) {
    return { success: false, message: `Amount mismatch: expected ${txn.amount}, got ${amount}` };
  }

  if (ResultCode !== 0) {
    await execute(
      "UPDATE mpesa_transactions SET status = 'failed', result_code = ?, result_desc = ? WHERE checkout_request_id = ?",
      [ResultCode, ResultDesc, CheckoutRequestID]
    );
    return { success: false, message: ResultDesc, resultCode: ResultCode };
  }

  await execute(
    `UPDATE mpesa_transactions
     SET status = 'completed', result_code = ?, result_desc = ?, mpesa_receipt_number = ?,
         transaction_date = ?, updated_at = NOW()
     WHERE checkout_request_id = ?`,
    [ResultCode, ResultDesc, mpesaReceiptNumber, transactionDate, CheckoutRequestID]
  );

  const updatedTxn = await queryOne(
    "SELECT * FROM mpesa_transactions WHERE checkout_request_id = ?",
    [CheckoutRequestID]
  );

  if (updatedTxn && updatedTxn.payment_id) {
    await execute(
      "UPDATE payments SET status = 'completed', transaction_id = ?, paid_at = NOW() WHERE id = ?",
      [mpesaReceiptNumber, updatedTxn.payment_id]
    );
  }

  return {
    success: true,
    receiptNumber: mpesaReceiptNumber,
    amount,
    phoneNumber,
    accountReference: updatedTxn?.account_reference,
    paymentId: updatedTxn?.payment_id,
  };
}

module.exports = {
  getAccessToken,
  initiateSTKPush,
  checkTransactionStatus,
  processCallback,
  formatPhoneNumber,
  MPESA_CONFIG,
};
