const fs = require('fs');
const csv = require('csv-parse');

/**
 * Compliance Check Service for Processing Driver Shifts
 * Handles detailed analysis and processing of driver shifts 
 * with complex time-based compliance rules.
 */

// Constants for shift break and rest period thresholds
const MIN_REST_BETWEEN_SHIFTS = 4.25; // hours
const MAX_REST_BETWEEN_SHIFTS = 34; // hours

/**
 * Converts time strings to a standardized Date object
 * Handles various input formats and time zones robustly
 * 
 * @param {string} dateStr - Date string (e.g., '11/13/2024')
 * @param {string} timeStr - Time string (e.g., '10:58 PM', '12:00 AM')
 * @returns {Date|null} Standardized Date object in UTC
 */
function parseTimeConsistently(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;

    // Normalize input
    dateStr = dateStr.trim();
    timeStr = timeStr.trim().toUpperCase();

    // Parse the date (MM/DD/YYYY format)
    const [month, day, year] = dateStr.split('/').map(Number);

    // Parse the time (handle AM/PM)
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i;
    const match = timeStr.match(timeRegex);

    if (!match) {
        console.warn(`Invalid time format: ${timeStr}`);
        return null;
    }

    let [, hours, minutes, period] = match;
    hours = parseInt(hours);
    minutes = parseInt(minutes);

    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }

    // Create Date in UTC to avoid timezone complications
    const parsedDate = new Date(Date.UTC(
        year,
        month - 1,  // Months are 0-indexed
        day,
        hours,
        minutes
    ));

    return parsedDate;
}

/**
 * Adjust midnight time to be the end of the previous day
 * @param {Date} time - Original time 
 * @returns {Date} Adjusted time
 */
function adjustMidnightTime(time) {
    // If time is exactly midnight, subtract 1 minute to make it 23:59 of previous day
    if (time.getUTCHours() === 0 && time.getUTCMinutes() === 0 && time.getUTCSeconds() === 0) {
        return new Date(time.getTime() - 60000); // Subtract 1 minute
    }
    return time;
}

/**
 * Calculate hours difference between two times, with special handling for midnight
 * @param {Date} timeOut - Later time 
 * @param {Date} timeIn - Earlier time
 * @returns {number} Hours difference
 */
function calculateHoursDifferenceBetween2Shifts(currentShiftTimeIn, lastShiftTimeOut, fileNumber) {
    if(currentShiftTimeIn.getUTCHours() === 0 && currentShiftTimeIn.getUTCMinutes() === 0 && currentShiftTimeIn.getUTCSeconds() === 0 && lastShiftTimeOut.getUTCHours() === 0 && lastShiftTimeOut.getUTCMinutes() === 0 && lastShiftTimeOut.getUTCSeconds() === 0) {
        return 0;
    }

    // if(fileNumber == "000546"){
    //     console.log(`current shift ka timeIn = ${lastShiftTimeOut} lastprocessedShift ka timeOut = ${currentShiftTimeIn}, differ_hours = ${(currentShiftTimeIn-lastShiftTimeOut) / (60*60 * 1000)}`);
    // }
    return (currentShiftTimeIn - lastShiftTimeOut) / (60*60 * 1000);
}

/**
 * Format Date object to a more readable string
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string
 */
function formatDateTime(date) {
    if (!(date instanceof Date)) return date;

    // Format date to MM/DD/YYYY HH:MM (24-hour format)
    return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
    });
}

/**
 * Format the entire compliance data with improved readability
 * @param {Object} data - Processed compliance data
 * @returns {Object} Formatted data
 */
function formatComplianceData(data) {
    const formattedData = {};

    for (const [fileNumber, driverData] of Object.entries(data)) {
        const formattedDriverData = { ...driverData };

        // Format original shifts
        if (formattedDriverData.shifts) {
            formattedDriverData.shifts = formattedDriverData.shifts.map(shift => ({
                ...shift,
                timeIn: formatDateTime(shift.timeIn),
                timeOut: formatDateTime(shift.timeOut),
                duration: Number(shift.duration.toFixed(2))
            }));
        }

        // Format processed shifts if they exist
        if (formattedDriverData.processedShifts) {
            formattedDriverData.processedShifts = formattedDriverData.processedShifts.map(shift => ({
                ...shift,
                timeIn: formatDateTime(shift.timeIn),
                timeOut: formatDateTime(shift.timeOut),
                breaks: shift.breaks.map(breakPeriod => 
                    breakPeriod.map(formatDateTime)
                ),
                duration: Number(shift.duration.toFixed(2)),
                restHoursFromLastShift: Number(shift.restHoursFromLastShift.toFixed(2))
            }));
        }

        formattedData[fileNumber] = formattedDriverData;
    }

    return formattedData;
}

