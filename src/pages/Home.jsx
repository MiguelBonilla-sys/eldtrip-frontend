import { useMemo, useState } from 'react'
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

  const summary = useMemo(() => {
    if (!result) return null

    return {
      totalMiles: Number(result.route.total_miles ?? 0).toLocaleString(),
      drivingHours: Number(result.route.duration_hours ?? 0).toFixed(1),
      totalDays: result.total_days,
      totalStops: result.stops.length,
    }
  }, [result])

  const status = useMemo(() => {
    if (loading) {
      return {
        label: 'Calculating',
        className: 'status-chip status-chip--loading',
        note: 'Running route and compliance calculations now.',
      }
    }

    if (serverError) {
      return {
        label: 'Attention Needed',
        className: 'status-chip status-chip--error',
        note: 'Please review inputs and try again.',
      }
    }

    if (summary) {
      return {
        label: 'Route Ready',
        className: 'status-chip status-chip--ready',
        note: 'Trip logs are generated and ready to print.',
      }
    }

    return {
      label: 'Awaiting Input',
      className: 'status-chip status-chip--idle',
      note: 'Enter locations to generate route instructions and logs.',
    }
  }, [loading, serverError, summary])

  const hasStaleResult = Boolean(serverError && result)
  const isPrintingLocked = Boolean(loading || hasStaleResult)

  function handlePrintAll() {
    window.print()
  }

  return (
    <div className="home">
      <header className="home__hero no-print panel">
        <div className="home__hero-main">
          <p className="home__eyebrow">FMCSA Dispatch Workspace</p>
          <h1>ELD Trip Planner</h1>
          <p className="home__lead">
            Plan long-haul trips, visualize mandatory stops, and print compliance-ready
            ELD daily logs in one flow.
          </p>
        </div>

        <div className="home__hero-status">
          <span className={status.className}>{status.label}</span>
          <p>{status.note}</p>
        </div>
      </header>

      <main className="home__main">
        <aside className="home__sidebar no-print">
          <TripForm
            onPlanReady={handlePlanReady}
            loading={loading}
            serverError={serverError}
          />

          <section className="home__summary panel" aria-live="polite">
            <h3>Trip Snapshot</h3>
            {hasStaleResult && (
              <p className="home__stale-note">
                Showing last successful plan. Fix the input error and recalculate before printing.
              </p>
            )}

            {summary ? (
              <dl>
                <div className="home__metric">
                  <dt>Total Distance</dt>
                  <dd>{summary.totalMiles} mi</dd>
                </div>
                <div className="home__metric">
                  <dt>Driving Time</dt>
                  <dd>{summary.drivingHours} h</dd>
                </div>
                <div className="home__metric">
                  <dt>Planned Days</dt>
                  <dd>
                    {summary.totalDays} day{summary.totalDays > 1 ? 's' : ''}
                  </dd>
                </div>
                <div className="home__metric">
                  <dt>Total Stops</dt>
                  <dd>{summary.totalStops}</dd>
                </div>
              </dl>
            ) : (
              <p className="home__empty">
                Submit a trip request to see route metrics, total stops, and generated
                daily logs.
              </p>
            )}
          </section>
        </aside>

        <section className="home__content">
          <div className="home__map-wrapper panel">
            <RouteMap
              route={result?.route || null}
              stops={result?.stops || []}
              summary={summary}
              logSheets={result?.log_sheets || []}
              loading={loading}
              error={serverError}
            />
          </div>

          <section className="home__logs panel">
            <div className="home__logs-head">
              <div>
                <h2 className="home__logs-title">Daily Log Sheets</h2>
                <p className="home__logs-subtitle no-print">
                  {summary
                    ? `${summary.totalDays} day${summary.totalDays > 1 ? 's' : ''} generated. Print each sheet or export all at once.`
                    : 'Generated ELD sheets will appear here after you plan a trip.'}
                </p>
              </div>

              {result && (
                <button
                  type="button"
                  className="home__print-all no-print"
                  onClick={handlePrintAll}
                  disabled={isPrintingLocked}
                  title={
                    isPrintingLocked
                      ? 'Printing is temporarily disabled while recalculation is pending or failed.'
                      : 'Print all generated log sheets'
                  }
                >
                  Print All Days
                </button>
              )}
            </div>

            {isPrintingLocked && result && (
              <p className="home__stale-note no-print" role="alert">
                {loading
                  ? 'Printing is disabled while route recalculation is in progress.'
                  : 'Printing is disabled because the latest recalculation failed.'}
              </p>
            )}

            {result ? (
              <div className="home__logs-grid">
                {result.log_sheets.map((log, i) => (
                  <LogSheet
                    key={i}
                    logData={log}
                    dayNumber={i + 1}
                    totalDays={result.total_days}
                    disablePrinting={isPrintingLocked}
                  />
                ))}
              </div>
            ) : (
              <div className="home__logs-empty">
                <p>
                  Daily logs are auto-filled from your route, stop schedule, and HOS
                  limits once you submit trip details.
                </p>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  )
}
