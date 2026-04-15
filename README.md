# ELD Trip Planner — Frontend UI

React-based single-page application that provides:
1. **Trip Planning Form** — Capture driver inputs (current location, pickup, dropoff, cycle hours used)
2. **Interactive Route Map** — Display route on Leaflet map with color-coded stops
3. **FMCSA Log Sheets** — Canvas-based daily log visualization with print functionality

## 🎯 What This Solves

This frontend handles the **user interface** for the assessment:

**User Inputs** → Trip details form
**Backend Call** → POST to `/api/trips/plan/`
**Visual Outputs** →
1. Interactive map showing route and stops
2. Multiple daily log sheets (one per calendar day)
3. Print-ready FMCSA form replicas

## 🏗️ Architecture

### Core Components

**1. TripForm Component** (`src/components/TripForm.jsx`)
- Text inputs for 4 fields:
  - Current location (e.g., "Chicago, IL")
  - Pickup location (e.g., "Detroit, MI")
  - Dropoff location (e.g., "Nashville, TN")
  - Current cycle used (hours: 0-70)
- Form validation (all fields required, cycle 0-70)
- Loading state during API call
- Error handling with user-friendly messages
- Submit button triggers backend request

**2. RouteMap Component** (`src/components/RouteMap.jsx`)
- **Leaflet map** with OpenStreetMap tiles (free, no API key)
- **Route polyline** in blue showing the driving route
- **Color-coded markers** for stops:
  - 🟢 **Green** (#2e7d32) — Off-duty (origin, 34h resets)
  - 🔴 **Pink** (#c2185b) — On-duty (pickup, dropoff)
  - 🔵 **Blue** (#1565c0) — Driving (fuel stops)
  - 🟠 **Orange** (#e65100) — Sleeper berth (10h rest)
  - 🟡 **Amber** (#f59e0b) — On-duty breaks (30-min rest)
- **Interactive popups** showing stop details and duration
- **Legend** explaining all marker types
- **Auto-zoom** to fit entire route in viewport

**3. LogSheet Component** (`src/components/LogSheet.jsx`)
- **Canvas-based rendering** (not chart/graph library)
- **FMCSA form replica**:
  - 24-hour timeline (midnight to midnight)
  - 4 status rows: Off-Duty, Sleeper Berth, Driving, On-Duty
  - 15-minute grid blocks
  - Color-coded horizontal segments per status
  - Vertical connectors showing transitions
  - On-duty bracket indicator
- **Daily totals** section showing hours per status
- **Printable format** (A4 standard, DPI-aware)
- **Print button** that opens browser print dialog

**4. App Layout** (`src/pages/Home.jsx`)
- Two-column desktop layout: Form + Map on left, Log sheets on right
- Single-column mobile layout (responsive)
- Form submission updates both map and log sheets simultaneously

### Data Flow

```
User fills form
    ↓
Validation (all required fields, cycle 0-70)
    ↓
POST to /api/trips/plan/
    ↓
Backend processes (geocoding → routing → HOS calculation)
    ↓
JSON response with route + stops + log_sheets
    ↓
Update component state
    ↓
RouteMap renders polyline + markers
LogSheet renders daily canvases for printing
```

## 🚀 Local Development

### Prerequisites
- Node.js 16+
- npm or yarn

### Setup

```bash
npm install
```

### Run Dev Server

```bash
npm run dev
```

Dev server: `http://localhost:5173`

**Vite Proxy**: `/api/*` requests forward to `http://localhost:8000` (Django backend)

This allows frontend to call `/api/trips/plan/` without CORS errors during development.

### Build for Production

```bash
npm run build
```

Output: `dist/` folder containing optimized assets

### Project Structure

```
frontend/
├── README.md                       # This file
├── package.json                    # Dependencies + build scripts
├── vite.config.js                  # Vite configuration + proxy
├── index.html                      # Entry HTML
└── src/
    ├── main.jsx                    # React mount point
    ├── App.jsx                     # Root component
    ├── components/
    │   ├── TripForm.jsx            # User input form
    │   ├── TripForm.css            # Form styling
    │   ├── RouteMap.jsx            # Leaflet map + stops
    │   ├── RouteMap.css            # Map & legend styling
    │   ├── LogSheet.jsx            # Canvas-based ELD log
    │   └── LogSheet.css            # Log sheet wrapper + print
    ├── pages/
    │   └── Home.jsx                # Main layout
    └── services/
        └── api.js                  # Backend API client
```

## 🎨 UI Components

### TripForm
- **Purpose**: Capture user inputs
- **Fields**:
  - Text input: Current location
  - Text input: Pickup location
  - Text input: Dropoff location
  - Number input: Current cycle hours used (0-70)
- **Validation**:
  - All fields required
  - Cycle hours must be 0-70
  - Displays error messages if validation fails
- **States**:
  - Idle (waiting for input)
  - Loading (API request in progress)
  - Success (data received)
  - Error (API error or validation failure)

### RouteMap
- **Purpose**: Visualize route and stops geographically
- **Technologies**:
  - **Leaflet** — Open-source map library
  - **React-Leaflet** — React wrapper for Leaflet
  - **OpenStreetMap** — Free tile provider (no API key)
- **Display Elements**:
  - Blue polyline showing driving route
  - Colored circular markers for each stop
  - Popups with stop details (type, duration, notes)
  - Legend showing all marker colors
- **Interactive**:
  - Click markers to see details
  - Auto-zoom to fit entire route
  - Responsive map sizing

### LogSheet
- **Purpose**: Display daily ELD log in FMCSA-compliant format
- **Technologies**:
  - **HTML Canvas** — Low-level drawing (not Chart.js)
  - DPI-aware rendering for print quality
- **Visual Elements**:
  - Header with title and date
  - 24-hour timeline (x-axis)
  - 4 status rows (y-axis): Off-Duty, Sleeper, Driving, On-Duty
  - 15-minute grid blocks
  - Color-coded horizontal segments for each status period
  - Vertical connectors between status changes
  - On-duty bracket indicator on left edge
  - Daily totals in bottom section
- **Print Support**:
  - Print button opens browser print dialog
  - PDF export friendly
  - Automatic page break handling for multi-day trips

## 🔧 Configuration

### Vite Configuration (`vite.config.js`)

```javascript
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
}
```

**Effect**: During dev, `POST /api/trips/plan/` automatically routes to `http://localhost:8000/api/trips/plan/`

### API Client (`src/services/api.js`)

```javascript
export const planTrip = async (tripData) => {
  const baseUrl = import.meta.env.VITE_API_URL || '/api'
  const response = await axios.post(`${baseUrl}/trips/plan/`, tripData)
  return response.data
}
```

**During Development**:
- `import.meta.env.VITE_API_URL` is undefined
- Falls back to `/api` (proxy to localhost:8000)

**In Production** (Vercel):
- `VITE_API_URL` environment variable points to Render backend
- Direct HTTPS requests to `https://eldtrip-api.onrender.com/api/trips/plan/`

## 🌐 Deployment on Vercel

### Setup Steps

1. Connect GitHub repo to Vercel
2. Create new project
3. Configure build settings
4. Add environment variable
5. Deploy

### Build Configuration

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend/` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Environment Variable

Add in Vercel dashboard:

```
VITE_API_URL=https://eldtrip-api.onrender.com
```

This tells the frontend where the backend API is located.

**Result**: Frontend deployed at `https://eldtrip-frontend.vercel.app`

### Important: .gitignore

**NEVER commit `node_modules`** to git. This causes Vercel build failures.

```bash
# frontend/.gitignore
node_modules/
dist/
.env.local
.DS_Store
```

Vercel runs `npm install` during build—if `node_modules` is in the repo, file permission conflicts cause EACCES errors.

## 📦 Dependencies

Managed by npm in `package.json`:

**Production**:
- `react>=18` — UI framework
- `react-dom>=18` — React DOM rendering
- `leaflet>=1.9` — Map library
- `react-leaflet>=4.0` — React wrapper for Leaflet
- `axios>=1.4` — HTTP client

**Development**:
- `vite>=4.0` — Fast build tool
- `@vitejs/plugin-react` — React plugin for Vite

## 🔐 Security & Best Practices

✅ **No API keys in frontend code**
- All sensitive operations happen on backend
- Frontend only displays data

✅ **CORS configured**
- Backend allows requests from Vercel frontend
- No hardcoded URLs in code

✅ **Input validation**
- Form fields validated before submission
- Backend also validates (defense in depth)

✅ **Error handling**
- User-friendly error messages
- Backend errors don't leak sensitive info

✅ **Responsive design**
- Works on mobile (form stacked, map scrollable)
- Print-optimized for A4 standard

## 🎨 Design System

### Colors (Aligned with HOS Status)

These colors match the backend's FMCSA statuses and appear consistently in map markers and log sheets:

| Color | Hex | HOS Status | Used For |
|-------|-----|-----------|----------|
| Green | #2e7d32 | Off-Duty | Origin marker, 34h resets |
| Pink | #c2185b | On-Duty | Pickup/dropoff markers |
| Blue | #1565c0 | Driving | Fuel stops, header |
| Orange | #e65100 | Sleeper Berth | 10h rest stops |
| Amber | #f59e0b | On-Duty Break | 30-min mandatory breaks |

### Typography
- **Sans-serif** — Modern, legible
- **Headers**: Bold, larger sizes
- **Body**: Regular, 14-16px
- **Print**: High contrast for readability

### Spacing
- **Desktop**: Two-column layout
- **Mobile**: Single-column (form → map → logs)
- **Print**: Full width, A4 standard

## ❌ What We Didn't Do (and Why)

| Approach | Why Not | What We Did Instead |
|----------|---------|---------------------|
| Google Maps | Costs money ($0.50+ per request) | Free Leaflet + OpenStreetMap |
| Chart.js for logs | Not FMCSA compliant, hard to print | HTML Canvas with direct drawing |
| HOS logic on frontend | Not auditable, not secure | All logic on backend, frontend displays data |
| API keys in frontend code | Security risk, exposes backend URL | Environment variables + backend proxy |
| Hardcoded backend URL | Can't change environments easily | Environment variable `VITE_API_URL` |

## 📱 Responsive Design

**Desktop** (≥640px):
- Form on left (25% width)
- Map in center (50% width)
- Log sheets on right (25% width)
- Print button visible above logs

**Mobile** (<640px):
- Form full width (stacked)
- Map full width, scrollable
- Log sheets full width, scrollable
- Print button sticky at bottom

## 🖨️ Print Support

**Print Button**:
- Opens browser print dialog
- Displays print preview
- User can save as PDF or print to physical printer

**CSS**:
- `@media print` hides UI elements
- `page-break-inside: avoid` prevents cutting through logs
- Canvas rendered at full DPI for crisp output

**Multi-day trips**:
- Each daily log on separate canvas
- Print all or individually
- A4 standard dimensions

## 📞 Support

See root `README.md` for full project documentation and backend setup.

---

**Last Updated**: April 14, 2026  
**Status**: ✅ Live on Vercel, color-coded markers aligned with HOS statuses
