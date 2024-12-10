const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fileController = require('./src/controllers/fileController');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use('/utils', express.static(path.join(__dirname, 'src/utils'))); // For utility scripts
app.use('/styles.css', express.static(path.join(__dirname, 'src/views/styles.css'))); // For CSS
app.use(express.static(path.join(__dirname, 'src/views'))); // For HTML files
app.use(fileUpload({
    createParentPath: true,
    limits: { 
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    },
}));

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/views/index.html'));
});

// File upload route - update the path to match frontend fetch call
app.post('/upload', fileController.handleFileUpload);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Uploads directory: ${uploadsDir}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});