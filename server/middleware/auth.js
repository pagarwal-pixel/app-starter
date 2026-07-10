const jwt = require('jsonwebtoken');
const { db, logAudit } = require('../db');
const { JWT_SECRET, AUTH_COOKIE_NAME } = require('../config');
const { parsePositiveInt } = require('../lib/util');

// Role hierarchy: admin > internal > external
// - admin: everything, incl. user management
// - internal: full read/write on domain data
// - external: read-only, limited to explicitly granted resources
const ROLE_HIERARCHY = {
    admin: 3,
    internal: 2,
    external: 1
};

const parseCookies = (cookieHeader = '') => {
    return cookieHeader.split(';').reduce((acc, part) => {
        const [key, ...rest] = part.trim().split('=');
        if (!key) return acc;
        acc[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
        return acc;
    }, {});
};

const getTokenFromRequest = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    if (req.headers.cookie) {
        const cookies = parseCookies(req.headers.cookie);
        if (cookies[AUTH_COOKIE_NAME]) {
            return cookies[AUTH_COOKIE_NAME];
        }
    }
    return null;
};

// Auth Middleware - Verifies JWT and attaches user to request
const authenticate = async (req, res, next) => {
    const token = getTokenFromRequest(req);
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Fetch fresh user data from database
        const user = await db.get(
            'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (!user.is_active) {
            return res.status(401).json({ error: 'Account is deactivated' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Role-based authorization middleware
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            logAudit(req.user.id, req.user.username, 'ACCESS_DENIED', 'route', null,
                `Tried to access route requiring ${allowedRoles.join('/')} with role ${req.user.role}`,
                req.ip);
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

// Check if user has access to a specific resource (for external users).
// Admin and internal roles see everything; external users need an explicit
// grant in resource_access. Reuse this pattern for your own domain entities.
const checkResourceAccess = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const resourceId = parsePositiveInt(req.params.id);
    if (!resourceId) {
        return res.status(400).json({ error: 'Invalid resource id' });
    }
    req.resourceId = resourceId;

    if (req.user.role === 'admin' || req.user.role === 'internal') {
        return next();
    }

    const hasAccess = await db.get(`
        SELECT 1 FROM resource_access
        WHERE user_id = ? AND resource_id = ?
    `, [req.user.id, resourceId]);

    if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have access to this resource' });
    }

    next();
};

// Simple in-memory rate limiter (per-process; use a shared store if you scale out)
const createRateLimiter = (windowMs, max, keyFn) => {
    const hits = new Map();
    let nextSweepAt = 0;
    return (req, res, next) => {
        const key = keyFn(req);
        const now = Date.now();

        if (now >= nextSweepAt) {
            for (const [storedKey, storedEntry] of hits.entries()) {
                if (now > storedEntry.expires) {
                    hits.delete(storedKey);
                }
            }
            nextSweepAt = now + Math.min(windowMs, 60 * 1000);
        }

        const entry = hits.get(key) || { count: 0, expires: now + windowMs };

        if (now > entry.expires) {
            entry.count = 0;
            entry.expires = now + windowMs;
        }

        entry.count += 1;
        hits.set(key, entry);

        if (entry.count > max) {
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }

        next();
    };
};

const loginRateLimit = createRateLimiter(15 * 60 * 1000, 10, (req) => `login:${req.ip}`);
const resetRateLimit = createRateLimiter(15 * 60 * 1000, 5, (req) => `reset:${req.ip}`);

module.exports = {
    ROLE_HIERARCHY,
    getTokenFromRequest,
    authenticate,
    requireRole,
    checkResourceAccess,
    createRateLimiter,
    loginRateLimit,
    resetRateLimit
};
