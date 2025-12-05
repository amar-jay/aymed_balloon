/**
 * Professional PDF Report Generator for Welding Sessions
 * Generates well-designed, professional PDF reports with proper formatting,
 * company branding, and comprehensive session data visualization.
 */

import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { Session } from './types/session'

interface PDFOptions {
  filePath: string
  session: Session
}

// --- Theme Configuration ---
const THEME = {
  colors: {
    primary: '#1e293b', // Slate 800
    secondary: '#64748b', // Slate 500
    accent: '#3b82f6', // Blue 500
    success: '#059669', // Emerald 600
    successBg: '#d1fae5', // Emerald 100
    error: '#dc2626', // Red 600
    errorBg: '#fee2e2', // Red 100
    border: '#e2e8f0', // Slate 200
    tableHeader: '#f8fafc', // Slate 50
    zebra: '#f9fafb', // Gray 50
    white: '#ffffff'
  },
  fonts: {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    times: 'Times-Bold'
  },
  layout: {
    margin: 50,
    width: 595.28, // A4 width
    contentWidth: 495.28 // Width - 2*margin
  }
}

export async function generateSessionPDF(options: PDFOptions): Promise<void> {
  const { filePath, session } = options

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: THEME.layout.margin,
      info: {
        Title: `Session Report #${session.id}`,
        Author: session.companyName
      }
    })

    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    // --- Helper Functions ---

    // Draw a divider line
    const drawDivider = (y: number) => {
      doc
        .strokeColor(THEME.colors.border)
        .lineWidth(1)
        .moveTo(THEME.layout.margin, y)
        .lineTo(THEME.layout.width - THEME.layout.margin, y)
        .stroke()
    }

    // Draw a Status Badge (Pill)
    const drawStatusBadge = (
      text: string,
      x: number,
      y: number,
      type: 'success' | 'error' | 'neutral'
    ) => {
      const width = 60
      const height = 16
      let bgColor = THEME.colors.border
      let textColor = THEME.colors.secondary

      if (type === 'success') {
        bgColor = THEME.colors.successBg
        textColor = THEME.colors.success
      } else if (type === 'error') {
        bgColor = THEME.colors.errorBg
        textColor = THEME.colors.error
      }

      // Save state
      doc.save()

      doc.roundedRect(x, y, width, height, 8).fill(bgColor)
      doc
        .fillColor(textColor)
        .font(THEME.fonts.bold)
        .fontSize(8)
        .text(text.toUpperCase(), x, y + 4, { width, align: 'center' })

      // Restore state to prevent font/color bleeding
      doc.restore()
    }

    // Draw a Clean Stat Item (Minimalist Design)
    const drawStatItem = (x: number, y: number, label: string, value: string, subtext?: string) => {
      const width = 115

      // Label
      doc
        .fillColor(THEME.colors.secondary)
        .font(THEME.fonts.bold)
        .fontSize(8)
        .text(label.toUpperCase(), x, y, { width, align: 'left' })

      // Value
      doc
        .fillColor(THEME.colors.primary)
        .font(THEME.fonts.times)
        .fontSize(14)
        .text(value, x, y + 15, { width, align: 'left' })

      // Subtext (if any)
      if (subtext) {
        doc
          .fillColor(THEME.colors.secondary)
          .fontSize(7)
          .font(THEME.fonts.regular)
          .text(subtext, x, y + 40, { width, align: 'left' })
      }

      // Optional: Vertical Divider to the right (except for last item, logic handled by caller if needed)
      // For now, we rely on whitespace
    }

    // --- Document Content ---

    let currentY = 50

    // 1. HEADER SECTION
    // -----------------

    // Company Name (Small top label)
    doc
      .fontSize(14)
      .fillColor(THEME.colors.accent)
      .font(THEME.fonts.times)
      .text(session.companyName.toUpperCase(), THEME.layout.margin, currentY)

    currentY += 15

    // Report Title
    doc
      .fontSize(20)
      .font(THEME.fonts.times)
      .fillColor(THEME.colors.primary)
      .text('Welding Session Report')

    // Company Logo next to title
    try {
      const logoPath = path.join(__dirname, '../../resources/logo.jpeg')
      if (fs.existsSync(logoPath)) {
        const logoWidth = 60
        const logoHeight = 60
        doc.image(logoPath, THEME.layout.width - THEME.layout.margin - logoWidth, 40, {
          width: logoWidth,
          height: logoHeight,
          fit: [logoWidth, logoHeight],
          align: 'center'
        })
      }
    } catch (err) {
      // If logo fails to load, show session ID as fallback
      const idText = `#${session.id || 'N/A'}`
      const idWidth = doc.widthOfString(idText) + 20
      doc
        .roundedRect(THEME.layout.width - THEME.layout.margin - idWidth, 55, idWidth, 24, 4)
        .fill(THEME.colors.primary)
      doc
        .fillColor(THEME.colors.white)
        .fontSize(12)
        .text(idText, THEME.layout.width - THEME.layout.margin - idWidth, 61, {
          width: idWidth,
          align: 'center'
        })
    }

    currentY += 20

    // Meta Data Row
    doc.fontSize(10).font(THEME.fonts.regular).fillColor(THEME.colors.secondary)

    const dateStr = new Date(session.startSession).toLocaleDateString()
    const timeStr = new Date(session.startSession).toLocaleTimeString()
    doc.text(
      `Date: ${dateStr} • Time: ${timeStr} • Operator: ${session.operatorName}`,
      THEME.layout.margin,
      currentY
    )

    currentY += 20
    drawDivider(currentY)
    currentY += 20

    // 2. KPI OVERVIEW SECTION
    // -----------------------

    doc
      .fontSize(12)
      .font(THEME.fonts.bold)
      .fillColor(THEME.colors.primary)
      .text('Performance', THEME.layout.margin, currentY)

    currentY += 20

    // Calculate rates
    const total = session.welds ? session.welds.length : 0
    const successRate = total > 0 ? ((session.successCount / total) * 100).toFixed(1) : '0'
    const durationMs = session.endSession
      ? new Date(session.endSession).getTime() - new Date(session.startSession).getTime()
      : 0
    const durationMin = Math.floor(durationMs / 60000)

    // Draw 4 items across
    const startX = THEME.layout.margin

    drawStatItem(
      startX,
      currentY,
      'Success Rate',
      `${successRate}%`,
      `${session.successCount} passed / ${session.failureCount} failed`
    )
    drawStatItem(
      startX + 125,
      currentY,
      'Avg Top Temp',
      `${session.averageTopHeaterTemperature.toFixed(0)}°C`,
      'Target: 200°C'
    )
    drawStatItem(
      startX + 250,
      currentY,
      'Avg Bottom Temp',
      `${session.averageBottomHeaterTemperature.toFixed(0)}°C`,
      'Target: 200°C'
    )
    drawStatItem(startX + 375, currentY, 'Duration', `${durationMin} min`, 'Total Session Time')

    currentY += 50 // Reduced spacing as cards are gone
    drawDivider(currentY)
    currentY += 40

    // 3. WELD LOG TABLE
    // -----------------

    doc
      .fontSize(12)
      .font(THEME.fonts.bold)
      .fillColor(THEME.colors.primary)
      .text(`Weld Log (${total} records)`, THEME.layout.margin, currentY)

    currentY += 20

    // Table Configuration
    const colWidths = [15, 60, 60, 60, 60, 80, 180] // Total should be ~495
    const columns = [
      { header: '#', align: 'left' },
      { header: 'Top Temp', align: 'right' },
      { header: 'Bot Temp', align: 'right' },
      { header: 'Volt', align: 'right' },
      { header: 'Time', align: 'right' },
      { header: 'Status', align: 'center' },
      { header: 'Note', align: 'left' }
    ] as const

    const rowHeight = 25
    const startTableX = THEME.layout.margin

    // Draw Table Header
    const drawTableHeader = (y: number) => {
      doc.rect(startTableX, y, THEME.layout.contentWidth, 20).fill(THEME.colors.tableHeader)

      let currentX = startTableX
      doc.fillColor(THEME.colors.secondary).font(THEME.fonts.bold).fontSize(8)

      columns.forEach((col, i) => {
        // Adjust text position for padding
        const textX = col.align === 'right' ? currentX - 5 : currentX + 5
        const align = col.align as any

        doc.text(col.header.toUpperCase(), currentX, y + 6, {
          width: colWidths[i],
          align: align
        })
        currentX += colWidths[i]
      })

      // Bottom border of header
      doc
        .strokeColor(THEME.colors.border)
        .lineWidth(1)
        .moveTo(startTableX, y + 20)
        .lineTo(THEME.layout.width - THEME.layout.margin, y + 20)
        .stroke()

      return y + 20
    }

    currentY = drawTableHeader(currentY)

    // Draw Table Rows
    // Safety check: ensure welds is an array
    if (session.welds && Array.isArray(session.welds)) {
      session.welds.forEach((weld, index) => {
        if (!weld) return // Skip if undefined

        // Check pagination
        if (currentY > doc.page.height - 50) {
          doc.addPage()
          currentY = 50 // Reset top margin
          currentY = drawTableHeader(currentY) // Redraw header
        }

        // Zebra striping
        if (index % 2 === 0) {
          doc
            .rect(startTableX, currentY, THEME.layout.contentWidth, rowHeight)
            .fill(THEME.colors.zebra)
        }

        // Safe Error Message Handling
        let errorMsg = '-'
        if (weld.error) {
          const strError = String(weld.error)
          errorMsg = strError.length > 50 ? strError.substring(0, 50) + '...' : strError
        }

        // Prepare Row Data
        const rowData = [
          (index + 1).toString(),
          `${weld.topHeaterTemperature.toFixed(2)}°C`,
          `${weld.bottomHeaterTemperature.toFixed(2)}°C`,
          `${weld.powerSupplyVoltage.toFixed(2)}V`,
          `${weld.weldingDuration}s`,
          '', // Status handled specially
          errorMsg
        ]

        // Draw Text Columns
        let currentX = startTableX

        rowData.forEach((text, i) => {
          // IMPORTANT: Reset font settings for every cell to prevent bleeding from previous cells
          doc.fillColor(THEME.colors.primary).font(THEME.fonts.regular).fontSize(9)

          if (i === 5) {
            // Status Column Special Handling
            const status = weld.isSuccessful ? 'success' : 'error'
            const label = weld.isSuccessful ? 'PASS' : 'FAIL'
            const badgeX = currentX + (colWidths[i] - 60) / 2
            drawStatusBadge(label, badgeX, currentY + 4, status)
          } else {
            const align = columns[i].align as any

            // Highlight errors in red text for Note column
            if (i === 6 && text !== '-') doc.fillColor(THEME.colors.error)

            doc.text(text, currentX, currentY + 8, {
              width: colWidths[i],
              align: align
            })
          }
          currentX += colWidths[i]
        })

        // Bottom border for row
        doc
          .strokeColor(THEME.colors.border)
          .lineWidth(0.5)
          .moveTo(startTableX, currentY + rowHeight)
          .lineTo(THEME.layout.width - THEME.layout.margin, currentY + rowHeight)
          .stroke()

        currentY += rowHeight
      })
    }

    // 4. FOOTER
    // ---------
    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)

      // Footer Line
      doc
        .strokeColor(THEME.colors.border)
        .lineWidth(1)
        .moveTo(THEME.layout.margin, doc.page.height - 40)
        .lineTo(THEME.layout.width - THEME.layout.margin, doc.page.height - 40)
        .stroke()

      // Footer Text
      doc
        .fontSize(8)
        .fillColor(THEME.colors.secondary)
        .text(
          `Generated by Aymed Medikal Teknoloji • ${new Date().toISOString()}`,
          THEME.layout.margin,
          doc.page.height - 30
        )

      doc.text(
        `Page ${i + 1} of ${range.count}`,
        THEME.layout.width - THEME.layout.margin - 50,
        doc.page.height - 30,
        { align: 'right', width: 50 }
      )
    }

    doc.end()

    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}

/**
 * Formats duration in milliseconds to a human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}
