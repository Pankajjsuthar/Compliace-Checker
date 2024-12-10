const path = require("path");
const fs = require("fs");
const csvService = require("../services/csvService");
const complianceService = require("../services/complianceCheckService");

exports.handleFileUpload = async (req, res) => {
  try {
    if (!req.files || !req.files.csvFile) {
      return res.status(400).send("No file uploaded.");
    }

    const csvFile = req.files.csvFile;

    // Validate file type
    if (!csvFile.name.endsWith(".csv")) {
      return res.status(400).send("Please upload a CSV file.");
    }

    const filePath = path.join(__dirname, "../../uploads", csvFile.name);

    // Save file to uploads directory
    await csvFile.mv(filePath);

    // Step 1: Process the CSV file
    const processedData = await csvService.processCSV(filePath);

    // Step 2: Perform compliance checks using the processed data
    const complianceData = await complianceService.processComplianceData(processedData);

    // Clean up - remove the uploaded file
    fs.unlinkSync(filePath);

    // Send both processed data sets back
    res.json({
      success: true,
      data: { processedData, complianceData },
    });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Optional: Add a helper route to serve the compliance view
exports.serveComplianceView = (req, res) => {
  res.sendFile(path.join(__dirname, "../views/index.html"));
};
