/**
 * Central configuration. Loads server/.env explicitly so working-directory
 * differences don't break config. Require this before anything that reads env.
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    require('dotenv').config();
}

const isProduction = process.env.NODE_ENV === 'production';

// JWT Secret - require explicit configuration in production, use a stable dev fallback locally.
const JWT_SECRET = process.env.JWT_SECRET || (!isProduction ? 'local-dev-jwt-secret-change-me' : null);
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production');
}
if (!process.env.JWT_SECRET && !isProduction) {
    console.warn('JWT_SECRET is not set. Using the local development fallback secret.');
}

const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

module.exports = {
    isProduction,
    APP_NAME: process.env.APP_NAME || 'App Starter',
    JWT_SECRET,
    JWT_EXPIRES_IN: '24h',
    AUTH_COOKIE_NAME: 'auth_token',
    COOKIE_OPTIONS: {
        httpOnly: true,
        // Respect explicit override; otherwise default to secure cookies in production only.
        secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000 // 24h
    },
    uploadsDir
};
