import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
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
  pickup: '#c2185b',        // On-Duty pink
  dropoff: '#c2185b',       // On-Duty pink
  rest_30min: '#f59e0b',    // Amber for mandatory break
  fuel: '#1565c0',          // Driving blue
  rest_10h: '#e65100',      // Sleeper orange
  reset_34h: '#2e7d32',     // Off-Duty green
}

const STOP_LABELS = {
  pickup: '📦 Pickup',
  dropoff: '🏁 Dropoff',
  rest_30min: '⏸ 30-min break',
  fuel: '⛽ Fuel stop',
  rest_10h: '🛌 10h rest',
  reset_34h: '🔄 34h cycle reset',
}

function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};border:2.5px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
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

export default function RouteMap({ route, stops }) {
  if (!route) {
    return (
      <div className="route-map route-map--empty">
        <p>Enter trip details to see the route.</p>
      </div>
    )
  }

  const { polyline, origin, pickup, dropoff } = route
  const center = polyline.length > 0 ? polyline[Math.floor(polyline.length / 2)] : [39.5, -98.35]

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
      return { ...stop, position: polyline[idx] }
    })

  return (
    <div className="route-map">
      <MapContainer
        center={center}
        zoom={6}
        style={{ width: '100%', height: '100%' }}
      >
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
              <strong>📦 Pickup</strong><br />{pickup.display_name}
            </Popup>
          </Marker>
        )}

        {/* Dropoff marker */}
        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={makeEndpointIcon('#c2185b')}>
            <Popup>
              <strong>🏁 Dropoff</strong><br />{dropoff.display_name}
            </Popup>
          </Marker>
        )}

        {/* Intermediate stop markers */}
        {stopMarkers.map((stop, i) => (
          <Marker
            key={i}
            position={stop.position}
            icon={makeIcon(STOP_COLORS[stop.type] || '#6b7280')}
          >
            <Popup>
              <strong>{STOP_LABELS[stop.type] || stop.type}</strong>
              {stop.notes && <><br />{stop.notes}</>}
              <br />{stop.duration_hours}h
            </Popup>
          </Marker>
        ))}
      </MapContainer>

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
      </div>
    </div>
  )
}
