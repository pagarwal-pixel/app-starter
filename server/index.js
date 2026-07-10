// Load config first: it reads server/.env before anything else touches process.env
const config = require('./config');

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

// Requiring the db module initializes the schema and seeds the first admin
const { db } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
    origin: process.env.CORS_ORIGIN || true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static files from the client dist folder
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptimeSeconds: Math.round(process.uptime()),
        dbType: db.type
    });
});

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/resources'));
app.use('/api', require('./routes/support'));

// Centralized error handler (captures multer validation errors too)
app.use((err, req, res, next) => {
    if (!err) {
        return next();
    }
    const status = err.statusCode || (err instanceof multer.MulterError ? 400 : 500);
    res.status(status).json({ error: err.message || 'Unexpected error' });
});

// Catch-all route to serve the React app for client-side routing
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`${config.APP_NAME} server running on port ${port}`);
});
