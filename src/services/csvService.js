const csv = require('csv-parse');
const fs = require('fs');

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

                const combineDateAndTime = (dateStr, timeStr) => {
                    if (!dateStr || !timeStr) return null;
                
                    // Parse the date (MM/DD/YYYY format)
                    const [month, day, year] = dateStr.split('/');
                    
                    // Parse the time (handle AM/PM)
                    let [time, period] = timeStr.split(' ');
                    let [hours, minutes] = time.split(':');
                    
                    // Convert to 24-hour format
                    hours = parseInt(hours);
                    if (period === 'PM' && hours !== 12) {
                        hours += 12;
                    } else if (period === 'AM' && hours === 12) {
                        hours = 0;
                    }
                
                    // Create a new Date object using UTC to prevent timezone adjustments
                    const ans = new Date(Date.UTC(
                        parseInt(year),
                        parseInt(month) - 1,  // Subtract 1 from month
                        parseInt(day),
                        hours,
                        parseInt(minutes)
                    ));
                    return ans;
                };

                // Add shift details
                csvProcessedDataMap.get(fileNumber).shifts.push({
                    timeIn: combineDateAndTime(row['Pay Date'], row['Time In']),
                    timeOut: combineDateAndTime(row['Pay Date'], row['Time Out']),
                    duration: parseFloat(row['Hours']),
                    shiftDate: row['Pay Date']
                });
            })
            .on('error', (error) => {
                console.error('CSV Parsing Error:', error);
                reject(error);
            })
            .on('end', () => {
                // Convert Map to object and log it
                const result = Object.fromEntries(csvProcessedDataMap);
                // console.log('Processed Data:', JSON.stringify(result, null, 2));
                resolve(result);
            });
    });
};