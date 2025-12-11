import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { flightAPI, FlightSchedule, Airport, bookingAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import './Flights.css'

const PAGE_SIZE = 6

const Flights = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [flights, setFlights] = useState<FlightSchedule[]>([])
  const [airports, setAirports] = useState<Airport[]>([])
  const [searchParams, setSearchParams] = useState({
    originName: '',
    destinationName: '',
    date: new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchMode, setSearchMode] = useState(false)
  const [pageMeta, setPageMeta] = useState({
    page: 0,
    totalPages: 0,
    totalElements: 0,
  })

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedFlight, setSelectedFlight] = useState<FlightSchedule | null>(null)
  const [bookingForm, setBookingForm] = useState({
    seatClass: '',
    numPassengers: 1,
    passengerNames: [''],
  })
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')

  useEffect(() => {
    const fetchInitialData = async () => {
      await Promise.all([loadAirports(), loadSchedules(0)])
    }
    fetchInitialData()
  }, [])

  const loadAirports = async () => {
    try {
      const response = await flightAPI.getAirports()
      // Handle both array response and paginated response
      if (Array.isArray(response)) {
        setAirports(response)
      } else {
        setAirports(response.content || [])
      }
    } catch (err) {
      console.error('Failed to load airports', err)
      // Don't show error for airports, just log it
    }
  }

  const loadSchedules = async (page: number) => {
    setLoading(true)
    setError('')
    try {
      const response = await flightAPI.getSchedulesPage({
        page,
        size: PAGE_SIZE,
        sortBy: 'departureTime',
        direction: 'ASC',
      })

      // Handle both array response (search) and paginated response
      if (Array.isArray(response)) {
        setFlights(response)
        setPageMeta({
          page: 0,
          totalPages: 1,
          totalElements: response.length,
        })
      } else {
        setFlights(response.content || [])
        setPageMeta({
          page: response.number ?? page,
          totalPages: response.totalPages ?? 0,
          totalElements: response.totalElements ?? 0,
        })
      }
      setSearchMode(false)
    } catch (err: any) {
      console.error('Error loading schedules:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load flights'
      setError(errorMessage)
      setFlights([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!searchParams.originName || !searchParams.destinationName || !searchParams.date) {
      setError('Please provide origin airport, destination airport, and departure date')
      return
    }

    setSearchLoading(true)
    try {
      const result = await flightAPI.searchSchedulesByNames(searchParams)
      setFlights(result)
      setSearchMode(true)
      setPageMeta({
        page: 0,
        totalPages: 1,
        totalElements: result.length,
      })
      if (result.length === 0) {
        setError('No flights found for the selected route and date.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search flights')
      setFlights([])
      setSearchMode(true)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleReset = () => {
    setSearchMode(false)
    setSearchParams((prev) => ({
      ...prev,
      originName: '',
      destinationName: '',
    }))
    setError('')
    loadSchedules(0)
  }

  const handlePageChange = (newPage: number) => {
    if (searchMode || newPage < 0 || newPage >= pageMeta.totalPages) return
    loadSchedules(newPage)
  }

  const airportOptions = useMemo(() => {
    return airports.map((airport) => ({
      label: `${airport.name} (${airport.code}) - ${airport.city}, ${airport.country}`,
      value: airport.name,
    }))
  }, [airports])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleBookNow = (flight: FlightSchedule) => {
    setSelectedFlight(flight)
    setBookingForm({
      seatClass: flight.fares?.[0]?.seatClass || '',
      numPassengers: 1,
      passengerNames: [''],
    })
    setBookingError('')
    setShowBookingModal(true)
  }

  const handleCloseModal = () => {
    setShowBookingModal(false)
    setSelectedFlight(null)
    setBookingError('')
  }

  const handleBookingFormChange = (field: string, value: any) => {
    setBookingForm((prev) => {
      const updated = { ...prev, [field]: value }

      // Update passenger names array when number changes
      if (field === 'numPassengers') {
        const num = parseInt(value, 10)
        // Prevent NaN or invalid numbers
        if (isNaN(num) || num < 1) {
          return prev // Don't update if invalid
        }
        updated.passengerNames = Array(num).fill('').map((_, i) => prev.passengerNames[i] || '')
      }

      return updated
    })
  }

  const handlePassengerNameChange = (index: number, name: string) => {
    setBookingForm((prev) => ({
      ...prev,
      passengerNames: prev.passengerNames.map((n, i) => (i === index ? name : n)),
    }))
  }

  const handleSubmitBooking = async () => {
    if (!selectedFlight) return

    // Validation
    if (!bookingForm.seatClass) {
      setBookingError('Please select a seat class')
      return
    }

    if (!bookingForm.numPassengers || bookingForm.numPassengers < 1) {
      setBookingError('Please enter a valid number of passengers')
      return
    }

    if (bookingForm.passengerNames.some((name) => !name.trim())) {
      setBookingError('Please enter all passenger names')
      return
    }

    if (!user) {
      setBookingError('You must be logged in to create a booking. Please log in and try again.')
      return
    }

    console.log('Current user:', user) // Debug log

    setBookingLoading(true)
    setBookingError('')

    try {
      const selectedFare = selectedFlight.fares?.find((f) => f.seatClass === bookingForm.seatClass)
      if (!selectedFare) {
        throw new Error('Selected fare not found')
      }

      const totalPrice = selectedFare.basePrice * bookingForm.numPassengers

      const bookingRequest = {
        booking_type: 'flight' as const,
        items: [
          {
            item_type: 'flight' as const,
            item_ref_id: selectedFlight.id,
            price: totalPrice,
            quantity: bookingForm.numPassengers,
            metadata: {
              passenger_names: bookingForm.passengerNames,
              seat_numbers: [], // Will be assigned by backend
            },
          },
        ],
      }

      console.log('Booking request:', bookingRequest) // Debug log

      await bookingAPI.createBooking(bookingRequest)

      // Success - close modal and navigate to booking history
      handleCloseModal()
      alert('Booking created successfully!')
      navigate('/bookings')
    } catch (err: any) {
      console.error('Booking error:', err)
      console.error('Error response:', err.response) // Debug log
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create booking. Please try again.'
      setBookingError(errorMsg)
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <div className="flights">
      <div className="flights-header">
        <h1>Flights</h1>
        <p>Browse available flights or search by airport names and departure date.</p>
      </div>

      <form className="flights-form" onSubmit={handleSearch}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="originName">Origin Airport</label>
            <input
              type="text"
              id="originName"
              name="originName"
              value={searchParams.originName}
              onChange={handleInputChange}
              list="airports-list"
              placeholder="e.g., Soekarno-Hatta International Airport"
            />
          </div>

          <div className="form-group">
            <label htmlFor="destinationName">Destination Airport</label>
            <input
              type="text"
              id="destinationName"
              name="destinationName"
              value={searchParams.destinationName}
              onChange={handleInputChange}
              list="airports-list"
              placeholder="e.g., Ngurah Rai International Airport"
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Departure Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={searchParams.date}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-search" type="submit" disabled={searchLoading}>
            {searchLoading ? 'Searching...' : 'Search Flights'}
          </button>
          {searchMode && (
            <button type="button" className="btn-reset" onClick={handleReset}>
              Reset Search
            </button>
          )}
        </div>
        <p className="form-helper">
          Tip: Start typing an airport name, city, or code to see suggestions. Matches are case-insensitive.
        </p>
      </form>

      <datalist id="airports-list">
        {airportOptions.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="flights-results">
        {loading && <p>Loading flight schedules...</p>}

        {!loading && flights.length === 0 && !error && (
          <p>{searchMode ? 'No flights matched your search.' : 'No flights available.'}</p>
        )}

        {flights.map((flight) => (
          <div className="flight-card" key={flight.id}>
            <div className="flight-card__header">
              <div>
                <h2>{flight.airlineName}</h2>
                <p className="flight-number">
                  {flight.flightNumber} &middot; {flight.status}
                </p>
              </div>
              <div className="flight-status">
                <span>{flight.originAirportCode}</span>
                <span className="flight-arrow">→</span>
                <span>{flight.destinationAirportCode}</span>
              </div>
            </div>

            <div className="flight-info">
              <div>
                <p className="label">Departure</p>
                <p>{new Date(flight.departureTime).toLocaleString()}</p>
                <p className="muted">{flight.originAirportName}</p>
              </div>
              <div>
                <p className="label">Arrival</p>
                <p>{new Date(flight.arrivalTime).toLocaleString()}</p>
                <p className="muted">{flight.destinationAirportName}</p>
              </div>
              <div>
                <p className="label">Duration</p>
                <p>{flight.durationMinutes} minutes</p>
              </div>
            </div>

            {flight.availableSeats?.length > 0 && (
              <div className="flight-seats">
                <p className="label">Seat Availability</p>
                <div className="seat-grid">
                  {flight.availableSeats.map((seat) => (
                    <div className="seat-card" key={`${flight.id}-${seat.seatClass}`}>
                      <p className="seat-class">{seat.seatClass}</p>
                      <p className="seat-availability">
                        {seat.availableCount} / {seat.totalCount} available
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {flight.fares?.length > 0 && (
              <div className="flight-fares">
                <p className="label">Fares</p>
                <div className="fare-grid">
                  {flight.fares.map((fare) => (
                    <div className="fare-card" key={`${flight.id}-${fare.seatClass}`}>
                      <p className="seat-class">{fare.seatClass}</p>
                      <p className="fare-price">
                        {fare.currency} {fare.basePrice.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {flight.fares?.length > 0 && (
              <div className="flight-actions">
                <button className="btn-book-now" onClick={() => handleBookNow(flight)}>
                  Book Now
                </button>
              </div>
            )}
          </div>
        ))}

        {!searchMode && pageMeta.totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => handlePageChange(pageMeta.page - 1)} disabled={pageMeta.page === 0}>
              Previous
            </button>
            <span>
              Page {pageMeta.page + 1} of {pageMeta.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pageMeta.page + 1)}
              disabled={pageMeta.page + 1 >= pageMeta.totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedFlight && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Book Flight</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="booking-summary">
                <h3>{selectedFlight.airlineName}</h3>
                <p className="flight-route">
                  {selectedFlight.originAirportCode} → {selectedFlight.destinationAirportCode}
                </p>
                <p className="flight-time">
                  {new Date(selectedFlight.departureTime).toLocaleString()}
                </p>
              </div>

              {bookingError && (
                <div className="error-message" role="alert">
                  {bookingError}
                </div>
              )}

              <div className="booking-form">
                <div className="form-group">
                  <label htmlFor="seatClass">Seat Class</label>
                  <select
                    id="seatClass"
                    value={bookingForm.seatClass}
                    onChange={(e) => handleBookingFormChange('seatClass', e.target.value)}
                    required
                  >
                    <option value="">Select seat class</option>
                    {selectedFlight.fares?.map((fare) => (
                      <option key={fare.seatClass} value={fare.seatClass}>
                        {fare.seatClass} - {fare.currency} {fare.basePrice.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="numPassengers">Number of Passengers</label>
                  <input
                    type="number"
                    id="numPassengers"
                    min="1"
                    max="10"
                    value={bookingForm.numPassengers}
                    onChange={(e) => handleBookingFormChange('numPassengers', e.target.value)}
                    required
                  />
                </div>

                <div className="passenger-names">
                  <label>Passenger Names</label>
                  {bookingForm.passengerNames.map((name, index) => (
                    <input
                      key={index}
                      type="text"
                      placeholder={`Passenger ${index + 1} name`}
                      value={name}
                      onChange={(e) => handlePassengerNameChange(index, e.target.value)}
                      required
                    />
                  ))}
                </div>

                {bookingForm.seatClass && (
                  <div className="price-summary">
                    <p className="total-price">
                      Total Price:{' '}
                      {selectedFlight.fares?.find((f) => f.seatClass === bookingForm.seatClass)
                        ?.currency}{' '}
                      {(
                        (selectedFlight.fares?.find((f) => f.seatClass === bookingForm.seatClass)
                          ?.basePrice || 0) * bookingForm.numPassengers
                      ).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseModal} disabled={bookingLoading}>
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmitBooking}
                disabled={bookingLoading}
              >
                {bookingLoading ? 'Processing...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Flights

