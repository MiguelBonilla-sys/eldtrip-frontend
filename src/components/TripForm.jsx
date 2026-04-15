import { useState } from 'react'
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

  function handleChange(e) {
    const { name, value } = e.target
    setFields(prev => ({ ...prev, [name]: value }))
    if (touched[name]) {
      const newErrors = validate({ ...fields, [name]: value })
      setErrors(prev => ({ ...prev, [name]: newErrors[name] }))
    }
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
    <form className="trip-form" onSubmit={handleSubmit} noValidate>
      <h2 className="trip-form__title">Plan Your Trip</h2>

      {serverError && (
        <div className="trip-form__error-banner" role="alert">
          {serverError}
        </div>
      )}

      {['current_location', 'pickup_location', 'dropoff_location'].map(name => (
        <div className="trip-form__field" key={name}>
          <label htmlFor={name}>{FIELD_LABELS[name]}</label>
          <input
            id={name}
            name={name}
            type="text"
            value={fields[name]}
            placeholder={PLACEHOLDERS[name]}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!errors[name]}
            aria-describedby={errors[name] ? `${name}-error` : undefined}
          />
          {errors[name] && (
            <span className="trip-form__field-error" id={`${name}-error`}>
              {errors[name]}
            </span>
          )}
        </div>
      ))}

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
          aria-describedby={errors.current_cycle_used ? 'cycle-error' : undefined}
        />
        {errors.current_cycle_used && (
          <span className="trip-form__field-error" id="cycle-error">
            {errors.current_cycle_used}
          </span>
        )}
        <span className="trip-form__field-hint">
          Enter how many hours you've driven in the last 8 days (0 if starting fresh).
        </span>
      </div>

      <button
        type="submit"
        className="trip-form__submit"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? 'Calculating…' : 'Plan Trip'}
      </button>
    </form>
  )
}
