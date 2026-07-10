/**
 * Database bootstrap — PostgreSQL only.
 *
 * ⚠️  Never use SQLite-specific SQL functions in raw queries. Common mistakes:
 *   ❌ INSTR(col, str)   → ✅ STRPOS(col, str)
 *   ❌ IFNULL(a, b)      → ✅ COALESCE(a, b)
 *   ❌ GROUP_CONCAT(col) → ✅ STRING_AGG(col, ',')
 *   ❌ AUTOINCREMENT     → ✅ SERIAL / GENERATED ALWAYS AS IDENTITY
 */

const dbModule = require('./postgres');

dbModule.initDb().catch((err) => {
    console.error('Failed to initialize PostgreSQL:', err.message);
    process.exit(1);
});

module.exports = dbModule;
