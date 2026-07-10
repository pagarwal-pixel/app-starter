/**
 * PLACEHOLDER domain routes.
 *
 * `resources` is a stand-in for whatever your app is actually about
 * (projects, reports, sites, ...). It exists so the skeleton has a working
 * example of the role model end-to-end:
 *   - admin/internal see and manage everything
 *   - external users only see resources they have been granted in
 *     resource_access (see middleware/auth.js -> checkResourceAccess)
 *
 * When you build a real app from this template, rename or replace these
 * routes but keep the access pattern.
 */
const express = require('express');
const { db, insertAndReturnId, logAudit } = require('../db');
const { authenticate, requireRole, checkResourceAccess } = require('../middleware/auth');

const router = express.Router();

// List resources - external users only see what they were granted
router.get('/resources', authenticate, async (req, res) => {
    try {
        let resources;
        if (req.user.role === 'external') {
            resources = await db.all(`
                SELECT r.* FROM resources r
                JOIN resource_access ra ON ra.resource_id = r.id
                WHERE ra.user_id = ?
                ORDER BY r.name
            `, [req.user.id]);
        } else {
            resources = await db.all('SELECT * FROM resources ORDER BY name');
        }
        res.json({ resources });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get one resource - demonstrates checkResourceAccess
router.get('/resources/:id', authenticate, checkResourceAccess, async (req, res) => {
    try {
        const resource = await db.get('SELECT * FROM resources WHERE id = ?', [req.resourceId]);
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        res.json({ resource });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Create resource (admin/internal)
router.post('/resources', authenticate, requireRole('admin', 'internal'), async (req, res) => {
    const { name, description } = req.body;

    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const resourceId = await insertAndReturnId(`
            INSERT INTO resources (name, description)
            VALUES (?, ?)
        `, [String(name).trim(), description || null]);

        logAudit(req.user.id, req.user.username, 'RESOURCE_CREATED', 'resource', resourceId,
            `Created resource: ${name}`, req.ip);

        res.json({ success: true, resourceId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Delete resource (admin)
router.delete('/resources/:id', authenticate, requireRole('admin'), async (req, res) => {
    const { id } = req.params;

    try {
        const resource = await db.get('SELECT * FROM resources WHERE id = ?', [id]);
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        await db.run('DELETE FROM resources WHERE id = ?', [id]);

        logAudit(req.user.id, req.user.username, 'RESOURCE_DELETED', 'resource', id,
            `Deleted resource: ${resource.name}`, req.ip);

        res.json({ success: true, message: 'Resource deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
