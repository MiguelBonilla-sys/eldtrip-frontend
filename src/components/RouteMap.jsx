import { useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  ZoomControl,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import './RouteMap.css'

// Fix Leaflet's broken default icon paths with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STOP_COLORS = {
  pickup: '#c2185b',
  dropoff: '#c2185b',
  rest_30min: '#f59e0b',
  fuel: '#1565c0',
  rest_10h: '#e65100',
  reset_34h: '#2e7d32',
}

const STOP_LABELS = {
  pickup: 'Pickup (On Duty)',
  dropoff: 'Dropoff (On Duty)',
  rest_30min: '30-min break',
  fuel: 'Fuel stop',
  rest_10h: '10h rest',
  reset_34h: '34h cycle reset',
}

const STOP_MARKER_TEXT = {
  rest_30min: '30m',
  fuel: 'F',
  rest_10h: '10h',
  reset_34h: '34h',
}

function makeIcon(color, text = '') {
  const textColor = '#ffffff'
  return L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:${color};border:2.5px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      font-size:9px;font-weight:700;color:${textColor};
      font-family:'IBM Plex Mono', monospace;
      line-height:1;
    ">${text}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function makeEndpointIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 1px 6px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

// Component to fit the map bounds to the polyline
function FitBounds({ polyline }) {
  const map = useMap()
  useEffect(() => {
    if (polyline && polyline.length > 0) {
      map.fitBounds(polyline, { padding: [40, 40] })
    }
  }, [map, polyline])
  return null
}

export default function RouteMap({
  route,
  stops,
  summary,
  logSheets = [],
  loading = false,
  error = null,
}) {
  const emptyTitle = loading
    ? 'Calculating route and stops...'
    : error
      ? 'Route planning needs attention'
      : 'Map preview is ready when you are'

  const emptyDescription = loading
    ? 'We are fetching route geometry and HOS stop schedule.'
    : error
      ? 'Please review your trip fields and submit again.'
      : 'Enter trip details to display route geometry, stops, and rest markers.'

  if (!route) {
    return (
      <div className="route-map route-map--empty">
        <div className="route-map__empty-content">
          <h3>{emptyTitle}</h3>
          <p>{emptyDescription}</p>
          {error && <p className="route-map__empty-error">{error}</p>}
        </div>
      </div>
    )
  }

  const { polyline, origin, pickup, dropoff } = route
  const center =
    polyline.length > 0 ? polyline[Math.floor(polyline.length / 2)] : [39.5, -98.35]
  const totalMiles = Number(route.total_miles || 0)
  const polylineSpan = Math.max(polyline.length - 1, 1)

  function getIndexForFraction(fraction) {
    return Math.max(0, Math.min(polylineSpan, Math.round(fraction * polylineSpan)))
  }

  function getApproxMile(polylineIndex) {
    if (!totalMiles || polylineSpan <= 0) return null
    return Math.round((polylineIndex / polylineSpan) * totalMiles)
  }

  // Build stop markers from the stops array
  // We'll distribute them roughly along the polyline
  const stopMarkers = stops
    .filter(s => !['pickup', 'dropoff'].includes(s.type))
    .map((stop, i) => {
      // Sample position along the polyline proportional to index
      const idx = Math.min(
        Math.floor(((i + 1) / (stops.length + 1)) * polyline.length),
        polyline.length - 1
      )
      return {
        ...stop,
        position: polyline[idx],
        polylineIndex: idx,
        approxMile: getApproxMile(idx),
      }
    })

  const hasExplicitRest10 = stops.some(stop => stop.type === 'rest_10h')
  const inferredRestStops = []

  if (!hasExplicitRest10 && Array.isArray(logSheets) && logSheets.length > 1 && totalMiles > 0) {
    let cumulativeMiles = 0

    for (let dayIndex = 0; dayIndex < logSheets.length - 1; dayIndex += 1) {
      cumulativeMiles += Number(logSheets[dayIndex]?.miles_today || 0)
      const fraction = Math.max(0, Math.min(1, cumulativeMiles / totalMiles))
      const idx = getIndexForFraction(fraction)

      if (idx > 0 && idx < polyline.length) {
        inferredRestStops.push({
          type: 'rest_10h',
          duration_hours: 10,
          notes: `Mandatory 10h rest after Day ${dayIndex + 1}`,
          position: polyline[idx],
          polylineIndex: idx,
          approxMile: Math.max(0, Math.round(cumulativeMiles)),
        })
      }
    }
  }

  const allMarkers = [...stopMarkers, ...inferredRestStops]
    .filter(marker => marker.position)
    .sort((a, b) => (a.polylineIndex || 0) - (b.polylineIndex || 0))

  const fuelMarkerMiles = allMarkers
    .filter(marker => marker.type === 'fuel')
    .map(marker => marker.approxMile)
    .filter(mile => Number.isFinite(mile))

  const rest10MarkerMiles = allMarkers
    .filter(marker => marker.type === 'rest_10h')
    .map(marker => marker.approxMile)
    .filter(mile => Number.isFinite(mile))

  const fuelWhereText =
    fuelMarkerMiles.length > 0
      ? fuelMarkerMiles.map(mile => `~mile ${mile}`).join(', ')
      : 'No fuel stop for this distance.'

  const restWhereText =
    rest10MarkerMiles.length > 0
      ? rest10MarkerMiles.map(mile => `~mile ${mile}`).join(', ')
      : 'No 10h rest for single-day trip.'

  return (
    <div className="route-map">
      {summary && (
        <div className="route-map__summary no-print" aria-live="polite">
          <div>
            <span>Miles</span>
            <strong>{summary.totalMiles}</strong>
          </div>
          <div>
            <span>Drive Time</span>
            <strong>{summary.drivingHours}h</strong>
          </div>
          <div>
            <span>Days</span>
            <strong>{summary.totalDays}</strong>
          </div>
          <div>
            <span>Stops</span>
            <strong>{summary.totalStops}</strong>
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={6}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomControl position="topright" />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {polyline.length > 0 && (
          <>
            <Polyline positions={polyline} color="#1a56db" weight={3} opacity={0.8} />
            <FitBounds polyline={polyline} />
          </>
        )}

        {/* Origin marker */}
        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={makeEndpointIcon('#2e7d32')}>
            <Popup>
              <strong>Start</strong><br />{origin.display_name}
            </Popup>
          </Marker>
        )}

        {/* Pickup marker */}
        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={makeEndpointIcon('#c2185b')}>
            <Popup>
              <strong>Pickup</strong>
              <br />
              {pickup.display_name}
            </Popup>
          </Marker>
        )}

        {/* Dropoff marker */}
        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={makeEndpointIcon('#c2185b')}>
            <Popup>
              <strong>Dropoff</strong>
              <br />
              {dropoff.display_name}
            </Popup>
          </Marker>
        )}

        {/* Intermediate stop markers */}
        {allMarkers.map((stop, i) => {
          const markerKey = `${stop.type}-${stop.polylineIndex ?? 'na'}-${stop.approxMile ?? 'na'}-${i}`

          return (
          <Marker
            key={markerKey}
            position={stop.position}
            icon={makeIcon(STOP_COLORS[stop.type] || '#6b7280', STOP_MARKER_TEXT[stop.type] || '')}
          >
            <Popup>
              <strong>{STOP_LABELS[stop.type] || stop.type}</strong>
              {stop.notes && (
                <>
                  <br />
                  {stop.notes}
                </>
              )}
              <br />
              {stop.duration_hours}h
              {Number.isFinite(stop.approxMile) && (
                <>
                  <br />
                  Approx. mile {stop.approxMile}
                </>
              )}
            </Popup>
          </Marker>
          )
        })}
      </MapContainer>

      <div className="route-map__where panel no-print" aria-live="polite">
        <h4>Where are key stops?</h4>
        <p>
          <strong>Fuel stop:</strong> {fuelWhereText}
        </p>
        <p>
          <strong>10h rest:</strong> {restWhereText}
        </p>
      </div>

      {/* Legend */}
      <div className="route-map__legend no-print">
        {Object.entries(STOP_LABELS).map(([type, label]) => (
          <div key={type} className="route-map__legend-item">
            <span
              className="route-map__legend-dot"
              style={{ background: STOP_COLORS[type] }}
            />
            <span>{label}</span>
          </div>
        ))}

        {allMarkers.length > 0 && (
          <p className="route-map__legend-note">
            Intermediate stop markers are estimated along the route line.
          </p>
        )}
      </div>

      {loading && (
        <div className="route-map__overlay route-map__overlay--loading no-print" role="status">
          Recalculating route...
        </div>
      )}

      {error && route && (
        <div className="route-map__overlay route-map__overlay--error no-print" role="alert">
          Showing previous route while the latest request is retried.
        </div>
      )}
    </div>
  )
}
