import { FormEvent, useEffect, useMemo, useState, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { trainAPI, TrainSchedule, Station, bookingAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import './Trains.css'

const PAGE_SIZE = 6

const Trains = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [trains, setTrains] = useState<TrainSchedule[]>([])
  const [stations, setStations] = useState<Station[]>([])
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
  const [selectedTrain, setSelectedTrain] = useState<TrainSchedule | null>(null)
  const [bookingForm, setBookingForm] = useState({
    seatClass: '',
    numPassengers: 1,
    passengerNames: [''],
  })
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')

  useEffect(() => {
    const fetchInitialData = async () => {
      await Promise.all([loadStations(), loadSchedules(0)])
    }
    fetchInitialData()
  }, [])

  const loadStations = async () => {
    try {
      const response = await trainAPI.getStations()
      setStations(response)
    } catch (err) {
      console.error('Failed to load stations', err)
    }
  }

  const loadSchedules = async (page: number) => {
    setLoading(true)
    setError('')
    try {
      const response = await trainAPI.getSchedulesPage({
        page,
        size: PAGE_SIZE,
        sortBy: 'departureTime',
        direction: 'ASC',
      })

      // Handle both array response (search) and paginated response
      if (Array.isArray(response)) {
        setTrains(response)
        setPageMeta({
          page: 0,
          totalPages: 1,
          totalElements: response.length,
        })
      } else {
        setTrains(response.content || [])
        setPageMeta({
          page: response.number ?? page,
          totalPages: response.totalPages ?? 0,
          totalElements: response.totalElements ?? 0,
        })
      }
      setSearchMode(false)
    } catch (err: any) {
      console.error('Error loading schedules:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load trains'
      setError(errorMessage)
      setTrains([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!searchParams.originName || !searchParams.destinationName || !searchParams.date) {
      setError('Please provide origin station, destination station, and departure date')
      return
    }

    setSearchLoading(true)
    try {
      const result = await trainAPI.searchSchedulesByNames(searchParams)
      setTrains(result)
      setSearchMode(true)
      setPageMeta({
        page: 0,
        totalPages: 1,
        totalElements: result.length,
      })
      if (result.length === 0) {
        setError('No trains found for the selected route and date.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search trains')
      setTrains([])
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

  const stationOptions = useMemo(() => {
    return stations.map((station) => ({
      label: `${station.name} (${station.code}) - ${station.city}`,
      value: station.name,
    }))
  }, [stations])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchParams((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const formatDuration = (departure: string, arrival: string) => {
    const dep = new Date(departure)
    const arr = new Date(arrival)
    const diffMs = arr.getTime() - dep.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const handleBookNow = (train: TrainSchedule) => {
    setSelectedTrain(train)
    setBookingForm({
      seatClass: train.availableSeats?.[0]?.seatClass || '',
      numPassengers: 1,
      passengerNames: [''],
    })
    setBookingError('')
    setShowBookingModal(true)
  }

  const handleCloseModal = () => {
    setShowBookingModal(false)
    setSelectedTrain(null)
    setBookingError('')
  }

  const handleBookingFormChange = (field: string, value: any) => {
    setBookingForm((prev) => {
      const updated = { ...prev, [field]: value }
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
    if (!selectedTrain) return

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
      setBookingError('You must be logged in to create a booking')
      return
    }

    setBookingLoading(true)
    setBookingError('')

    try {
      // For trains, we'll use a base price (this should ideally come from backend)
      const basePrice = 100000 // Default price in IDR
      const totalPrice = basePrice * bookingForm.numPassengers

      await bookingAPI.createBooking({
        booking_type: 'train',
        items: [
          {
            item_type: 'train',
            item_ref_id: selectedTrain.id,
            price: totalPrice,
            quantity: bookingForm.numPassengers,
            metadata: {
              passenger_names: bookingForm.passengerNames,
              seat_numbers: [],
            },
          },
        ],
      })

      handleCloseModal()
      alert('Booking created successfully!')
      navigate('/bookings')
    } catch (err: any) {
      console.error('Booking error:', err)
      setBookingError(err.response?.data?.message || 'Failed to create booking. Please try again.')
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <div className="trains">
      <div className="trains-header">
        <h1>Trains</h1>
        <p>Browse available train schedules or search by station names and departure date.</p>
      </div>

      <form className="trains-form" onSubmit={handleSearch}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="originName">Origin Station</label>
            <input
              type="text"
              id="originName"
              name="originName"
              value={searchParams.originName}
              onChange={handleInputChange}
              list="stations-list"
              placeholder="e.g., Gambir"
            />
          </div>

          <div className="form-group">
            <label htmlFor="destinationName">Destination Station</label>
            <input
              type="text"
              id="destinationName"
              name="destinationName"
              value={searchParams.destinationName}
              onChange={handleInputChange}
              list="stations-list"
              placeholder="e.g., Bandung"
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
            {searchLoading ? 'Searching...' : 'Search Trains'}
          </button>
          {searchMode && (
            <button type="button" className="btn-reset" onClick={handleReset}>
              Reset Search
            </button>
          )}
        </div>
        <p className="form-helper">
          Tip: Start typing a station name, city, or code to see suggestions. Matches are case-insensitive.
        </p>
      </form>

      <datalist id="stations-list">
        {stationOptions.map((option) => (
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

      <div className="trains-results">
        {loading && <p>Loading train schedules...</p>}

        {!loading && trains.length === 0 && !error && (
          <p>{searchMode ? 'No trains matched your search.' : 'No trains available.'}</p>
        )}

        {trains.map((train) => (
          <div className="train-card" key={train.id}>
            <div className="train-card__header">
              <div>
                <h2>{train.operator}</h2>
                <p className="train-number">
                  {train.trainNumber} &middot; {train.status}
                </p>
              </div>
              <div className="train-status">
                <span>{train.departureStationCode}</span>
                <span className="train-arrow">→</span>
                <span>{train.arrivalStationCode}</span>
              </div>
            </div>

            <div className="train-info">
              <div>
                <p className="label">Departure</p>
                <p>{new Date(train.departureTime).toLocaleString()}</p>
                <p className="muted">{train.departureStationName}</p>
                <p className="muted">{train.departureCity}</p>
              </div>
              <div>
                <p className="label">Arrival</p>
                <p>{new Date(train.arrivalTime).toLocaleString()}</p>
                <p className="muted">{train.arrivalStationName}</p>
                <p className="muted">{train.arrivalCity}</p>
              </div>
              <div>
                <p className="label">Duration</p>
                <p>{formatDuration(train.departureTime, train.arrivalTime)}</p>
              </div>
            </div>

            {train.availableSeats?.length > 0 && (
              <div className="train-seats">
                <p className="label">Seat Availability</p>
                <div className="seat-grid">
                  {train.availableSeats.map((seat) => (
                    <div className="seat-card" key={`${train.id}-${seat.seatClass}`}>
                      <p className="seat-class">{seat.seatClass}</p>
                      <p className="seat-availability">
                        {seat.availableCount} / {seat.totalCount} available
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {train.availableSeats?.length > 0 && (
              <div className="train-actions">
                <button className="btn-book-now" onClick={() => handleBookNow(train)}>
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
      {showBookingModal && selectedTrain && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Book Train</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="booking-summary">
                <h3>{selectedTrain.operator}</h3>
                <p className="train-route">
                  {selectedTrain.departureStationCode} → {selectedTrain.arrivalStationCode}
                </p>
                <p className="train-time">
                  {new Date(selectedTrain.departureTime).toLocaleString()}
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
                    {selectedTrain.availableSeats?.map((seat) => (
                      <option key={seat.seatClass} value={seat.seatClass}>
                        {seat.seatClass} - {seat.availableCount} seats available
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
                      Total Price: IDR {(100000 * bookingForm.numPassengers).toLocaleString()}
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                      Base price: IDR 100,000 per passenger
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

export default Trains

