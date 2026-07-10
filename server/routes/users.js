const express = require('express');
const { db, insertAndReturnId, hashPassword, logAudit } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { parseBooleanInput } = require('../lib/util');

const router = express.Router();

// ============ USER MANAGEMENT ROUTES (Admin Only) ============

// Get all users
router.get('/users', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const users = await db.all(`
            SELECT u.id, u.email, u.username, u.role, u.is_active, u.created_at, u.last_login,
                   creator.username as created_by_username
            FROM users u
            LEFT JOIN users creator ON u.created_by = creator.id
            ORDER BY u.created_at DESC
        `);

        res.json({ users });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Create new user
router.post('/users', authenticate, requireRole('admin'), async (req, res) => {
    const { email, username, password, role } = req.body;

    if (!email || !username || !password || !role) {
        return res.status(400).json({ error: 'All fields are required: email, username, password, role' });
    }

    if (!['admin', 'internal', 'external'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be admin, internal, or external' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const existing = await db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existing) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const passwordHash = hashPassword(password);

        const userId = await insertAndReturnId(`
            INSERT INTO users (email, username, password_hash, role, created_by)
            VALUES (?, ?, ?, ?, ?)
        `, [email, username, passwordHash, role, req.user.id]);

        logAudit(req.user.id, req.user.username, 'USER_CREATED', 'user', userId,
            `Created user: ${username} (${role})`, req.ip);

        res.json({
            success: true,
            userId,
            message: `User ${username} created successfully`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Update user
router.put('/users/:id', authenticate, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    const { email, username, password, role, is_active } = req.body;
    const requestedActiveState = is_active === undefined ? undefined : parseBooleanInput(is_active);

    try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent admin from deactivating themselves
        if (parseInt(id, 10) === req.user.id && requestedActiveState === false) {
            return res.status(400).json({ error: 'You cannot deactivate your own account' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (email) {
            updates.push('email = ?');
            values.push(email);
        }
        if (username) {
            updates.push('username = ?');
            values.push(username);
        }
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }
            updates.push('password_hash = ?');
            values.push(hashPassword(password));
        }
        if (role && ['admin', 'internal', 'external'].includes(role)) {
            updates.push('role = ?');
            values.push(role);
        }
        if (requestedActiveState !== undefined) {
            updates.push('is_active = ?');
            values.push(requestedActiveState);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        values.push(id);
        await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

        logAudit(req.user.id, req.user.username, 'USER_UPDATED', 'user', id,
            `Updated user: ${user.username}`, req.ip);

        res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Delete user
router.delete('/users/:id', authenticate, requireRole('admin'), async (req, res) => {
    const { id } = req.params;

    try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent admin from deleting themselves
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own account' });
        }

        // Clear references so FK constraints do not block deletion (logs/grants keep history)
        await db.run('UPDATE audit_log SET user_id = NULL WHERE user_id = ?', [id]);
        await db.run('UPDATE users SET created_by = NULL WHERE created_by = ?', [id]);
        await db.run('UPDATE resource_access SET granted_by = NULL WHERE granted_by = ?', [id]);

        await db.run('DELETE FROM users WHERE id = ?', [id]);

        logAudit(req.user.id, req.user.username, 'USER_DELETED', 'user', id,
            `Deleted user: ${user.username}`, req.ip);

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ============ RESOURCE ACCESS GRANTS (Admin Only) ============
// Generic per-resource access for external users. If you rename `resources`
// to your domain entity, update these queries (and the client api.ts) to match.

// Get resource access for a user
router.get('/users/:id/access', authenticate, requireRole('admin'), async (req, res) => {
    const { id } = req.params;

    try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const access = await db.all(`
            SELECT ra.*, r.name as resource_name, grantor.username as granted_by_username
            FROM resource_access ra
            JOIN resources r ON ra.resource_id = r.id
            LEFT JOIN users grantor ON ra.granted_by = grantor.id
            WHERE ra.user_id = ?
        `, [id]);

        // All resources for the grant dropdown
        const allResources = await db.all('SELECT id, name FROM resources ORDER BY name');

        res.json({ access, allResources, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Grant resource access to user
router.post('/users/:id/access', authenticate, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    const { resourceId } = req.body;

    if (!resourceId) {
        return res.status(400).json({ error: 'Resource ID is required' });
    }

    try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const resource = await db.get('SELECT * FROM resources WHERE id = ?', [resourceId]);
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        const existing = await db.get('SELECT * FROM resource_access WHERE user_id = ? AND resource_id = ?', [id, resourceId]);
        if (existing) {
            return res.status(400).json({ error: 'User already has access to this resource' });
        }

        await db.run(`
            INSERT INTO resource_access (user_id, resource_id, granted_by)
            VALUES (?, ?, ?)
        `, [id, resourceId, req.user.id]);

        logAudit(req.user.id, req.user.username, 'ACCESS_GRANTED', 'resource', resourceId,
            `Granted access to user ${user.username} for resource ${resource.name}`, req.ip);

        res.json({ success: true, message: `Access granted to ${resource.name}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Revoke resource access from user
router.delete('/users/:id/access/:resourceId', authenticate, requireRole('admin'), async (req, res) => {
    const { id, resourceId } = req.params;

    try {
        const result = await db.run('DELETE FROM resource_access WHERE user_id = ? AND resource_id = ?', [id, resourceId]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Access record not found' });
        }

        logAudit(req.user.id, req.user.username, 'ACCESS_REVOKED', 'resource', resourceId,
            `Revoked access from user ${id} for resource ${resourceId}`, req.ip);

        res.json({ success: true, message: 'Access revoked successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get audit log (Admin only)
router.get('/audit-log', authenticate, requireRole('admin'), async (req, res) => {
    const { limit = 100, offset = 0 } = req.query;

    try {
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
        const offsetNum = Math.max(parseInt(offset, 10) || 0, 0);
        const logs = await db.all(`
            SELECT al.*, u.email as user_email
            FROM audit_log al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `, [limitNum, offsetNum]);

        const total = Number((await db.get('SELECT count(*) as c FROM audit_log'))?.c || 0);

        res.json({ logs, total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
