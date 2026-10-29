/**
 * PostgreSQL Database Adapter
 *
 * Schema notes:
 * - `users`, `audit_log` are core skeleton tables — keep them.
 * - `resources` is a PLACEHOLDER domain entity. Rename/replace it with your
 *   app's real entities (projects, reports, sites, ...). `resource_access`
 *   holds per-resource grants for external users; keep the pattern even if
 *   you rename the tables.
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Prefer a single DATABASE_URL when available; fall back to
// individual env vars for local dev.
const poolConfig = process.env.DATABASE_URL
    ? {
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
      }
    : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || 'app_starter_dev',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
      };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
    console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err.message);
});

/**
 * Convert ? placeholders to $1, $2, etc. for PostgreSQL
 */
function convertPlaceholders(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
}

const db = {
    pool: pool,
    type: 'postgres',

    /** First row or null */
    async get(sql, params = []) {
        const result = await pool.query(convertPlaceholders(sql), params);
        return result.rows[0] || null;
    },

    /** All rows */
    async all(sql, params = []) {
        const result = await pool.query(convertPlaceholders(sql), params);
        return result.rows;
    },

    /** INSERT/UPDATE/DELETE → { changes, lastInsertRowid } */
    async run(sql, params = []) {
        const result = await pool.query(convertPlaceholders(sql), params);
        return {
            changes: result.rowCount,
            lastInsertRowid: result.rows[0]?.id || null
        };
    },

    /** Raw SQL (DDL) */
    async exec(sql) {
        await pool.query(sql);
    },

    /** Run a function inside a transaction; receives a client */
    async transaction(fn) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async tableExists(tableName) {
        const result = await pool.query(
            'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
            [tableName]
        );
        return result.rows[0]?.exists || false;
    },

    async close() {
        await pool.end();
    }
};

/** INSERT ... helper that returns the new row id */
async function insertAndReturnId(sql, params = []) {
    const row = await db.get(`${sql} RETURNING id`, params);
    return row?.id || null;
}

// Password hashing utilities
function hashPassword(password) {
    return bcrypt.hashSync(password, 12);
}

function verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

// Audit logging — best-effort, never throws
async function logAudit(userId, username, action, resourceType = null, resourceId = null, details = null, ipAddress = null) {
    try {
        await db.run(`
            INSERT INTO audit_log (user_id, username, action, resource_type, resource_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [userId, username, action, resourceType, resourceId, details, ipAddress]);
    } catch (e) {
        console.error('Failed to log audit:', e.message);
    }
}

// Initialize database schema
async function initDb() {
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT CHECK(role IN ('admin', 'internal', 'external')) NOT NULL DEFAULT 'external',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMPTZ,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                reset_token TEXT,
                reset_token_expires TIMESTAMPTZ
            )
        `);

        await db.exec(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                username TEXT,
                action TEXT NOT NULL,
                resource_type TEXT,
                resource_id INTEGER,
                details TEXT,
                ip_address TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // PLACEHOLDER domain entity — replace with your app's real tables.
        await db.exec(`
            CREATE TABLE IF NOT EXISTS resources (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Per-resource grants for external users. Keep this pattern even if
        // you rename `resources` to your domain entity.
        await db.exec(`
            CREATE TABLE IF NOT EXISTS resource_access (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
                granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                UNIQUE(user_id, resource_id)
            )
        `);

        await db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_resource_access_user ON resource_access(user_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_resource_access_resource ON resource_access(resource_id)');

        await seedDefaultAdmin();

        console.log('✅ PostgreSQL database initialized');
    } catch (err) {
        console.error('Database initialization error:', err.message);
        throw err;
    }
}

// First-run seed: creates the initial admin who then creates everyone else.
// Gated behind env flags so a production deploy can't ship a default login.
async function seedDefaultAdmin() {
    const result = await db.get('SELECT count(*) as c FROM users');
    if (parseInt(result.c) === 0) {
        const allowSeed = process.env.ALLOW_DEFAULT_ADMIN_SEED === 'true';
        if (!allowSeed) {
            console.warn('Skipping default admin seed because ALLOW_DEFAULT_ADMIN_SEED is not true. Create an admin via migrations or enable the flag with a strong ADMIN_PASSWORD.');
            return;
        }

        const defaultPassword = process.env.ADMIN_PASSWORD;
        if (!defaultPassword || defaultPassword.length < 12) {
            console.warn('Skipping default admin seed: set ADMIN_PASSWORD to a strong value (12+ chars) before enabling ALLOW_DEFAULT_ADMIN_SEED.');
            return;
        }

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const hashedPassword = bcrypt.hashSync(defaultPassword, 12);

        await db.run(`
            INSERT INTO users (email, username, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, ?)
        `, [adminEmail, 'admin', hashedPassword, 'admin', true]);

        console.log('✅ Default admin user created');
        console.log('   Username: admin');
        console.log('   Password: (from ADMIN_PASSWORD env)');
    }
}

module.exports = {
    db,
    pool,
    insertAndReturnId,
    hashPassword,
    verifyPassword,
    logAudit,
    initDb
};
