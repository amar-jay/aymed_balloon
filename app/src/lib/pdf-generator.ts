/**
 * Professional PDF Report Generator for Welding Sessions
 * Generates well-designed, professional PDF reports with proper formatting,
 * company branding, and comprehensive session data visualization.
 */

import PDFDocument from 'pdfkit'
import fs from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { Session, Weld } from './types/session'

interface PDFOptions {
  filePath: string
  session: Session
}

/**
 * Creates a professional PDF report for a welding session
 */
export async function generateSessionPDF(options: PDFOptions): Promise<void> {
  const { filePath, session } = options

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Welding Session Report - ${session.id}`,
      Author: session.companyName,
      Subject: 'Welding Session Quality Report',
      Creator: 'Welding Machine Dashboard'
    }
  })

  const stream = fs.createWriteStream(filePath)
  doc.pipe(stream)

  // Colors
  const primaryColor = '#1a1a1a'
  const secondaryColor = '#4a5568'
  const accentColor = '#2563eb'
  const successColor = '#10b981'
  const errorColor = '#ef4444'
  const lightGray = '#f3f4f6'
  const borderColor = '#e5e7eb'

  // Helper function to add a horizontal line
  const addLine = (y: number, width = 500) => {
    doc
      .strokeColor(borderColor)
      .lineWidth(1)
      .moveTo(50, y)
      .lineTo(50 + width, y)
      .stroke()
  }

  // Helper function to add a section header
  const addSectionHeader = (text: string, y: number) => {
    doc
      .fontSize(16)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text(text, 50, y, { width: 500 })
    addLine(y + 25)
    return y + 40
  }

  // Helper function to add a key-value pair
  const addKeyValue = (
    key: string,
    value: string | number,
    x: number,
    y: number,
    width = 240
  ) => {
    doc
      .fontSize(9)
      .fillColor(secondaryColor)
      .font('Helvetica')
      .text(key, x, y, { width, continued: false })
    doc
      .fontSize(11)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text(String(value), x, y + 12, { width })
    return y + 35
  }

  // Page 1: Header and Overview
  let y = 50

  // Header with logo placeholder and company info
  doc
    .rect(50, y, 100, 100)
    .fillColor(lightGray)
    .fill()
    .strokeColor(borderColor)
    .lineWidth(2)
    .stroke()

  // Logo placeholder text
  doc
    .fontSize(10)
    .fillColor(secondaryColor)
    .font('Helvetica')
    .text('COMPANY', 55, y + 35, { width: 90, align: 'center' })
  doc
    .fontSize(8)
    .text('LOGO', 55, y + 50, { width: 90, align: 'center' })

  // Company and session info
  doc
    .fontSize(20)
    .fillColor(primaryColor)
    .font('Helvetica-Bold')
    .text(session.companyName || 'Company Name', 170, y + 10, { width: 380 })

  doc
    .fontSize(14)
    .fillColor(secondaryColor)
    .font('Helvetica')
    .text('Welding Session Quality Report', 170, y + 35, { width: 380 })

  doc
    .fontSize(10)
    .fillColor(secondaryColor)
    .text(`Report Generated: ${new Date().toLocaleString()}`, 170, y + 55, { width: 380 })

  // Status badge
  const isActive = !session.endSession
  const statusColor = isActive ? accentColor : successColor
  const statusText = isActive ? 'ACTIVE' : 'COMPLETED'
  doc
    .roundedRect(170, y + 70, 100, 20, 4)
    .fillColor(statusColor)
    .fill()
  doc
    .fontSize(9)
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .text(statusText, 170, y + 75, { width: 100, align: 'center' })

  y += 120
  addLine(y)
  y += 20

  // Session Information Section
  y = addSectionHeader('Session Information', y)

  // Left column
  let leftY = y
  leftY = addKeyValue('Session ID', `#${session.id}`, 50, leftY)
  leftY = addKeyValue('Operator Name', session.operatorName, 50, leftY)
  leftY = addKeyValue('Company Name', session.companyName, 50, leftY)

  // Right column
  let rightY = y
  rightY = addKeyValue(
    'Start Time',
    session.startSession ? new Date(session.startSession).toLocaleString() : 'N/A',
    310,
    rightY
  )
  rightY = addKeyValue(
    'End Time',
    session.endSession ? new Date(session.endSession).toLocaleString() : 'In Progress',
    310,
    rightY
  )
  rightY = addKeyValue(
    'Duration',
    session.startSession && session.endSession
      ? formatDuration(
          new Date(session.endSession).getTime() - new Date(session.startSession).getTime()
        )
      : session.startSession
        ? formatDuration(Date.now() - new Date(session.startSession).getTime())
        : 'N/A',
    310,
    rightY
  )

  y = Math.max(leftY, rightY) + 20

  // Performance Metrics Section
  y = addSectionHeader('Performance Metrics', y)

  // Metrics in a grid layout
  const metrics = [
    {
      label: 'Average Top Temperature',
      value: `${session.averageTopHeaterTemperature.toFixed(1)}°C`,
      icon: '🌡️'
    },
    {
      label: 'Average Bottom Temperature',
      value: `${session.averageBottomHeaterTemperature.toFixed(1)}°C`,
      icon: '🌡️'
    },
    {
      label: 'Average Voltage',
      value: `${session.averagePowerSupplyVoltage.toFixed(1)}V`,
      icon: '⚡'
    },
    {
      label: 'Total Welds',
      value: session.welds.length.toString(),
      icon: '🔧'
    }
  ]

  let metricY = y
  metrics.forEach((metric, index) => {
    const x = index % 2 === 0 ? 50 : 310
    if (index % 2 === 0 && index > 0) {
      metricY += 50
    }

    // Metric box
    doc
      .roundedRect(x, metricY, 240, 40, 4)
      .fillColor(lightGray)
      .fill()
      .strokeColor(borderColor)
      .lineWidth(1)
      .stroke()

    doc
      .fontSize(8)
      .fillColor(secondaryColor)
      .font('Helvetica')
      .text(metric.label, x + 10, metricY + 8, { width: 220 })

    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text(metric.value, x + 10, metricY + 20, { width: 220 })
  })

  metricY += 50
  y = metricY + 20

  // Success/Failure Statistics
  const totalWelds = session.welds.length
  const successCount = session.successCount || 0
  const failureCount = session.failureCount || 0
  const successRate = totalWelds > 0 ? ((successCount / totalWelds) * 100).toFixed(1) : '0.0'

  y = addSectionHeader('Quality Statistics', y)

  // Success section
  doc
    .roundedRect(50, y, 240, 60, 4)
    .fillColor('#f0fdf4')
    .fill()
    .strokeColor(successColor)
    .lineWidth(2)
    .stroke()

  doc
    .fontSize(10)
    .fillColor(secondaryColor)
    .font('Helvetica')
    .text('Successful Welds', 60, y + 10, { width: 220 })

  doc
    .fontSize(24)
    .fillColor(successColor)
    .font('Helvetica-Bold')
    .text(successCount.toString(), 60, y + 25, { width: 220 })

  doc
    .fontSize(9)
    .fillColor(secondaryColor)
    .font('Helvetica')
    .text(`${successRate}% success rate`, 60, y + 45, { width: 220 })

  // Failure section
  doc
    .roundedRect(310, y, 240, 60, 4)
    .fillColor('#fef2f2')
    .fill()
    .strokeColor(errorColor)
    .lineWidth(2)
    .stroke()

  doc
    .fontSize(10)
    .fillColor(secondaryColor)
    .font('Helvetica')
    .text('Failed Welds', 320, y + 10, { width: 220 })

  doc
    .fontSize(24)
    .fillColor(errorColor)
    .font('Helvetica-Bold')
    .text(failureCount.toString(), 320, y + 25, { width: 220 })

  const failureRate = totalWelds > 0 ? ((failureCount / totalWelds) * 100).toFixed(1) : '0.0'
  doc
    .fontSize(9)
    .fillColor(secondaryColor)
    .font('Helvetica')
    .text(`${failureRate}% failure rate`, 320, y + 45, { width: 220 })

  y += 80

  // Check if we need a new page for welds table
  if (y + 100 > 750) {
    doc.addPage()
    y = 50
  }

  // Welds Table Section
  y = addSectionHeader(`Weld Records (${totalWelds} total)`, y)

  if (totalWelds === 0) {
    doc
      .fontSize(11)
      .fillColor(secondaryColor)
      .font('Helvetica')
      .text('No welds recorded in this session.', 50, y, { width: 500 })
  } else {
    // Table header
    const headerY = y
    doc
      .rect(50, headerY, 500, 25)
      .fillColor(primaryColor)
      .fill()

    const headerColumns = [
      { text: '#', width: 30, x: 50 },
      { text: 'Top Temp', width: 70, x: 80 },
      { text: 'Bottom Temp', width: 80, x: 150 },
      { text: 'Voltage', width: 60, x: 230 },
      { text: 'Welding', width: 60, x: 290 },
      { text: 'Cooling', width: 60, x: 350 },
      { text: 'Status', width: 80, x: 410 },
      { text: 'Error', width: 140, x: 490 }
    ]

    headerColumns.forEach((col) => {
      doc
        .fontSize(8)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text(col.text, col.x + 5, headerY + 8, { width: col.width - 10 })
    })

    y += 25

    // Table rows
    session.welds.forEach((weld, index) => {
      // Check if we need a new page
      if (y + 30 > 750) {
        doc.addPage()
        y = 50
        // Redraw header on new page
        doc
          .rect(50, y, 500, 25)
          .fillColor(primaryColor)
          .fill()
        headerColumns.forEach((col) => {
          doc
            .fontSize(8)
            .fillColor('#ffffff')
            .font('Helvetica-Bold')
            .text(col.text, col.x + 5, y + 8, { width: col.width - 10 })
        })
        y += 25
      }

      // Row background (alternating)
      if (index % 2 === 0) {
        doc
          .rect(50, y, 500, 25)
          .fillColor(lightGray)
          .fill()
      }

      // Row border
      doc
        .rect(50, y, 500, 25)
        .strokeColor(borderColor)
        .lineWidth(0.5)
        .stroke()

      // Row data
      const rowData = [
        { text: String(index + 1), x: 50 },
        { text: `${weld.topHeaterTemperature}°C`, x: 80 },
        { text: `${weld.bottomHeaterTemperature}°C`, x: 150 },
        { text: `${weld.powerSupplyVoltage}V`, x: 230 },
        { text: `${weld.weldingDuration}s`, x: 290 },
        { text: `${weld.coolingDuration}s`, x: 350 },
        {
          text: weld.isSuccessful ? '✓ Success' : '✗ Failed',
          x: 410,
          color: weld.isSuccessful ? successColor : errorColor
        },
        {
          text: weld.error || '—',
          x: 490,
          color: weld.error ? errorColor : secondaryColor
        }
      ]

      rowData.forEach((cell) => {
        doc
          .fontSize(9)
          .fillColor(cell.color || primaryColor)
          .font(cell.text.startsWith('✓') || cell.text.startsWith('✗') ? 'Helvetica-Bold' : 'Helvetica')
          .text(cell.text, cell.x + 5, y + 8, { width: headerColumns.find((c) => c.x === cell.x)?.width || 60 })
      })

      y += 25
    })
  }

  // Footer on last page
  const pageCount = doc.bufferedPageRange().count
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i)
    const pageHeight = doc.page.height
    const pageWidth = doc.page.width

    // Footer line
    doc
      .strokeColor(borderColor)
      .lineWidth(0.5)
      .moveTo(50, pageHeight - 40)
      .lineTo(pageWidth - 50, pageHeight - 40)
      .stroke()

    // Footer text
    doc
      .fontSize(8)
      .fillColor(secondaryColor)
      .font('Helvetica')
      .text(
        `Session Report - ${session.companyName} | Page ${i + 1} of ${pageCount}`,
        50,
        pageHeight - 30,
        { width: pageWidth - 100, align: 'center' }
      )

    doc
      .fontSize(7)
      .fillColor(secondaryColor)
      .text(
        `Generated on ${new Date().toLocaleString()} | Session ID: ${session.id}`,
        50,
        pageHeight - 20,
        { width: pageWidth - 100, align: 'center' }
      )
  }

  doc.end()

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve())
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

