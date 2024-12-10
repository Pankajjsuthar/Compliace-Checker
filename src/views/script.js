document.getElementById("uploadForm").onsubmit = async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const loading = document.getElementById("loading");
  const results = document.getElementById("results");

  try {
    loading.style.display = "block";
    results.innerHTML = "";

    // Correct way to send FormData with Axios
    const response = await axios.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    // Directly use response.data instead of response.json()
    const { data } = response.data;

    console.log(response);

    // Process data with compliance checks
    const processedData = data.complianceData;

    console.log(processedData);

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
                        <th>Compliance Status</th>
                    </tr>
                </thead>
                <tbody>
            `;

    for (const [fileNumber, driverData] of Object.entries(processedData)) {
      // Processed shifts table with compliance violations
      const processedShiftsTable = driverData.processedShiftsWith7DaysHours
        ? `
                    <tr class="shifts-section" id="shifts-processed-${fileNumber}">
                        <td colspan="7">
                            <h4>Processed Shifts (Compliance Check)</h4>
                            <table class="shifts-table">
                                <thead>
                                    <tr>
                                        <th>Time In</th>
                                        <th>Time Out</th>
                                        <th>Duration</th>
                                        <th>Consecutive Days</th>
                                        <th>Last 7 Days Hours</th>
                                        <th>Rest Hours</th>
                                        <th>Breaks</th>
                                        <th>Compliance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${driverData.processedShiftsWith7DaysHours
                                      .map(
                                        (shift) => `
                                            <tr class="${
                                              shift.isCompliant
                                                ? ""
                                                : "compliance-violation"
                                            }">
                                                <td>${shift.timeIn}</td>
                                                <td>${shift.timeOut}</td>
                                                <td>${shift.duration}</td>
                                                <td>${
                                                  shift.consecutiveDays
                                                }</td>
                                                <td>${shift.last7DaysHours}</td>
                                                <td>${shift.restHoursFromLastShift.toFixed(
                                                  2
                                                )}</td>
                                                <td>${
                                                  shift.breaks.length > 0
                                                    ? shift.breaks
                                                        .map((brk) =>
                                                          brk.join(" - ")
                                                        )
                                                        .join(", ")
                                                    : "No breaks"
                                                }</td>
                                                <td>
                                                    ${
                                                      shift.isCompliant
                                                        ? "Compliant"
                                                        : `
                                                            <details>
                                                                <summary>Violation</summary>
                                                                <ul>
                                                                    ${shift.complianceViolations
                                                                      .map(
                                                                        (
                                                                          violation
                                                                        ) => `
                                                                            <li>
                                                                                <strong>${violation.rule}:</strong> 
                                                                                ${violation.description}
                                                                            </li>
                                                                        `
                                                                      )
                                                                      .join("")}
                                                                </ul>
                                                            </details>
                                                        `
                                                    }
                                                </td>
                                            </tr>
                                        `
                                      )
                                      .join("")}
                                </tbody>
                            </table>
                        </td>
                    </tr>
                `
        : "";

      // Add driver row with compliance status
      tableHTML += `
                <tr class="driver-row ${
                  driverData.hasComplianceViolations ? "driver-violation" : ""
                }" data-file-number="${fileNumber}">
                    <td>${fileNumber}</td>
                    <td>${driverData.firstName} ${driverData.lastName}</td>
                    <td>${driverData.companyCode}</td>
                    <td>${driverData.jobTitle}</td>
                    <td>${driverData.timeCardWorkDept}</td>
                    <td>${driverData.workedDeptID || "N/A"}</td>
                    <td>
                        ${
                          driverData.hasComplianceViolations
                            ? `<span class="violation-badge">Violations Detected</span>`
                            : `<span class="compliant-badge">Compliant</span>`
                        }
                    </td>
                </tr>
                ${processedShiftsTable}
            `;
    }

    tableHTML += "</tbody></table>";
    results.innerHTML = tableHTML;

    // CSS for highlighting
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .compliance-violation {
        background-color: #ffdddd;
      }
      .driver-violation {
        background-color: #ffcccc;
      }
      .violation-badge {
        color: red;
        font-weight: bold;
      }
      .compliant-badge {
        color: green;
        font-weight: bold;
      }
      details {
        cursor: pointer;
      }
      details > summary {
        color: red;
        font-weight: bold;
      }
      details > ul {
        background-color: #fff0f0;
        padding: 10px;
        border-radius: 5px;
      }
      .active-row {
        background-color: #e0e0e0;
      }
    `;
    document.head.appendChild(styleElement);

    // Add click handlers for expanding/collapsing shifts with toggle functionality
    document.querySelectorAll(".driver-row").forEach((row) => {
      row.addEventListener("click", function () {
        const fileNumber = this.getAttribute("data-file-number");
        const processedShiftsRow = document.getElementById(
          `shifts-processed-${fileNumber}`
        );

        // Check if this row is already active
        const isCurrentRowActive = this.classList.contains("active-row");

        // Hide all shift sections and remove active class
        document.querySelectorAll(".shifts-section").forEach((section) => {
          section.style.display = "none";
        });
        document.querySelectorAll(".driver-row").forEach((r) => {
          r.classList.remove("active-row");
        });

        // If the clicked row was not previously active, show its shifts
        if (!isCurrentRowActive && processedShiftsRow) {
          processedShiftsRow.style.display = "table-row";
          this.classList.add("active-row");
        }
      });
    });
  } catch (error) {
    console.error("Full error:", error);
    results.innerHTML = `<div class="error">Error: ${
      error.response ? error.response.data : error.message
    }</div>`;
  } finally {
    loading.style.display = "none";
  }
};