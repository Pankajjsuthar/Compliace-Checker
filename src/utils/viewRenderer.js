function renderNormalView(data) {
    const results = document.getElementById('normalView');
    let tableHTML = `
        <table class="driver-list">
            <thead>
                <tr>
                    <th>File Number</th>
                    <th>Name</th>
                    <th>Company Code</th>
                    <th>Job Title</th>
                    <th>Department</th>
                    <th>Department ID</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const [fileNumber, driverData] of Object.entries(data.data)) {
        const shiftsTable = `
            <tr class="shifts-section" id="shifts-${fileNumber}">
                <td colspan="6">
                    <table class="shifts-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Time In</th>
                                <th>Time Out</th>
                                <th>Duration (Hours)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${driverData.shifts.map(shift => `
                                <tr>
                                    <td>${shift.shiftDate}</td>
                                    <td>${new Date(shift.timeIn).toLocaleString()}</td>
                                    <td>${new Date(shift.timeOut).toLocaleString()}</td>
                                    <td>${shift.duration}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </td>
            </tr>
        `;

        tableHTML += `
            <tr class="driver-row" data-file-number="${fileNumber}">
                <td>${fileNumber}</td>
                <td>${driverData.firstName} ${driverData.lastName}</td>
                <td>${driverData.companyCode}</td>
                <td>${driverData.jobTitle}</td>
                <td>${driverData.timeCardWorkDept}</td>
                <td>${driverData.workedDeptID}</td>
            </tr>
            ${shiftsTable}
        `;
    }

    tableHTML += '</tbody></table>';
    results.innerHTML = tableHTML;

    // Add click handlers
    document.querySelectorAll('.driver-row').forEach(row => {
        row.addEventListener('click', function() {
            const fileNumber = this.getAttribute('data-file-number');
            const shiftsRow = document.getElementById(`shifts-${fileNumber}`);
            const wasVisible = shiftsRow.style.display === 'table-row';
            
            document.querySelectorAll('.shifts-section').forEach(section => {
                section.style.display = 'none';
            });
            document.querySelectorAll('.driver-row').forEach(r => {
                r.classList.remove('active-row');
            });

            if (!wasVisible) {
                shiftsRow.style.display = 'table-row';
                this.classList.add('active-row');
            }
        });
    });
}