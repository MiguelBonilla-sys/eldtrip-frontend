import { useEffect, useRef, useState } from 'react'
import { searchLocations } from '../services/api'
import './LocationAutocomplete.css'

const SEARCH_DEBOUNCE_MS = 220
const MIN_QUERY_LENGTH = 2
const DEFAULT_LIMIT = 8

export default function LocationAutocomplete({
  id,
  name,
  label,
  placeholder,
  value,
  disabled,
  error,
  errorId,
  onValueChange,
  onBlurField,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [options, setOptions] = useState([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const containerRef = useRef(null)
  const requestTokenRef = useRef(0)
  const cacheRef = useRef(new Map())

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const requestToken = requestTokenRef.current + 1
    requestTokenRef.current = requestToken

    const query = value.trim()
    const queryForSearch = query.length >= MIN_QUERY_LENGTH ? query : ''

    const cachedOptions = cacheRef.current.get(queryForSearch)
    if (cachedOptions) {
      setLoading(false)
      setFetchError(false)
      setHasSearched(true)
      setOptions(cachedOptions)
      setHighlightedIndex(cachedOptions.length > 0 ? 0 : -1)
      return
    }

    setHasSearched(false)
    setLoading(true)

    const timeoutId = setTimeout(async () => {
      try {
        const nextOptions = await searchLocations(queryForSearch, DEFAULT_LIMIT)
        if (requestTokenRef.current !== requestToken) {
          return
        }
        cacheRef.current.set(queryForSearch, nextOptions)
        setFetchError(false)
        setHasSearched(true)
        setOptions(nextOptions)
        setHighlightedIndex(nextOptions.length > 0 ? 0 : -1)
      } catch {
        if (requestTokenRef.current !== requestToken) {
          return
        }
        setFetchError(true)
        setHasSearched(true)
        setOptions([])
        setHighlightedIndex(-1)
      } finally {
        if (requestTokenRef.current === requestToken) {
          setLoading(false)
        }
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timeoutId)
  }, [isOpen, value])

  function handleSelect(option) {
    onValueChange(name, option.label)
    setIsOpen(false)
    setOptions([])
    setHighlightedIndex(-1)
  }

  function handleInputKeyDown(event) {
    if (event.key === 'Escape') {
      setIsOpen(false)
      setHighlightedIndex(-1)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setHighlightedIndex(prev => {
        if (options.length === 0) return -1
        return Math.min(prev + 1, options.length - 1)
      })
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex(prev => {
        if (options.length === 0) return -1
        return Math.max(prev - 1, 0)
      })
      return
    }

    if (event.key === 'Enter' && isOpen && highlightedIndex >= 0 && options[highlightedIndex]) {
      event.preventDefault()
      handleSelect(options[highlightedIndex])
    }
  }

  function handleInputBlur() {
    onBlurField(name, value)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const shouldShowMenu =
    isOpen && (loading || options.length > 0 || (!fetchError && hasSearched && value.trim().length >= MIN_QUERY_LENGTH))
  const warningId = `${id}-warning`

  return (
    <div className="trip-form__field location-autocomplete" ref={containerRef}>
      <label htmlFor={id}>{label}</label>
      <div className="location-autocomplete__control">
        <span className="location-autocomplete__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M10.5 3a7.5 7.5 0 1 0 4.73 13.33l4.22 4.22 1.06-1.06-4.22-4.22A7.5 7.5 0 0 0 10.5 3Zm0 1.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" />
          </svg>
        </span>

        <input
          id={id}
          name={name}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={event => {
            onValueChange(name, event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          role="combobox"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : fetchError ? warningId : undefined}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-expanded={shouldShowMenu}
          aria-activedescendant={
            shouldShowMenu && highlightedIndex >= 0
              ? `${id}-option-${highlightedIndex}`
              : undefined
          }
          disabled={disabled}
          autoComplete="off"
        />

        {loading && <span className="location-autocomplete__spinner" aria-hidden="true" />}
      </div>

      {fetchError && (
        <span className="location-autocomplete__warning" id={warningId} role="status" aria-live="polite">
          Suggestions unavailable right now. You can still type manually.
        </span>
      )}

      {shouldShowMenu && (
        <div className="location-autocomplete__menu" id={`${id}-listbox`} role="listbox">
          {loading && <div className="location-autocomplete__status">Searching locations...</div>}

          {!loading && !fetchError && hasSearched && options.length === 0 && (
            <div className="location-autocomplete__status">No matching cities found.</div>
          )}

          {!loading &&
            options.map((option, index) => (
              <button
                key={`${option.label}-${index}`}
                type="button"
                className={`location-autocomplete__option ${
                  index === highlightedIndex ? 'location-autocomplete__option--active' : ''
                }`}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={index === highlightedIndex}
                tabIndex={-1}
                onMouseDown={event => event.preventDefault()}
                onClick={() => handleSelect(option)}
              >
                <span className="location-autocomplete__option-main">
                  <span className="location-autocomplete__option-label">{option.label}</span>
                  <span className="location-autocomplete__option-meta">
                    <span className="location-autocomplete__state-chip">{option.state_code || option.state}</span>
                    <span>Pop. {Number(option.population || 0).toLocaleString()}</span>
                  </span>
                </span>
              </button>
            ))}
        </div>
      )}

      {error && (
        <span className="trip-form__field-error" id={errorId}>
          {error}
        </span>
      )}
    </div>
  )
}
