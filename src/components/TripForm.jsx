import { useState } from 'react'
import LocationAutocomplete from './LocationAutocomplete'
import './TripForm.css'

const INITIAL_STATE = {
  current_location: '',
  pickup_location: '',
  dropoff_location: '',
  current_cycle_used: '',
}

const FIELD_LABELS = {
  current_location: 'Current Location',
  pickup_location: 'Pickup Location',
  dropoff_location: 'Dropoff Location',
  current_cycle_used: 'Hours used in current 8-day cycle (0–70)',
}

const PLACEHOLDERS = {
  current_location: 'e.g. Chicago, IL',
  pickup_location: 'e.g. Detroit, MI',
  dropoff_location: 'e.g. Nashville, TN',
  current_cycle_used: 'e.g. 20',
}

function validate(fields) {
  const errors = {}
  if (!fields.current_location.trim()) errors.current_location = 'Required'
  if (!fields.pickup_location.trim()) errors.pickup_location = 'Required'
  if (!fields.dropoff_location.trim()) errors.dropoff_location = 'Required'
  const cycle = parseFloat(fields.current_cycle_used)
  if (fields.current_cycle_used === '') {
    errors.current_cycle_used = 'Required'
  } else if (isNaN(cycle) || cycle < 0 || cycle > 70) {
    errors.current_cycle_used = 'Must be between 0 and 70'
  }
  return errors
}

export default function TripForm({ onPlanReady, loading, serverError }) {
  const [fields, setFields] = useState(INITIAL_STATE)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const errorCount = Object.values(errors).filter(Boolean).length

  function handleLocationChange(name, value) {
    setFields(prev => {
      const next = { ...prev, [name]: value }
      if (touched[name]) {
        const nextErrors = validate(next)
        setErrors(prevErrors => ({ ...prevErrors, [name]: nextErrors[name] }))
      }
      return next
    })
  }

  function handleChange(e) {
    const { name, value } = e.target

    setFields(prev => {
      const next = { ...prev, [name]: value }
      if (touched[name]) {
        const nextErrors = validate(next)
        setErrors(prevErrors => ({ ...prevErrors, [name]: nextErrors[name] }))
      }
      return next
    })
  }

  function handleLocationBlur(name, value) {
    setTouched(prev => ({ ...prev, [name]: true }))
    const nextErrors = validate({ ...fields, [name]: value })
    setErrors(prev => ({ ...prev, [name]: nextErrors[name] }))
  }

  function handleBlur(e) {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    const newErrors = validate(fields)
    setErrors(prev => ({ ...prev, [name]: newErrors[name] }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const allTouched = Object.keys(INITIAL_STATE).reduce(
      (acc, k) => ({ ...acc, [k]: true }),
      {}
    )
    setTouched(allTouched)
    const newErrors = validate(fields)
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    onPlanReady({
      current_location: fields.current_location.trim(),
      pickup_location: fields.pickup_location.trim(),
      dropoff_location: fields.dropoff_location.trim(),
      current_cycle_used: parseFloat(fields.current_cycle_used),
    })
  }

  return (
    <form className={`trip-form panel ${loading ? 'trip-form--loading' : ''}`} onSubmit={handleSubmit} noValidate>
      <div className="trip-form__heading">
        <p className="trip-form__eyebrow">Dispatch Inputs</p>
        <h2 className="trip-form__title">Plan Your Trip</h2>
        <p className="trip-form__subtitle">
          Enter route details to generate mandatory stops and FMCSA-compliant daily logs.
        </p>
      </div>

      {errorCount > 1 && (
        <div className="trip-form__error-summary" role="alert" aria-live="polite">
          Please review {errorCount} highlighted fields before submitting.
        </div>
      )}

      {serverError && (
        <div className="trip-form__error-banner" role="alert">
          {serverError}
        </div>
      )}

      <fieldset className="trip-form__fieldset" disabled={loading}>
        <fieldset className="trip-form__group">
          <legend className="sr-only">Route locations</legend>
          <p className="trip-form__group-title">Route Locations</p>
          <p className="trip-form__group-helper">
            Search by city and state (example: Dallas, TX) or pick from suggestions.
          </p>

          {['current_location', 'pickup_location', 'dropoff_location'].map(name => (
            <LocationAutocomplete
              key={name}
              id={name}
              name={name}
              label={FIELD_LABELS[name]}
              placeholder={PLACEHOLDERS[name]}
              value={fields[name]}
              disabled={loading}
              error={errors[name]}
              errorId={`${name}-error`}
              onValueChange={handleLocationChange}
              onBlurField={handleLocationBlur}
            />
          ))}
        </fieldset>

        <fieldset className="trip-form__group">
          <legend className="sr-only">Driver cycle details</legend>
          <p className="trip-form__group-title">Driver Cycle</p>

          <div className="trip-form__field">
            <label htmlFor="current_cycle_used">{FIELD_LABELS.current_cycle_used}</label>
            <input
              id="current_cycle_used"
              name="current_cycle_used"
              type="number"
              min="0"
              max="70"
              step="0.5"
              value={fields.current_cycle_used}
              placeholder={PLACEHOLDERS.current_cycle_used}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!errors.current_cycle_used}
              aria-describedby={
                errors.current_cycle_used ? 'cycle-error cycle-hint' : 'cycle-hint'
              }
            />
            {errors.current_cycle_used && (
              <span className="trip-form__field-error" id="cycle-error">
                {errors.current_cycle_used}
              </span>
            )}
            <span className="trip-form__field-hint" id="cycle-hint">
              Enter total hours used in the last 8 days before starting this trip.
            </span>
          </div>
        </fieldset>
      </fieldset>

      <button
        type="submit"
        className="trip-form__submit"
        disabled={loading}
        aria-busy={loading}
      >
        {loading && <span className="trip-form__spinner" aria-hidden="true" />}
        <span>{loading ? 'Calculating Route...' : 'Plan Trip'}</span>
      </button>

      <p className="trip-form__status" aria-live="polite">
        {loading
          ? 'Calculating mileage, mandatory breaks, and compliant daily logs.'
          : 'Ready to generate route instructions and ELD sheets.'}
      </p>
    </form>
  )
}
