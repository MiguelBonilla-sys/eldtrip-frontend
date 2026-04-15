import { useEffect, useRef } from 'react'
import './LogSheet.css'

const ROW_LABELS = ['Off Duty', 'Sleeper Berth', 'Driving', 'On Duty Not Driving']
const ROW_KEYS = ['off_duty', 'sleeper', 'driving', 'on_duty']

// Canvas layout constants (logical pixels)
const W = 900
const H = 300
const HEADER_H = 50
const GRID_LEFT = 80
const GRID_RIGHT = W - 10
const GRID_W = GRID_RIGHT - GRID_LEFT
const GRID_TOP = HEADER_H + 10
const ROW_H = 30
const GRID_H = ROW_H * 4
const GRID_BOTTOM = GRID_TOP + GRID_H
const TOTALS_Y = GRID_BOTTOM + 14

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
  ctx.strokeStyle = '#bbb'
  ctx.lineWidth = 0.5

  // Horizontal row lines
  for (let i = 0; i <= 4; i++) {
    const y = GRID_TOP + i * ROW_H
    ctx.beginPath()
    ctx.moveTo(GRID_LEFT, y)
    ctx.lineTo(GRID_RIGHT, y)
    ctx.stroke()
  }

  // Vertical hour lines
  for (let h = 0; h <= 24; h++) {
    const x = GRID_LEFT + (h / 24) * GRID_W
    const isMidnight = h === 0 || h === 24
    const isNoon = h === 12
    ctx.lineWidth = isMidnight || isNoon ? 1 : 0.5
    ctx.beginPath()
    ctx.moveTo(x, GRID_TOP)
    ctx.lineTo(x, GRID_BOTTOM)
    ctx.stroke()

    // Quarter-hour ticks
    if (h < 24) {
      for (let q = 1; q <= 3; q++) {
        const qx = x + (q / 4) * (GRID_W / 24)
        ctx.lineWidth = 0.3
        ctx.beginPath()
        ctx.moveTo(qx, GRID_BOTTOM - 6)
        ctx.lineTo(qx, GRID_BOTTOM)
        ctx.stroke()
      }
    }

    // Hour labels
    if (h > 0 && h < 24) {
      ctx.fillStyle = '#555'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(h === 12 ? 'N' : h > 12 ? h - 12 : h, x, GRID_BOTTOM + 10)
    }
  }

  // Midnight labels
  ctx.fillStyle = '#555'
  ctx.font = '9px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('M', GRID_LEFT, GRID_BOTTOM + 10)
  ctx.fillText('M', GRID_RIGHT, GRID_BOTTOM + 10)

  // AM/PM labels
  ctx.fillText('Midnight', GRID_LEFT + GRID_W * 0.02, GRID_BOTTOM + 20)
  ctx.textAlign = 'center'
  ctx.fillText('Noon', GRID_LEFT + GRID_W * 0.5, GRID_BOTTOM + 20)
  ctx.fillText('Midnight', GRID_RIGHT - GRID_W * 0.02, GRID_BOTTOM + 20)
}

function drawRowLabels(ctx) {
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#222'
  ROW_KEYS.forEach((key, i) => {
    const y = GRID_TOP + i * ROW_H + ROW_H / 2 + 3
    ctx.fillText(ROW_LABELS[i], GRID_LEFT - 4, y)
  })
}

function drawSegments(ctx, segments) {
  if (!segments || segments.length === 0) return

  ctx.lineWidth = 2.5
  ctx.strokeStyle = '#111'

  let prevKey = null
  let prevX = null

  for (const seg of segments) {
    const key = seg.status
    if (!ROW_KEYS.includes(key)) continue

    const x1 = timeToX(seg.start)
    const x2 = timeToX(seg.end <= seg.start ? '23:59' : seg.end)
    const y = ROW_Y[key]

    // Vertical connector from previous row
    if (prevKey !== null && prevKey !== key) {
      ctx.beginPath()
      ctx.moveTo(prevX ?? x1, ROW_Y[prevKey])
      ctx.lineTo(x1, y)
      ctx.stroke()
    }

    // Horizontal line for this status period
    ctx.beginPath()
    ctx.moveTo(x1, y)
    ctx.lineTo(x2, y)
    ctx.stroke()

    prevKey = key
    prevX = x2
  }
}

function drawHeader(ctx, logData, dayNumber, totalDays) {
  ctx.fillStyle = '#111'
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`ELD Daily Log — ${logData.date}`, 10, 18)

  ctx.font = '11px sans-serif'
  ctx.fillStyle = '#444'
  ctx.fillText(
    `Day ${dayNumber} of ${totalDays}  |  Start: ${logData.driver_start_time}  |  Miles today: ${logData.miles_today}`,
    10,
    35
  )

  // Border
  ctx.strokeStyle = '#ccc'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1)
}

function drawTotals(ctx, totals) {
  const labels = {
    off_duty: 'Off Duty',
    sleeper: 'Sleeper',
    driving: 'Driving',
    on_duty: 'On Duty',
  }
  let x = GRID_LEFT
  const colW = GRID_W / 4
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'

  Object.entries(labels).forEach(([key, label], i) => {
    const cx = x + colW * i + colW / 2
    ctx.fillStyle = '#555'
    ctx.fillText(label, cx, TOTALS_Y)
    ctx.fillStyle = '#111'
    ctx.font = 'bold 11px sans-serif'
    ctx.fillText(`${(totals[key] || 0).toFixed(2)}h`, cx, TOTALS_Y + 14)
    ctx.font = '10px sans-serif'

    // Separator
    if (i > 0) {
      ctx.strokeStyle = '#ddd'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(x + colW * i, TOTALS_Y - 6)
      ctx.lineTo(x + colW * i, TOTALS_Y + 16)
      ctx.stroke()
    }
  })
}

export default function LogSheet({ logData, dayNumber, totalDays }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !logData) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    // White background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, W, H)

    drawHeader(ctx, logData, dayNumber, totalDays)
    drawRowLabels(ctx)
    drawGrid(ctx)
    drawSegments(ctx, logData.segments)
    drawTotals(ctx, logData.totals)
  }, [logData, dayNumber, totalDays])

  function handlePrint() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>ELD Log — ${logData.date}</title>
      <style>
        body { margin: 0; }
        img { width: 100%; max-width: 900px; display: block; }
        @media print { body { margin: 0; } }
      </style></head>
      <body><img src="${dataUrl}" onload="window.print();window.close()"/></body>
      </html>
    `)
  }

  return (
    <div className="log-sheet">
      <canvas ref={canvasRef} className="log-sheet__canvas" />
      <button
        className="log-sheet__print-btn no-print"
        onClick={handlePrint}
        title="Print this log sheet"
      >
        🖨 Print Day {dayNumber}
      </button>
    </div>
  )
}
