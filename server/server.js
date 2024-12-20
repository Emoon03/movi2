// server/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan'); // For request logging
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(bodyParser.json()); // Parse JSON bodies
app.use(morgan('dev')); // Log HTTP requests for debugging

// Health Check Route
app.get('/', (req, res) => {
    res.status(200).send('Backend is running and healthy!');
});

// Import Routes
const movieRoutes = require('./routes'); // Import movie-related routes
app.use('/api', movieRoutes);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack); // Log error stack for debugging
    res.status(500).json({ error: 'An unexpected error occurred.' });
});

// 404 Handler for Undefined Routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});