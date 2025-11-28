/**
 * PDF Report Generator for Welding Sessions
 * Generates professional PDF reports for quality control and compliance
 */

import type { SessionData, WeldEvent } from './session-manager'

export class PDFGenerator {
  /**
   * Generate PDF report for a session
   * Returns a data URL that can be downloaded
   */
  static async generateSessionReport(session: SessionData): Promise<string> {
    // Create a new window for printing
    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) {
      throw new Error('Could not open print window. Please allow popups.')
    }

    const html = this.generateHTML(session)
    printWindow.document.write(html)
    printWindow.document.close()

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 500))

    // Trigger print dialog
    printWindow.print()

    return 'print-initiated'
  }

  /**
   * Generate HTML content for the report
   */
  private static generateHTML(session: SessionData): string {
    const duration = session.endTime 
      ? (session.endTime.getTime() - session.startTime.getTime()) / 60000 
      : 0

    const successRate = session.totalWelds > 0 
      ? ((session.successfulWelds / session.totalWelds) * 100).toFixed(1)
      : '0.0'

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welding Session Report - ${session.id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      color: #333;
      background: white;
    }
    
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #1e40af;
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .header .company {
      font-size: 18px;
      color: #64748b;
      font-weight: 500;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    .section h2 {
      color: #1e40af;
      font-size: 18px;
      margin-bottom: 15px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .info-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .info-value {
      font-size: 16px;
      color: #1e293b;
      font-weight: 500;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      text-align: center;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    
    thead {
      background: #f1f5f9;
    }
    
    th {
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      border-bottom: 2px solid #cbd5e1;
    }
    
    td {
      padding: 10px 12px;
      font-size: 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    tbody tr:hover {
      background: #f8fafc;
    }
    
    .success {
      color: #16a34a;
      font-weight: 600;
    }
    
    .failed {
      color: #dc2626;
      font-weight: 600;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
    
    .signature-line {
      margin-top: 40px;
      display: flex;
      justify-content: space-around;
    }
    
    .signature {
      text-align: center;
    }
    
    .signature-border {
      border-top: 1px solid #333;
      width: 200px;
      margin: 0 auto 5px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welding Session Report</h1>
    <div class="company">Aymed Medikal Teknoloji - Balloon Welding Machine</div>
  </div>
  
  <div class="section">
    <h2>Session Information</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Session ID</div>
        <div class="info-value">${session.id}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Status</div>
        <div class="info-value">${session.status.toUpperCase()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Operator</div>
        <div class="info-value">${session.operatorName || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Batch Number</div>
        <div class="info-value">${session.batchNumber || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Product Type</div>
        <div class="info-value">${session.productType || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Start Time</div>
        <div class="info-value">${this.formatDateTime(session.startTime)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">End Time</div>
        <div class="info-value">${session.endTime ? this.formatDateTime(session.endTime) : 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Duration</div>
        <div class="info-value">${duration.toFixed(1)} minutes</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2>Session Statistics</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${session.totalWelds}</div>
        <div class="stat-label">Total Welds</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #16a34a;">${session.successfulWelds}</div>
        <div class="stat-label">Successful</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #dc2626;">${session.failedWelds}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${successRate}%</div>
        <div class="stat-label">Success Rate</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2>Machine Configuration</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Operation Time</div>
        <div class="info-value">${session.config.opTime}s</div>
      </div>
      <div class="info-item">
        <div class="info-label">Cooling Time</div>
        <div class="info-value">${session.config.coTime}s</div>
      </div>
      <div class="info-item">
        <div class="info-label">Top Heater Threshold</div>
        <div class="info-value">${session.config.topTempThreshold}°C</div>
      </div>
      <div class="info-item">
        <div class="info-label">Bottom Heater Threshold</div>
        <div class="info-value">${session.config.bottomTempThreshold}°C</div>
      </div>
    </div>
  </div>
  
  ${this.generateWeldsTable(session.welds)}
  
  ${session.notes ? `
  <div class="section">
    <h2>Notes</h2>
    <p style="padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      ${session.notes}
    </p>
  </div>
  ` : ''}
  
  <div class="signature-line">
    <div class="signature">
      <div class="signature-border"></div>
      <div>Operator Signature</div>
    </div>
    <div class="signature">
      <div class="signature-border"></div>
      <div>Quality Control</div>
    </div>
    <div class="signature">
      <div class="signature-border"></div>
      <div>Supervisor</div>
    </div>
  </div>
  
  <div class="footer">
    <p>This report was generated automatically by Aymed Welding Control System</p>
    <p>Generated on ${this.formatDateTime(new Date())}</p>
  </div>
</body>
</html>
    `
  }

  /**
   * Generate welds table HTML
   */
  private static generateWeldsTable(welds: WeldEvent[]): string {
    if (welds.length === 0) {
      return `
      <div class="section">
        <h2>Weld Records</h2>
        <p style="padding: 20px; text-align: center; color: #64748b;">No welds recorded in this session</p>
      </div>
      `
    }

    const rows = welds.map((weld, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.formatTime(weld.timestamp)}</td>
        <td>${weld.duration.toFixed(1)}s</td>
        <td>${weld.topTemp.toFixed(1)}°C</td>
        <td>${weld.bottomTemp.toFixed(1)}°C</td>
        <td>${weld.voltage.toFixed(1)}V</td>
        <td>${weld.coolingTime.toFixed(1)}s</td>
        <td class="${weld.success ? 'success' : 'failed'}">
          ${weld.success ? '✓ PASS' : '✗ FAIL'}
        </td>
      </tr>
    `).join('')

    return `
    <div class="section">
      <h2>Weld Records (${welds.length} total)</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Time</th>
            <th>Duration</th>
            <th>Top Temp</th>
            <th>Bottom Temp</th>
            <th>Voltage</th>
            <th>Cooling</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
    `
  }

  /**
   * Format date and time
   */
  private static formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  /**
   * Format time only
   */
  private static formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  /**
   * Download session data as JSON
   */
  static downloadSessionJSON(session: SessionData): void {
    const json = JSON.stringify(session, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `${session.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
