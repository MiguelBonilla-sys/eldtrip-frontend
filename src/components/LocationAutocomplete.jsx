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
  const [options, setOptions] = useState([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const containerRef = useRef(null)
  const requestTokenRef = useRef(0)

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

    const query = value.trim()
    if (query.length < MIN_QUERY_LENGTH) {
      setLoading(false)
      setFetchError(false)
      setOptions([])
      setHighlightedIndex(-1)
      return
    }

    const requestToken = requestTokenRef.current + 1
    requestTokenRef.current = requestToken
    setLoading(true)

    const timeoutId = setTimeout(async () => {
      try {
        const nextOptions = await searchLocations(query, DEFAULT_LIMIT)
        if (requestTokenRef.current !== requestToken) {
          return
        }
        setFetchError(false)
        setOptions(nextOptions)
        setHighlightedIndex(nextOptions.length > 0 ? 0 : -1)
      } catch {
        if (requestTokenRef.current !== requestToken) {
          return
        }
        setFetchError(true)
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
      setHighlightedIndex(prev => Math.max(prev - 1, 0))
      return
    }

    if (event.key === 'Enter' && isOpen && highlightedIndex >= 0 && options[highlightedIndex]) {
      event.preventDefault()
      handleSelect(options[highlightedIndex])
    }
  }

  const shouldShowMenu = isOpen && value.trim().length >= MIN_QUERY_LENGTH

  return (
    <div className="trip-form__field location-autocomplete" ref={containerRef}>
      <label htmlFor={id}>{label}</label>
      <div className="location-autocomplete__control">
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
          onBlur={() => onBlurField(name, value)}
          onKeyDown={handleInputKeyDown}
          role="combobox"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : `${id}-hint`}
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

      <span className="trip-form__field-hint" id={`${id}-hint`}>
        Type at least 2 letters to search suggestions.
      </span>

      {shouldShowMenu && (
        <div className="location-autocomplete__menu" id={`${id}-listbox`} role="listbox">
          {loading && <div className="location-autocomplete__status">Searching locations...</div>}

          {!loading && fetchError && (
            <div className="location-autocomplete__status">
              Could not load suggestions. Please try again.
            </div>
          )}

          {!loading && !fetchError && options.length === 0 && (
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
                onMouseDown={event => event.preventDefault()}
                onClick={() => handleSelect(option)}
              >
                <span className="location-autocomplete__option-label">{option.label}</span>
                <span className="location-autocomplete__option-meta">
                  Pop. {Number(option.population || 0).toLocaleString()}
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
