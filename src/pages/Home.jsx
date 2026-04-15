import { useState } from 'react'
import TripForm from '../components/TripForm'
import RouteMap from '../components/RouteMap'
import LogSheet from '../components/LogSheet'
import { planTrip } from '../services/api'
import './Home.css'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [result, setResult] = useState(null)

  async function handlePlanReady(tripData) {
    setLoading(true)
    setServerError(null)
    setResult(null)
    try {
      const data = await planTrip(tripData)
      setResult(data)
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Something went wrong. Please try again.'
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home">
      <header className="home__header no-print">
        <h1>🚛 ELD Trip Planner</h1>
        <p>Enter your trip details to generate HOS-compliant log sheets and a route map.</p>
      </header>

      <main className="home__main">
        <aside className="home__sidebar no-print">
          <TripForm
            onPlanReady={handlePlanReady}
            loading={loading}
            serverError={serverError}
          />

          {result && (
            <div className="home__summary">
              <h3>Trip Summary</h3>
              <dl>
                <div>
                  <dt>Total distance</dt>
                  <dd>{result.route.total_miles} miles</dd>
                </div>
                <div>
                  <dt>Driving time (actual)</dt>
                  <dd>{result.route.duration_hours}h (HOS-planned: {result.total_days} day{result.total_days > 1 ? 's' : ''})</dd>
                </div>
                <div>
                  <dt>Total stops</dt>
                  <dd>{result.stops.length}</dd>
                </div>
              </dl>
            </div>
          )}
        </aside>

        <section className="home__content">
          <div className="home__map-wrapper">
            <RouteMap
              route={result?.route || null}
              stops={result?.stops || []}
            />
          </div>

          {result && (
            <div className="home__logs">
              <h2 className="home__logs-title">Daily Log Sheets</h2>
              <p className="home__logs-subtitle no-print">
                {result.total_days} day{result.total_days > 1 ? 's' : ''} — click Print to print an individual sheet
              </p>
              <div className="home__logs-grid">
                {result.log_sheets.map((log, i) => (
                  <LogSheet
                    key={i}
                    logData={log}
                    dayNumber={i + 1}
                    totalDays={result.total_days}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
