# ELD Trip Planner — Frontend

React application for trip planning with interactive maps and FMCSA log sheet generation.

## Setup

```bash
npm install
```

## Dev

```bash
npm run dev
```

Dev server: `http://localhost:5173`

Vite proxy forwards `/api/*` to `http://localhost:8000` (Django backend)

## Build

```bash
npm run build
```

Output: `dist/`

## Deployment

Vercel:
- Root directory: `frontend/`
- Build: `npm run build`
- Output: `dist`
- Environment: `VITE_API_URL` = Render backend URL

## Stack

- React 18
- Leaflet (maps)
- Axios (HTTP)
- Vite (bundler)

---

See root `README.md` for full documentation.
