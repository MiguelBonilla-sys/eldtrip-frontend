import { useEffect, useRef, useState } from 'react'
import './LogSheet.css'

const ROW_LABELS = ['Off Duty', 'Sleeper Berth', 'Driving', 'On Duty Not Driving']
const ROW_KEYS = ['off_duty', 'sleeper', 'driving', 'on_duty']
const ROW_COLORS = {
  off_duty: '#e8f5e9',
  sleeper: '#fff3e0',
  driving: '#e3f2fd',
  on_duty: '#fce4ec',
}

const W = 960
const H = 620
const HEADER_H = 120
const GRID_LEFT = 90
const GRID_RIGHT = W - 20
const GRID_W = GRID_RIGHT - GRID_LEFT
const GRID_TOP = HEADER_H + 20
const ROW_H = 45
const GRID_H = ROW_H * 4
const GRID_BOTTOM = GRID_TOP + GRID_H
const TOTALS_Y = GRID_BOTTOM + 30

const ROW_Y = ROW_KEYS.reduce((acc, key, i) => {
  acc[key] = GRID_TOP + i * ROW_H + ROW_H / 2
  return acc
}, {})

function timeToX(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const dec = h + m / 60
  return GRID_LEFT + (dec / 24) * GRID_W
}

function drawGrid(ctx) {
  ROW_KEYS.forEach((key, i) => {
    const y = GRID_TOP + i * ROW_H
    ctx.fillStyle = ROW_COLORS[key]
    ctx.fillRect(GRID_LEFT, y, GRID_W, ROW_H)
  })

  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = GRID_TOP + i * ROW_H
    ctx.beginPath()
    ctx.moveTo(GRID_LEFT, y)
    ctx.lineTo(GRID_RIGHT, y)
    ctx.stroke()
  }

  for (let h = 0; h <= 24; h++) {
    const x = GRID_LEFT + (h / 24) * GRID_W
    const isMidnight = h === 0 || h === 24
    const isNoon = h === 12
    ctx.strokeStyle = isMidnight || isNoon ? '#333' : '#ccc'
    ctx.lineWidth = isMidnight || isNoon ? 2 : 0.8
    ctx.beginPath()
    ctx.moveTo(x, GRID_TOP)
    ctx.lineTo(x, GRID_BOTTOM)
    ctx.stroke()

    if (h < 24) {
      for (let q = 1; q <= 3; q++) {
        const qx = x + (q / 4) * (GRID_W / 24)
        ctx.strokeStyle = '#ddd'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(qx, GRID_BOTTOM - 8)
        ctx.lineTo(qx, GRID_BOTTOM)
        ctx.stroke()
      }
    }

    if (h >= 0 && h < 24) {
      ctx.fillStyle = '#333'
      ctx.font = '700 10px "IBM Plex Mono", monospace'
      ctx.textAlign = 'center'
      const label = h === 0 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`
      ctx.fillText(label, x, GRID_BOTTOM + 12)
    }
  }
}

function drawRowLabels(ctx) {
  ctx.font = '700 11px "IBM Plex Mono", monospace'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#222'
  ROW_KEYS.forEach((key, i) => {
    const y = GRID_TOP + i * ROW_H + ROW_H / 2 + 4
    ctx.fillText(ROW_LABELS[i], GRID_LEFT - 8, y)
  })
}

function drawSegments(ctx, segments) {
  if (!segments || segments.length === 0) return

  const segmentColors = {
    off_duty: '#2e7d32',
    sleeper: '#e65100',
    driving: '#1565c0',
    on_duty: '#c2185b',
  }

  let prevKey = null
  let prevX = null
  let prevY = null

  for (const seg of segments) {
    const key = seg.status
    if (!ROW_KEYS.includes(key)) continue

    const x1 = timeToX(seg.start)
    const x2 = timeToX(seg.end <= seg.start ? '23:59' : seg.end)
    const y = ROW_Y[key]

    if (prevKey !== null && prevKey !== key && prevY !== null) {
      ctx.strokeStyle = '#555'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(prevX ?? x1, prevY)
      ctx.lineTo(x1, y)
      ctx.stroke()
    }

    ctx.strokeStyle = segmentColors[key]
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x1, y)
    ctx.lineTo(x2, y)
    ctx.stroke()

    if (key === 'on_duty') {
      ctx.strokeStyle = '#555'
      ctx.lineWidth = 1.5
      const bracketW = 6
      ctx.beginPath()
      ctx.moveTo(x1 - bracketW, y - 8)
      ctx.lineTo(x1 - bracketW, y)
      ctx.lineTo(x1, y)
      ctx.stroke()
    }

    prevKey = key
    prevX = x2
    prevY = y
  }
}

function drawHeader(ctx, logData, dayNumber, totalDays) {
  ctx.fillStyle = '#1565c0'
  ctx.fillRect(0, 0, W, 35)

  ctx.fillStyle = '#fff'
  ctx.font = '700 18px "Sora", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('FMCSA Electronic Logging Device (ELD) Daily Log', 10, 24)

  ctx.strokeStyle = '#1565c0'
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, W, 35)

  ctx.fillStyle = '#111'
  ctx.font = '700 12px "Source Sans 3", sans-serif'
  ctx.textAlign = 'left'
  let infoY = 50

  ctx.fillText(`Date: ${logData.date}`, 10, infoY)
  ctx.fillText(`Day ${dayNumber} of ${totalDays}`, 250, infoY)
  ctx.fillText(`Driver Start Time: ${logData.driver_start_time}`, 400, infoY)

  infoY += 18
  ctx.font = '500 11px "Source Sans 3", sans-serif'
  ctx.fillStyle = '#333'
  ctx.fillText(`Miles Today: ${logData.miles_today} mi`, 10, infoY)

  ctx.font = '700 10px "IBM Plex Mono", monospace'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#555'
  ctx.fillText('Daily Totals:', W - 10, 50)

  const totalsPreview = logData.totals
  let previewY = 62
  const labelColor = {
    off_duty: '#2e7d32',
    sleeper: '#e65100',
    driving: '#1565c0',
    on_duty: '#c2185b',
  }

  Object.entries(totalsPreview).forEach(([key, value]) => {
    ctx.fillStyle = labelColor[key]
    ctx.fillText(`${ROW_LABELS[ROW_KEYS.indexOf(key)]}: ${value.toFixed(2)}h`, W - 10, previewY)
    previewY += 12
  })

  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1)
}

function drawTotals(ctx, totals) {
  const labels = {
    off_duty: 'Off Duty',
    sleeper: 'Sleeper',
    driving: 'Driving',
    on_duty: 'On Duty',
  }
  const colors = {
    off_duty: '#2e7d32',
    sleeper: '#e65100',
    driving: '#1565c0',
    on_duty: '#c2185b',
  }

  let x = GRID_LEFT
  const colW = GRID_W / 4
  const boxH = 50
  const boxY = TOTALS_Y - 15

  Object.entries(labels).forEach(([key, label], i) => {
    const cx = x + colW * i
    const boxX = cx
    const color = colors[key]

    ctx.fillStyle = color
    ctx.globalAlpha = 0.1
    ctx.fillRect(boxX + 2, boxY, colW - 4, boxH)
    ctx.globalAlpha = 1

    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.strokeRect(boxX + 2, boxY, colW - 4, boxH)

    ctx.fillStyle = '#333'
    ctx.font = '700 11px "IBM Plex Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(label, boxX + colW / 2, boxY + 16)

    ctx.fillStyle = color
    ctx.font = '700 18px "Sora", sans-serif'
    ctx.fillText(`${(totals[key] || 0).toFixed(2)}`, boxX + colW / 2, boxY + 38)

    ctx.fillStyle = '#555'
    ctx.font = '500 10px "IBM Plex Mono", monospace'
    ctx.fillText('hours', boxX + colW / 2, boxY + 48)
  })
}

export default function LogSheet({ logData, dayNumber, totalDays, disablePrinting = false }) {
  const canvasRef = useRef(null)
  const [printError, setPrintError] = useState('')

  const totalsSummary =
    `Day ${dayNumber} of ${totalDays}. ` +
    `Off duty ${Number(logData.totals.off_duty || 0).toFixed(2)} hours, ` +
    `sleeper ${Number(logData.totals.sleeper || 0).toFixed(2)} hours, ` +
    `driving ${Number(logData.totals.driving || 0).toFixed(2)} hours, ` +
    `on duty ${Number(logData.totals.on_duty || 0).toFixed(2)} hours.`

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !logData) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, W, H)

    drawHeader(ctx, logData, dayNumber, totalDays)
    drawRowLabels(ctx)
    drawGrid(ctx)
    drawSegments(ctx, logData.segments)
    drawTotals(ctx, logData.totals)
  }, [logData, dayNumber, totalDays])

  function handlePrint() {
    if (disablePrinting) return

    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png', 1.0)
    const win = window.open('', '_blank', 'noopener,noreferrer')

    if (!win) {
      setPrintError('Print window was blocked by your browser. Allow popups and try again.')
      return
    }

    setPrintError('')

    const pageTitle = `ELD Daily Log - ${logData.date} - Day ${dayNumber} of ${totalDays}`
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${pageTitle}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
              background: #f5f5f5;
              padding: 10px;
            }
            .container {
              background: white;
              max-width: 1000px;
              margin: 0 auto;
              padding: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            img {
              width: 100%;
              height: auto;
              display: block;
              border: 1px solid #ddd;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 11px;
              color: #666;
              padding: 10px;
              border-top: 1px solid #ddd;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .container {
                max-width: 100%;
                margin: 0;
                padding: 0;
                box-shadow: none;
              }
              .footer {
                display: none;
              }
              img {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${dataUrl}" alt="${pageTitle}">
            <div class="footer">
              Printed: ${new Date().toLocaleString()} | Page ${dayNumber} of ${totalDays}
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 500);
              }, 300);
            }
          </script>
        </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <div className="log-sheet">
      <div className="log-sheet__header">
        <h3 className="log-sheet__title">Day {dayNumber} of {totalDays}</h3>
        <button
          className="log-sheet__print-btn"
          onClick={handlePrint}
          title={
            disablePrinting
              ? 'Printing is disabled until route recalculation succeeds.'
              : 'Click to print this daily log sheet'
          }
          disabled={disablePrinting}
        >
          Print Day {dayNumber}
        </button>
      </div>

      {disablePrinting && (
        <p className="log-sheet__print-note no-print" role="status">
          Printing is locked while the latest route recalculation remains unresolved.
        </p>
      )}

      {printError && (
        <p className="log-sheet__print-error no-print" role="alert">
          {printError}
        </p>
      )}

      <canvas ref={canvasRef} className="log-sheet__canvas" />
      <p className="sr-only">{totalsSummary}</p>
    </div>
  )
}