function calculateLast7DaysHours(shiftData, fileNumber) {
    const QUEUE_SIZE = 7;
    const processedShifts = [];

    // Ensure input is sorted by timeIn
    const sortedShifts = [...shiftData].sort((a, b) => new Date(a.timeIn) - new Date(b.timeIn));

    // Queue to track shifts in the last 7 days
    const sevenDaysQueue = [];
    let totalHours7Days = 0;

    sortedShifts.forEach((currentShift, index) => {
        // Calculate the time 7 days ago from current shift's timeIn
        const sevenDaysAgo = new Date(new Date(currentShift.timeIn).getTime() - 7 * 24 * 60 * 60 * 1000);

        // Remove shifts from the queue that are older than 7 days
        while (sevenDaysQueue.length > 0 && 
               new Date(sevenDaysQueue[0].timeOut) < sevenDaysAgo) {
               if(fileNumber == "000541"){
                console.log(fileNumber);
                console.log(`sevenDaysAgo timeOut = ${sevenDaysQueue[0].timeOut},sevenDaysAgo timeIn : ${sevenDaysAgo}, current timeIn : ${currentShift.timeIn}`);
               }
            // Subtract the duration of the shift being removed
            totalHours7Days -= sevenDaysQueue.shift().duration;
        }

        // Add current shift to queue and total hours
        sevenDaysQueue.push(currentShift);
        totalHours7Days += currentShift.duration;

        // Create a new shift object with additional last 7 days hours information
        const processedShift = {
            ...currentShift,
            last7DaysHours: Number(totalHours7Days.toFixed(2))
        };

        processedShifts.push(processedShift);
    });

    return processedShifts;
}


// Example usage in CSV processing
exports.processCSV = async (filePath) => {
    return new Promise((resolve, reject) => {
        const csvProcessedDataMap = new Map();

        fs.createReadStream(filePath, { encoding: 'utf-8' })
            .pipe(csv.parse({
                columns: true,
                skip_empty_lines: true,
                trim: true,
                bom: true,
                delimiter: ',',
                quote: '"',
                relax_quotes: true,
                relax_column_count: true
            }))
            .on('data', (row) => {
                const fileNumber = row['File Number'];

                // If this is the first entry for this driver
                if (!csvProcessedDataMap.has(fileNumber)) {
                    csvProcessedDataMap.set(fileNumber, {
                        firstName: row['Payroll Name: First Name'],
                        lastName: row['Payroll Name: Last Name'],
                        companyCode: row['Company Code'],
                        jobTitle: row['Job Title Description'],
                        timeCardWorkDept: row['Timecard Worked Department Description'],
                        workedDeptID: row['Worked Department'],
                        shifts: []
                    });
                }

                // Add shift details using the new parsing method
                const timeIn = parseTimeConsistently(row['Pay Date'], row['Time In']);
                const timeOut = parseTimeConsistently(row['Pay Date'], row['Time Out']);

                if (timeIn && timeOut) {
                    csvProcessedDataMap.get(fileNumber).shifts.push({
                        timeIn,
                        timeOut,
                        duration: parseFloat(row['Hours']),
                        shiftDate: row['Pay Date']
                    });
                }
            })
            .on('error', (error) => {
                console.error('CSV Parsing Error:', error);
                reject(error);
            })
            .on('end', () => {
                const result = Object.fromEntries(csvProcessedDataMap);
                resolve(result);
            });
    });
};

/**
 * Process shifts for a single driver with compliance checks
 * @param {Object} driverData - Driver's shift data
 * @returns {Object} Processed driver data with enhanced shift information
 */
function processDriverShifts(driverData, fileNumber) {
    if (!driverData.shifts || driverData.shifts.length === 0) {
        return {
            ...driverData,
            processedShifts: [],
            originalShifts: driverData.shifts || []
        };
    }

    const processedShifts = [];
    const sortedShifts = driverData.shifts.sort((a, b) => 
        new Date(a.shiftDate) - new Date(b.shiftDate)
    );

    sortedShifts.forEach((shift, index) => {
        if (processedShifts.length === 0) {
            // First shift processing
            processedShifts.push({
                timeIn: shift.timeIn,
                timeOut: shift.timeOut,
                duration: shift.duration,
                consecutiveDays: 1,
                restHoursFromLastShift: 20, // Initial assumed rest
                breaks: []
            });
        } else {
            const lastProcessedShift = processedShifts[processedShifts.length - 1];
            
            const hoursDifference = calculateHoursDifferenceBetween2Shifts(
                shift.timeIn,
                lastProcessedShift.timeOut, 
                fileNumber
            );

            

            

            if (hoursDifference < MIN_REST_BETWEEN_SHIFTS) {
                // Continuous shift or short break - merge/update last shift
                lastProcessedShift.breaks.push([
                    lastProcessedShift.timeOut, 
                    shift.timeIn
                ]);
                lastProcessedShift.timeOut = shift.timeOut;
                lastProcessedShift.duration = parseFloat(lastProcessedShift.duration) + parseFloat(shift.duration);
            } else if (hoursDifference >= MIN_REST_BETWEEN_SHIFTS && hoursDifference <= MAX_REST_BETWEEN_SHIFTS) {
                // Normal rest period between shifts
                processedShifts.push({
                    timeIn: shift.timeIn,
                    timeOut: shift.timeOut,
                    duration: shift.duration,
                    consecutiveDays: lastProcessedShift.consecutiveDays + 1,
                    restHoursFromLastShift: hoursDifference,
                    breaks: []
                });
            } else {
                // Extended rest period - reset consecutive days
                processedShifts.push({
                    timeIn: shift.timeIn,
                    timeOut: shift.timeOut,
                    duration: shift.duration,
                    consecutiveDays: 1,
                    restHoursFromLastShift: hoursDifference,
                    breaks: []
                });
            }
        }
    });

    const processedShiftsWith7DaysHours = calculateLast7DaysHours(processedShifts,fileNumber);

    // console.log(processedShiftsWith7DaysHours);

    return {
        ...driverData,
        processedShiftsWith7DaysHours,
        originalShifts: driverData.shifts
    };
}

