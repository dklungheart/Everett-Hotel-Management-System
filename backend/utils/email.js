/**
 * Email Service - Everett Hotel Management System
 * Handles all email functionality using Nodemailer
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * HTML-escape user-supplied values before interpolating into email templates.
 * Prevents HTML/email injection via names, messages, and other user input.
 */
function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Base email template
 */
function baseTemplate(content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: 'Georgia', serif; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #0F172A 0%, #1a2744 100%); padding: 40px 30px; text-align: center; }
        .header h1 { color: #D4AF37; margin: 0; font-size: 28px; letter-spacing: 3px; }
        .header p { color: #ffffff; margin: 5px 0 0; font-size: 12px; letter-spacing: 2px; }
        .content { padding: 40px 30px; color: #333; line-height: 1.8; }
        .content h2 { color: #0F172A; font-size: 22px; margin-top: 0; }
        .btn { display: inline-block; padding: 14px 36px; background: #D4AF37; color: #0F172A; text-decoration: none; font-weight: bold; letter-spacing: 1px; border-radius: 4px; margin: 20px 0; }
        .btn:hover { background: #c4a233; }
        .divider { border-top: 2px solid #D4AF37; margin: 30px 0; }
        .footer { background: #0F172A; padding: 30px; text-align: center; color: #999; font-size: 12px; }
        .footer a { color: #D4AF37; text-decoration: none; }
        .info-box { background: #f0f4f8; border-left: 4px solid #D4AF37; padding: 15px 20px; margin: 20px 0; border-radius: 0 4px 4px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EVERETT HOTEL</h1>
          <p>Luxury, Comfort, Excellence.</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>Everett Hotel &copy; ${new Date().getFullYear()} | All Rights Reserved</p>
          <p>Westlands, Nairobi, 00100</p>
          <p><a href="mailto:info@everetthotel.com">info@everetthotel.com</a> | +254 700 123 456</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send an email
 * @param {Object} options - Email options
 */
async function sendEmail({ to, subject, html }) {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || `"Everett Hotel" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: baseTemplate(html),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Email verification email
 */
async function sendVerificationEmail(email, token, firstName) {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email.html?token=${token}`;
  return sendEmail({
    to: email,
    subject: 'Everett Hotel - Verify Your Email',
    html: `
      <h2>Welcome, ${esc(firstName)}!</h2>
      <p>Thank you for registering at Everett Hotel. Please verify your email address to activate your account.</p>
      <div style="text-align: center;">
        <a href="${verifyUrl}" class="btn">VERIFY EMAIL</a>
      </div>
      <p style="font-size: 13px; color: #666;">This link expires in 24 hours. If you did not create an account, please ignore this email.</p>
    `,
  });
}

/**
 * Welcome email after verification
 */
async function sendWelcomeEmail(email, firstName) {
  return sendEmail({
    to: email,
    subject: 'Welcome to Everett Hotel!',
    html: `
      <h2>Welcome to the Everett Family, ${esc(firstName)}!</h2>
      <p>Your account has been successfully verified. We are delighted to have you with us.</p>
      <p>As a valued member, you can now:</p>
      <ul>
        <li>Browse and book our luxury rooms</li>
        <li>Manage your reservations</li>
        <li>Access exclusive member offers</li>
        <li>Rate and review your experiences</li>
      </ul>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/rooms" class="btn">EXPLORE ROOMS</a>
      </div>
    `,
  });
}

/**
 * Booking confirmation email
 */
async function sendBookingConfirmation(email, firstName, booking) {
  return sendEmail({
    to: email,
    subject: `Booking Confirmed - ${esc(booking.bookingReference)}`,
    html: `
      <h2>Booking Confirmation</h2>
      <p>Dear ${esc(firstName)}, your booking has been confirmed!</p>
      <div class="info-box">
        <p><strong>Booking Reference:</strong> ${esc(booking.bookingReference)}</p>
        <p><strong>Room:</strong> ${booking.roomNumber} (${esc(booking.roomCategory)})</p>
        <p><strong>Check-in:</strong> ${booking.checkIn}</p>
        <p><strong>Check-out:</strong> ${booking.checkOut}</p>
        <p><strong>Guests:</strong> ${booking.adults} Adults, ${booking.children || 0} Children</p>
        <p><strong>Total Amount:</strong> KES ${parseFloat(booking.finalAmount).toLocaleString()}</p>
      </div>
      <p>Please present a valid ID at check-in. Our standard check-in time is 2:00 PM and check-out is 11:00 AM.</p>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/profile" class="btn">VIEW BOOKING</a>
      </div>
    `,
  });
}

/**
 * Booking cancellation email
 */
async function sendBookingCancellation(email, firstName, booking) {
  return sendEmail({
    to: email,
    subject: `Booking Cancelled - ${esc(booking.bookingReference)}`,
    html: `
      <h2>Booking Cancellation</h2>
      <p>Dear ${esc(firstName)}, your booking has been cancelled.</p>
      <div class="info-box">
        <p><strong>Booking Reference:</strong> ${esc(booking.bookingReference)}</p>
        <p><strong>Room:</strong> ${booking.roomNumber} (${esc(booking.roomCategory)})</p>
        <p><strong>Check-in:</strong> ${booking.checkIn}</p>
        <p><strong>Check-out:</strong> ${booking.checkOut}</p>
      </div>
      <p>If you did not request this cancellation, please contact us immediately at +254 700 123 456.</p>
    `,
  });
}

/**
 * Invoice email
 */
async function sendInvoiceEmail(email, firstName, invoice) {
  return sendEmail({
    to: email,
    subject: `Invoice ${invoice.invoiceNumber} - Everett Hotel`,
    html: `
      <h2>Your Invoice</h2>
      <p>Dear ${esc(firstName)}, please find your invoice details below.</p>
      <div class="info-box">
        <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Booking Reference:</strong> ${invoice.bookingReference}</p>
        <p><strong>Subtotal:</strong> KES ${parseFloat(invoice.subtotal).toLocaleString()}</p>
        <p><strong>Tax:</strong> KES ${parseFloat(invoice.taxAmount).toLocaleString()}</p>
        <p><strong>Discount:</strong> -KES ${parseFloat(invoice.discountAmount).toLocaleString()}</p>
        <p><strong>Total:</strong> KES ${parseFloat(invoice.totalAmount).toLocaleString()}</p>
      </div>
      <p>You can download the full invoice from your dashboard.</p>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/profile" class="btn">VIEW INVOICE</a>
      </div>
    `,
  });
}

/**
 * Password reset email
 */
async function sendPasswordResetEmail(email, token, firstName) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${token}`;
  return sendEmail({
    to: email,
    subject: 'Everett Hotel - Password Reset Request',
    html: `
      <h2>Password Reset</h2>
      <p>Dear ${esc(firstName)}, we received a request to reset your password.</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn">RESET PASSWORD</a>
      </div>
      <p style="font-size: 13px; color: #666;">This link expires in 1 hour. If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
    `,
  });
}

/**
 * Contact form notification to admin
 */
async function sendContactNotification(message) {
  return sendEmail({
    to: process.env.SMTP_USER,
    subject: `New Contact Message: ${esc(message.subject)}`,
    html: `
      <h2>New Contact Message</h2>
      <div class="info-box">
        <p><strong>From:</strong> ${esc(message.name)}</p>
        <p><strong>Email:</strong> ${esc(message.email)}</p>
        <p><strong>Phone:</strong> ${esc(message.phone || 'N/A')}</p>
        <p><strong>Subject:</strong> ${esc(message.subject)}</p>
      </div>
      <p><strong>Message:</strong></p>
      <p>${esc(message.message)}</p>
    `,
  });
}

/**
 * Newsletter subscription confirmation
 */
async function sendNewsletterConfirmation(email) {
  return sendEmail({
    to: email,
    subject: 'Welcome to Everett Hotel Newsletter',
    html: `
      <h2>Thank You for Subscribing!</h2>
      <p>You are now part of the Everett Hotel family. You will receive:</p>
      <ul>
        <li>Exclusive deals and promotions</li>
        <li>Seasonal offers and packages</li>
        <li>Hotel news and updates</li>
        <li>Travel tips and recommendations</li>
      </ul>
      <p style="font-size: 13px; color: #666;">You can unsubscribe at any time by clicking the unsubscribe link in any email.</p>
    `,
  });
}

/**
 * M-Pesa payment confirmation email
 */
async function sendMpesaPaymentConfirmation(email, firstName, payment) {
  return sendEmail({
    to: email,
    subject: `M-Pesa Payment Confirmed - ${esc(payment.paymentReference)}`,
    html: `
      <h2>Payment Confirmed</h2>
      <p>Dear ${esc(firstName)}, your M-Pesa payment has been successfully processed!</p>
      <div class="info-box">
        <p><strong>Payment Reference:</strong> ${esc(payment.paymentReference)}</p>
        <p><strong>Booking Reference:</strong> ${esc(payment.bookingReference)}</p>
        <p><strong>Amount Paid:</strong> KES ${parseFloat(payment.amount).toLocaleString()}</p>
        <p><strong>M-Pesa Receipt:</strong> ${esc(payment.receiptNumber)}</p>
        <p><strong>Phone Number:</strong> ${esc(payment.phoneNumber)}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <p>Thank you for choosing Everett Hotel. We look forward to welcoming you!</p>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/profile" class="btn">VIEW BOOKING</a>
      </div>
    `,
  });
}

/**
 * Payment failed notification email
 */
async function sendPaymentFailedNotification(email, firstName, payment) {
  return sendEmail({
    to: email,
    subject: `Payment Failed - ${esc(payment.paymentReference)}`,
    html: `
      <h2>Payment Not Processed</h2>
      <p>Dear ${esc(firstName)}, we were unable to process your M-Pesa payment.</p>
      <div class="info-box">
        <p><strong>Payment Reference:</strong> ${esc(payment.paymentReference)}</p>
        <p><strong>Amount:</strong> KES ${parseFloat(payment.amount).toLocaleString()}</p>
        <p><strong>Reason:</strong> ${payment.reason || 'Payment was cancelled or timed out'}</p>
      </div>
      <p>Please try again or contact us at +254 700 123 456 if you need assistance.</p>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/booking" class="btn">TRY AGAIN</a>
      </div>
    `,
  });
}

/**
 * Card payment confirmation email
 */
async function sendCardPaymentConfirmation(email, firstName, payment) {
  return sendEmail({
    to: email,
    subject: `Card Payment Confirmed - ${esc(payment.paymentReference)}`,
    html: `
      <h2>Payment Confirmed</h2>
      <p>Dear ${esc(firstName)}, your card payment has been successfully processed!</p>
      <div class="info-box">
        <p><strong>Payment Reference:</strong> ${esc(payment.paymentReference)}</p>
        <p><strong>Booking Reference:</strong> ${esc(payment.bookingReference)}</p>
        <p><strong>Amount Paid:</strong> KES ${parseFloat(payment.amount).toLocaleString()}</p>
        <p><strong>Card:</strong> ${payment.brand} ending in ${payment.last4}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <p>Thank you for choosing Everett Hotel. We look forward to welcoming you!</p>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/profile" class="btn">VIEW BOOKING</a>
      </div>
    `,
  });
}

/**
 * Bank transfer instructions email
 */
async function sendBankTransferInstructions(email, firstName, payment) {
  return sendEmail({
    to: email,
    subject: `Bank Transfer Instructions - ${esc(payment.paymentReference)}`,
    html: `
      <h2>Bank Transfer Instructions</h2>
      <p>Dear ${esc(firstName)}, please use the following details to complete your bank transfer.</p>
      <div class="info-box">
        <p><strong>Payment Reference:</strong> ${esc(payment.paymentReference)}</p>
        <p><strong>Booking Reference:</strong> ${esc(payment.bookingReference)}</p>
        <p><strong>Amount to Transfer:</strong> KES ${parseFloat(payment.amount).toLocaleString()}</p>
        <p><strong>Account Reference:</strong> ${esc(payment.accountRef)}</p>
      </div>
      <h3 style="color: #0F172A; font-size: 16px;">Bank Details</h3>
      <div class="info-box">
        <p><strong>Bank:</strong> ${esc(payment.bankDetails.bankName)}</p>
        <p><strong>Account Name:</strong> ${esc(payment.bankDetails.accountName)}</p>
        <p><strong>Account Number:</strong> ${esc(payment.bankDetails.accountNumber)}</p>
        <p><strong>Branch:</strong> ${esc(payment.bankDetails.branch)}</p>
        <p><strong>SWIFT Code:</strong> ${esc(payment.bankDetails.swiftCode)}</p>
      </div>
      <p style="font-size: 13px; color: #666;">
        <strong>Important:</strong> Please use <strong>${esc(payment.accountRef)}</strong> as the payment/reference when making the transfer.
        Your booking will be confirmed once we verify the payment (usually within 1-2 business days).
      </p>
      <p style="font-size: 13px; color: #666;">
        Please send your proof of payment (deposit slip or screenshot) to <a href="mailto:payments@everetthotel.com">payments@everetthotel.com</a> with your payment reference.
      </p>
    `,
  });
}

/**
 * Bank transfer confirmed email
 */
async function sendBankTransferConfirmation(email, firstName, payment) {
  return sendEmail({
    to: email,
    subject: `Bank Transfer Confirmed - ${esc(payment.paymentReference)}`,
    html: `
      <h2>Payment Confirmed</h2>
      <p>Dear ${esc(firstName)}, your bank transfer has been verified and confirmed!</p>
      <div class="info-box">
        <p><strong>Payment Reference:</strong> ${esc(payment.paymentReference)}</p>
        <p><strong>Booking Reference:</strong> ${esc(payment.bookingReference)}</p>
        <p><strong>Amount Confirmed:</strong> KES ${parseFloat(payment.amount).toLocaleString()}</p>
        <p><strong>Date Confirmed:</strong> ${new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <p>Your booking is now confirmed. Thank you for choosing Everett Hotel!</p>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/profile" class="btn">VIEW BOOKING</a>
      </div>
    `,
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendBookingConfirmation,
  sendBookingCancellation,
  sendInvoiceEmail,
  sendPasswordResetEmail,
  sendContactNotification,
  sendNewsletterConfirmation,
  sendMpesaPaymentConfirmation,
  sendPaymentFailedNotification,
  sendCardPaymentConfirmation,
  sendBankTransferInstructions,
  sendBankTransferConfirmation,
};
