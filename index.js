const serverless = require('serverless-http');
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fileController = require('./src/controllers/fileController');
const fs = require('fs');

const app = express();

// Middleware
app.use(express.json());
app.use('/utils', express.static(path.join(__dirname, 'src/utils'))); // For utility scripts
app.use('/styles.css', express.static(path.join(__dirname, 'src/views/styles.css'))); // For CSS
app.use(express.static(path.join(__dirname, 'src/views'))); // For HTML files

app.use(
  fileUpload({
    createParentPath: true,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
  })
);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/views/index.html'));
});

// File upload route
app.post('/upload', fileController.handleFileUpload);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Export the handler for AWS Lambda
module.exports.handler = serverless(app);