/**
 * Process entire dataset with driver shift compliance checks
 * @param {Object} data - Raw driver data
 * @returns {Object} Processed data with compliance-checked shifts
 */
function processComplianceData(data) {
    const processedData = {};

    for (const [fileNumber, driverData] of Object.entries(data)) {
        processedData[fileNumber] = processDriverShifts(driverData, fileNumber);
    }

    

    return applyComplianceChecks(processedData);
}

function checkShiftCompliance(shift) {
    const complianceViolations = [];

    // Rule 1: Consecutive days check
    if (shift.consecutiveDays > 5) {
        complianceViolations.push({
            rule: 'Consecutive Days',
            description: `Exceeded maximum consecutive working days (${shift.consecutiveDays} > 5)`,
            severity: 'high'
        });
    }

    // Rule 2: Rest hours check
    if (shift.restHoursFromLastShift < 10) {
        complianceViolations.push({
            rule: 'Rest Hours',
            description: `Insufficient rest between shifts (${shift.restHoursFromLastShift.toFixed(2)} hours < 10 hours)`,
            severity: 'high'
        });
    }

    // Rule 3: Shift duration check
    const shiftDuration = (new Date(shift.timeOut) - new Date(shift.timeIn)) / (60 * 60 * 1000);
    if (shiftDuration > 14) {
        complianceViolations.push({
            rule: 'Shift Duration',
            description: `Shift duration exceeds 14 hours (${shiftDuration.toFixed(2)} hours)`,
            severity: 'high'
        });
    }

    // Rule 4: Last 7 days hours check
    if (shift.last7DaysHours > 60) {
        complianceViolations.push({
            rule: '7 Days Total Hours',
            description: `Total hours in last 7 days exceeds 60 hours (${shift.last7DaysHours.toFixed(2)} hours)`,
            severity: 'high'
        });
    }

    // Add compliance check result to the shift
    return {
        ...shift,
        complianceViolations,
        isCompliant: complianceViolations.length === 0
    };
}

function applyComplianceChecks(processedData) {
    const complianceCheckedData = {};

    for (const [fileNumber, driverData] of Object.entries(processedData)) {
        const processedShiftsWithCompliance = driverData.processedShiftsWith7DaysHours
            ? driverData.processedShiftsWith7DaysHours.map(checkShiftCompliance)
            : [];

        complianceCheckedData[fileNumber] = {
            ...driverData,
            processedShiftsWith7DaysHours: processedShiftsWithCompliance,
            hasComplianceViolations: processedShiftsWithCompliance.some(shift => !shift.isCompliant)
        };
    }

    return complianceCheckedData;
}

/**
 * Comprehensive processing pipeline
 * @param {string} filePath - Path to input CSV file
 * @returns {Promise<Object>} Fully processed and formatted compliance data
 */
async function processComplianceDataFromCSV(filePath) {
    try {
        // Process CSV
        const rawData = await exports.processCSV(filePath);
        
        // Process compliance checks
        const processedData = processComplianceData(rawData);
        
        // Format final output
        const formattedData = formatComplianceData(processedData);
        
        return formattedData;
    } catch (error) {
        console.error('Error processing compliance data:', error);
        throw error;
    }
}

// Export functions for potential external use
module.exports = {
    processComplianceData,
    processDriverShifts,
    calculateHoursDifferenceBetween2Shifts,
    parseTimeConsistently,
    adjustMidnightTime,
    formatComplianceData,
    processComplianceDataFromCSV,
    MIN_REST_BETWEEN_SHIFTS,
    MAX_REST_BETWEEN_SHIFTS
};