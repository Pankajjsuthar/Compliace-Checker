function renderComplianceView(data) {
    const results = document.getElementById('complianceView');
    const { compliance } = data;
    
    let html = `
        <div class="compliance-container">
            <div class="compliance-summary">
                <h3>Compliance Summary</h3>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h4>Consecutive Days Violations</h4>
                        <div class="violation-count">${compliance.shiftsList.filter(s => s.consecutiveDays > 7).length}</div>
                    </div>
                    <div class="metric-card">
                        <h4>Rest Hour Violations</h4>
                        <div class="violation-count">${compliance.shiftsList.filter(s => s.restHoursFromLastShift < 10).length}</div>
                    </div>
                </div>
            </div>

            <div class="violations-section">
                <h3>Detailed Violations</h3>
                
                <div class="violation-group">
                    <h4>Shifts with Breaks</h4>
                    <table class="violations-table">
                        <thead>
                            <tr>
                                <th>Driver Name</th>
                                <th>Time In</th>
                                <th>Time Out</th>
                                <th>Duration</th>
                                <th>Break Count</th>
                                <th>Consecutive Days</th>
                                <th>Rest Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${compliance.shiftsList.map(shift => `
                                <tr>
                                    <td>${shift.driverName}</td>
                                    <td>${new Date(shift.timeIn).toLocaleString()}</td>
                                    <td>${new Date(shift.timeOut).toLocaleString()}</td>
                                    <td>${shift.duration}</td>
                                    <td>${shift.breaks?.length || 0}</td>
                                    <td class="${shift.consecutiveDays > 7 ? 'violation' : ''}">${shift.consecutiveDays}</td>
                                    <td class="${shift.restHoursFromLastShift < 10 ? 'violation' : ''}">${shift.restHoursFromLastShift?.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    results.innerHTML = html;
}