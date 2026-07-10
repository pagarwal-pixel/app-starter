const express = require('express');
const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { db, hashPassword, verifyPassword, logAudit } = require('../db');
const { JWT_SECRET, JWT_EXPIRES_IN, AUTH_COOKIE_NAME, COOKIE_OPTIONS, APP_NAME } = require('../config');
const { authenticate, loginRateLimit, resetRateLimit } = require('../middleware/auth');
const { getResendClient, getFromEmail } = require('../lib/mail');

const router = express.Router();

// Login - returns JWT token and sets an httpOnly cookie
router.post('/login', loginRateLimit, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user by username or email
    const user = await db.get(`
        SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE
    `, [username, username]);

    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordValid = verifyPassword(password, user.password_hash);

    if (!passwordValid) {
        logAudit(user.id, user.username, 'LOGIN_FAILED', 'user', user.id, 'Invalid password', req.ip);
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);

    logAudit(user.id, user.username, 'LOGIN_SUCCESS', 'user', user.id, null, req.ip);

    res.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    });
});

// Get current user info
router.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

// Logout - clear auth cookie
router.post('/logout', (req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, {
        ...COOKIE_OPTIONS,
        maxAge: 0
    });
    res.json({ success: true });
});

// Request password reset
router.post('/forgot-password', resetRateLimit, async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({ success: true, message: 'If an account exists with this email, a reset link will be sent.' });
        }

        const resetToken = randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

        await db.run(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [resetToken, resetTokenExpires, user.id]
        );

        const resend = getResendClient();
        if (resend) {
            const baseUrl = process.env.APP_BASE_URL || req.headers.origin || 'http://localhost:3000';
            const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

            try {
                const { error } = await resend.emails.send({
                    from: getFromEmail(),
                    to: email,
                    subject: 'Password Reset Request',
                    html: `
                        <h2>Password Reset</h2>
                        <p>You requested a password reset for your ${APP_NAME} account.</p>
                        <p>Click the link below to reset your password (expires in 1 hour):</p>
                        <p><a href="${resetUrl}">${resetUrl}</a></p>
                        <p>If you didn't request this, please ignore this email.</p>
                    `
                });

                if (error) {
                    console.error('[Password Reset] Resend API Error:', error);
                    // Don't throw - still return success to prevent email enumeration
                } else {
                    logAudit(user.id, user.username, 'PASSWORD_RESET_REQUESTED', 'user', user.id, null, req.ip);
                }
            } catch (emailError) {
                console.error('[Password Reset] Failed to send email:', emailError.message);
            }
        } else {
            console.warn('[Password Reset] Resend client not configured. Set RESEND_API_KEY in .env');
        }

        res.json({ success: true, message: 'If an account exists with this email, a reset link will be sent.' });
    } catch (err) {
        console.error('[Password Reset] Error:', err);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Reset password with token
router.post('/reset-password', resetRateLimit, async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const user = await db.get(`
            SELECT * FROM users
            WHERE reset_token = ? AND reset_token_expires > CURRENT_TIMESTAMP
        `, [token]);

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const passwordHash = hashPassword(password);

        await db.run(`
            UPDATE users
            SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL
            WHERE id = ?
        `, [passwordHash, user.id]);

        logAudit(user.id, user.username, 'PASSWORD_RESET_COMPLETED', 'user', user.id, null, req.ip);

        res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Change password (authenticated users)
router.post('/change-password', authenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!verifyPassword(currentPassword, user.password_hash)) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const passwordHash = hashPassword(newPassword);

        await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);

        logAudit(user.id, user.username, 'PASSWORD_CHANGED', 'user', user.id, null, req.ip);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
