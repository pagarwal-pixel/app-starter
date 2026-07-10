const { Resend } = require('resend');
const { APP_NAME } = require('../config');

// Resend email client — null when RESEND_API_KEY is not configured, so
// callers can degrade gracefully (mailto fallback, skipped emails).
const getResendClient = () => {
    if (process.env.RESEND_API_KEY) {
        return new Resend(process.env.RESEND_API_KEY);
    }
    return null;
};

// NOTE: onboarding@resend.dev only delivers to the Resend account owner.
// For production, configure FROM_EMAIL with a verified domain (resend.com/domains).
const getFromEmail = () => process.env.FROM_EMAIL || `${APP_NAME} <onboarding@resend.dev>`;

const getSupportEmail = () => process.env.SUPPORT_EMAIL || 'support@example.com';

module.exports = {
    getResendClient,
    getFromEmail,
    getSupportEmail
};
