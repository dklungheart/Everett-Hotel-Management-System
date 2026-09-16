/**
 * SMS Service - Everett Hotel Management System
 * Uses Africa's Talking API (popular in Kenya)
 * Falls back to console logging in development
 */

const https = require('https');
const http = require('http');
require('dotenv').config();

const AT_USERNAME = process.env.AT_USERNAME || '';
const AT_API_KEY = process.env.AT_API_KEY || '';
const AT_SENDER_ID = process.env.AT_SENDER_ID || 'EVERETT';
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'africastalking';

// Only treat credentials as configured when real values are present
// (the .env ships with 'your_...' placeholders, which must fall back to dev mode)
const AT_IS_CONFIGURED =
  AT_USERNAME && AT_API_KEY &&
  !/your_|placeholder|changeme/i.test(AT_USERNAME) &&
  !/your_|placeholder|changeme/i.test(AT_API_KEY);

/**
 * Send SMS via Africa's Talking API
 */
async function sendATSMS(to, message) {
  return new Promise((resolve, reject) => {
    const postData = `username=${encodeURIComponent(AT_USERNAME)}&to=${encodeURIComponent(to)}&message=${encodeURIComponent(message)}&from=${encodeURIComponent(AT_SENDER_ID)}`;

    const options = {
      hostname: 'api.africastalking.com',
      path: '/version1/messaging',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': AT_API_KEY,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.SMSMessageData && data.SMSMessageData.Recipients) {
            const recipients = data.SMSMessageData.Recipients;
            const success = recipients.some(r => r.status === 'Success');
            if (success) {
              console.log(`SMS sent to ${to}: ${data.SMSMessageData.Message}`);
              resolve({ success: true, messageId: data.SMSMessageData.Message });
            } else {
              console.error(`SMS failed for ${to}: ${JSON.stringify(recipients)}`);
              resolve({ success: false, error: 'Delivery failed' });
            }
          } else {
            console.error(`SMS API error: ${body}`);
            resolve({ success: false, error: body });
          }
        } catch (e) {
          console.error(`SMS parse error: ${e.message}`);
          resolve({ success: false, error: e.message });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`SMS request error: ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Send SMS - main entry point
 * @param {string} to - Phone number (e.g., +254712345678)
 * @param {string} message - SMS text
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendSMS(to, message) {
  if (!to) {
    console.warn('SMS skipped: No phone number provided');
    return { success: false, error: 'No phone number' };
  }

  // Normalize phone number to Kenya format
  let normalizedPhone = to.replace(/\s+/g, '').replace(/-/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '+254' + normalizedPhone.substring(1);
  } else if (!normalizedPhone.startsWith('+')) {
    normalizedPhone = '+254' + normalizedPhone;
  }

  console.log(`Sending SMS to ${normalizedPhone}...`);

  if (SMS_PROVIDER === 'africastalking' && AT_IS_CONFIGURED) {
    return sendATSMS(normalizedPhone, message);
  }

  // Development fallback - log to console
  console.log('─────────────────────────────────────');
  console.log(`📱 SMS to: ${normalizedPhone}`);
  console.log(`📨 Message: ${message}`);
  console.log('─────────────────────────────────────');
  return { success: true, messageId: 'dev-' + Date.now() };
}

/**
 * Send checkout thank-you SMS with rating link
 */
async function sendCheckoutThankYou(phone, firstName, bookingReference) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
  const ratingUrl = `${frontendUrl}/rate.html?ref=${encodeURIComponent(bookingReference)}&guest=${encodeURIComponent(firstName)}`;

  const message = `Dear ${firstName}, thank you for staying at Everett Hotel! We hope you enjoyed your experience. We'd love your feedback — please rate us 1-10:\n${ratingUrl}\nEverett Hotel, Nairobi. Luxury, Comfort, Excellence.`;

  return sendSMS(phone, message);
}

module.exports = {
  sendSMS,
  sendCheckoutThankYou,
};
