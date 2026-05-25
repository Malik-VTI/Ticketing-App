import { FormEvent, useEffect, useState, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { flightAPI, FlightSchedule, Airport, bookingAPI, PricingResponse } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import Skeleton from '../components/Skeleton'
import PromoCodeInput from '../components/PromoCodeInput'
import DateCarousel from '../components/shared/DateCarousel'
import FilterSidebar from '../components/shared/FilterSidebar'
import PaginationControls from '../components/shared/PaginationControls'
import BookingModal from '../components/shared/BookingModal'
import './Flights.css' // We will create this

const PAGE_SIZE = 6

const Flights = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  
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

  // Filters and sorting
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc')

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
  const [calculatedPricing, setCalculatedPricing] = useState<PricingResponse | null>(null)
  const [allocatedSeatNumbers, setAllocatedSeatNumbers] = useState<string[]>([])
  const [seatsAllocationLoading, setSeatsAllocationLoading] = useState(false)
  const [seatsAllocationError, setSeatsAllocationError] = useState('')

  useEffect(() => {
    const fetchInitialData = async () => {
      await Promise.all([loadAirports(), loadSchedules(0)])
    }
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (!showBookingModal || !selectedFlight?.id || !bookingForm.seatClass) {
      setAllocatedSeatNumbers([])
      setSeatsAllocationError('')
      setSeatsAllocationLoading(false)
      return
    }

    let cancelled = false
    setSeatsAllocationLoading(true)
    setSeatsAllocationError('')
    setAllocatedSeatNumbers([])

    const cls = bookingForm.seatClass.toLowerCase()
    flightAPI
      .getAvailableSeats(selectedFlight.id)
      .then((available) => {
        if (cancelled) return
        const matching = available.filter(
          (s) =>
            (s.seatClass ?? '').toLowerCase() === cls &&
            (s.status ?? '').toLowerCase() === 'available'
        )
        const n = bookingForm.numPassengers
        if (matching.length < n) {
          setSeatsAllocationError(
            `Only ${matching.length} seat(s) available in ${bookingForm.seatClass} for this flight (need ${n}).`
          )
          return
        }
        setAllocatedSeatNumbers(matching.slice(0, n).map((s) => s.seatNumber))
      })
      .catch(() => {
        if (!cancelled) {
          setSeatsAllocationError('Could not load available seats. Try again or pick another class.')
        }
      })
      .finally(() => {
        if (!cancelled) setSeatsAllocationLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [showBookingModal, selectedFlight?.id, bookingForm.seatClass, bookingForm.numPassengers])

  // Fix 2.1: Refetch on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (searchMode) {
          handleSearch(new Event('submit') as any)
        } else {
          loadSchedules(pageMeta.page)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [searchMode, pageMeta.page, searchParams])

  // Fix 2.2: Automatically search when date changes
  useEffect(() => {
    if (searchParams.originName && searchParams.destinationName && searchParams.date) {
      handleSearch(new Event('submit') as any)
    }
  }, [searchParams.date])

  const loadAirports = async () => {
    try {
      const response = await flightAPI.getAirports()
      if (Array.isArray(response)) {
        setAirports(response)
      } else {
        setAirports(response.content || [])
      }
    } catch (err) {
      console.error('Failed to load airports', err)
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

      if (Array.isArray(response)) {
        setFlights(response)
        setPageMeta({ page: 0, totalPages: 1, totalElements: response.length })
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
      setError(err.response?.data?.message || err.message || 'Failed to load flights')
      setFlights([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!searchParams.originName || !searchParams.destinationName || !searchParams.date) {
      setError('Please provide origin, destination, and departure date')
      return
    }

    setSearchLoading(true)
    try {
      const result = await flightAPI.searchSchedulesByNames(searchParams)
      setFlights(result)
      setSearchMode(true)
      setPageMeta({ page: 0, totalPages: 1, totalElements: result.length })
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

  const handleSwapAirports = () => {
    setSearchParams(prev => ({
      ...prev,
      originName: prev.destinationName,
      destinationName: prev.originName
    }))
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSearchParams((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  /* Booking Logic */
  const handleBookNow = (flight: FlightSchedule) => {
    setSelectedFlight(flight)
    setBookingForm({
      seatClass: flight.fares?.[0]?.seatClass || '',
      numPassengers: 1,
      passengerNames: [''],
    })
    setBookingError('')
    setCalculatedPricing(null)
    setAllocatedSeatNumbers([])
    setSeatsAllocationError('')
    setShowBookingModal(true)
  }

  const handleCloseModal = () => {
    setShowBookingModal(false)
    setSelectedFlight(null)
    setBookingError('')
    setCalculatedPricing(null)
    setAllocatedSeatNumbers([])
    setSeatsAllocationError('')
  }

  const handleBookingFormChange = (field: string, value: any) => {
    setBookingForm((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === 'numPassengers') {
        const num = parseInt(value, 10)
        if (isNaN(num) || num < 1) return prev
        updated.numPassengers = num
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
    if (!bookingForm.seatClass) return setBookingError('Please select a seat class')
    if (!bookingForm.numPassengers || bookingForm.numPassengers < 1) return setBookingError('Valid number of passengers required')
    if (bookingForm.passengerNames.some((name) => !name.trim())) return setBookingError('Please enter all passenger names')
    if (!user) return setBookingError('You must be logged in to create a booking')
    if (!calculatedPricing) return setBookingError('Pricing is still calculating or failed. Please refresh.')
    if (seatsAllocationLoading) return setBookingError('Still assigning seats…')
    if (seatsAllocationError) return setBookingError(seatsAllocationError)
    if (allocatedSeatNumbers.length !== bookingForm.numPassengers) {
      return setBookingError('Seat assignment does not match passenger count. Adjust class or passenger count.')
    }

    setBookingLoading(true)
    setBookingError('')

    try {
      const fareClass = bookingForm.seatClass.toLowerCase()
      const selectedFare = selectedFlight.fares?.find((f) => f.seatClass.toLowerCase() === fareClass)
      if (!selectedFare) throw new Error('Selected fare not found')

      const itemPrice = calculatedPricing.totalPrice / bookingForm.numPassengers
      await bookingAPI.createBooking({
        booking_type: 'flight',
        items: [
          {
            item_type: 'flight',
            item_ref_id: selectedFlight.id,
            price: itemPrice,
            quantity: Number(bookingForm.numPassengers),
            metadata: {
              passenger_names: bookingForm.passengerNames,
              seat_numbers: allocatedSeatNumbers,
            },
          },
        ],
      })
      handleCloseModal()
      showToast('Flight booked successfully!', 'success')
      navigate('/bookings')
    } catch (err: any) {
      setBookingError(err.response?.data?.message || 'Failed to create booking. Please try again.')
    } finally {
      setBookingLoading(false)
    }
  }

  const formatDuration = (departureStr: string, arrivalStr: string) => {
    const dep = new Date(departureStr)
    const arr = new Date(arrivalStr)
    const diffMs = arr.getTime() - dep.getTime()
    if (diffMs <= 0) return '-'
    const diffMins = Math.floor(diffMs / 60000)
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }

  const getFlightPrice = (seatClass: string) => {
    switch(seatClass.toLowerCase()) {
      case 'first class': return 2500000;
      case 'business': return 1500000;
      default: return 800000;
    }
  }

  return (
    <div className="flights-page container">
      {/* 1. Header Search Bar Area */}
      <section className="search-banner">
        <form className="search-bar" onSubmit={handleSearch}>
          <div className="search-field">
            <label>From</label>
            <div className="input-with-icon">
              <span>🛫</span>
              <input
                type="text"
                name="originName"
                value={searchParams.originName}
                onChange={handleInputChange}
                list="airports-list"
                placeholder="Origin"
              />
            </div>
          </div>

          <button type="button" className="btn-swap" onClick={handleSwapAirports}>
            ⇄
          </button>

          <div className="search-field">
            <label>To</label>
            <div className="input-with-icon">
              <span>🛬</span>
              <input
                type="text"
                name="destinationName"
                value={searchParams.destinationName}
                onChange={handleInputChange}
                list="airports-list"
                placeholder="Destination"
              />
            </div>
          </div>

          <div className="search-divider"></div>

          <div className="search-field">
            <label className="flex-spaceBetween">
              Depart
              <span className="return-check">
                Return <input type="checkbox" />
              </span>
            </label>
            <div className="input-with-icon">
              <span>📅</span>
              <input
                type="date"
                name="date"
                value={searchParams.date}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="search-field">
            <label>Passengers</label>
            <div className="input-with-icon">
              <span>👤</span>
              <select>
                <option value="1 adult">1 adult</option>
                <option value="2 adult">2 adult</option>
                <option value="3 adult">3 adult</option>
              </select>
            </div>
          </div>

          <div className="search-field">
            <label>Class</label>
            <div className="input-with-icon">
              <span>✈️</span>
              <select>
                <option value="Economy">Economy</option>
                <option value="Business">Business</option>
                <option value="First Class">First Class</option>
              </select>
            </div>
          </div>

          <button className="btn-search-primary" type="submit" disabled={searchLoading}>
            {searchLoading ? '...' : 'Search Flight'}
          </button>
        </form>
        <datalist id="airports-list">
          {airports.map((a) => (
            <option key={a.id} value={a.name}>{a.name} ({a.code}) - {a.city}, {a.country}</option>
          ))}
        </datalist>
      </section>

      {/* 2. Main 3 Column Layout */}
      {error && (
        <div className="alert-error" style={{marginTop: '24px'}}>
          <span className="alert-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}
      
      <section className="main-content-grid" style={{marginTop: error ? '16px' : '24px'}}>
        
        <FilterSidebar 
          filters={filters}
          onFilterChange={(groupId, value, checked) => {
            setFilters(prev => {
              const groupFilters = prev[groupId] || []
              if (checked) return { ...prev, [groupId]: [...groupFilters, value] }
              return { ...prev, [groupId]: groupFilters.filter(v => v !== value) }
            })
          }}
          onReset={() => { setFilters({}); loadSchedules(0) }}
          groups={[
            {
              id: 'class', title: 'Class', type: 'checkbox',
              options: [
                { label: 'Economy', value: 'Economy' },
                { label: 'Business', value: 'Business' },
                { label: 'First Class', value: 'First Class' }
              ]
            }
          ]}
        />

        {/* Mid Col: Results */}
        <div className="results-container">
          <div className="results-header">
            <div>
              <h2 style={{fontSize: '1.25rem', marginBottom: '4px'}}>Select Outbound Flight <span style={{fontSize: '0.9rem', color: '#9ca3af', fontWeight: 400}}>( The best Flight found at the best prices )</span></h2>
            </div>
            <div className="results-actions">
              <button className="btn-secondary" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} style={{ padding: '4px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
                Sort Price {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          <DateCarousel 
            baseDate={searchParams.date} 
            onDateChange={(newDate) => setSearchParams(p => ({...p, date: newDate}))} 
          />

          {loading ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <Skeleton type="card" count={3} height="200px" />
            </div>
          ) : flights.length === 0 ? (
            <div style={{padding: '24px', textAlign: 'center'}}>No flights available.</div>
          ) : null}

          <div className="train-list">
            {(() => {
              let displayedFlights = flights
              
              if (filters.class && filters.class.length > 0) {
                displayedFlights = displayedFlights.filter(t => t.availableSeats?.some(s => filters.class.includes(s.seatClass || '')))
              }
              
              displayedFlights.sort((a, b) => {
                const aPrice = getFlightPrice(a.availableSeats?.[0]?.seatClass || 'Economy')
                const bPrice = getFlightPrice(b.availableSeats?.[0]?.seatClass || 'Economy')
                return sortOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice
              })

              if (displayedFlights.length === 0 && !loading) {
                return <div style={{padding: '24px', textAlign: 'center'}}>No matching flights.</div>
              }

              return displayedFlights.map(flight => {
                const depDate = new Date(flight.departureTime);
                const arrDate = new Date(flight.arrivalTime);
                
                return (
                  <div className="train-row-card" key={flight.id}>
                    <div className="row-card-top">
                      <div className="route-info">
                        <span className="origin">{flight.originAirportName || flight.originCity}</span>
                        <span className="arrow">✈</span>
                        <span className="destination">{flight.destinationAirportName || flight.destinationCity}</span>
                      </div>
                      <div className="times">
                        <span className="time-block">
                          <strong>{depDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
                          <small>{depDate.toLocaleDateString()}</small>
                        </span>
                        <span className="duration">
                          {formatDuration(flight.departureTime, flight.arrivalTime)}
                        </span>
                        <span className="time-block">
                          <strong>{arrDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
                          <small>{arrDate.toLocaleDateString()}</small>
                        </span>
                      </div>
                    </div>
                    <div className="row-card-bottom">
                      <div className="train-details">
                        <div className="train-name">{flight.airlineName} {flight.flightNumber}</div>
                        <div className="train-class">{flight.availableSeats?.[0]?.seatClass || 'Economy'}</div>
                        <div className="train-facilities">
                          <span>🍽️ Meal</span>
                          <span>📶 WiFi</span>
                          <span>🧳 Baggage</span>
                        </div>
                      </div>
                      <div className="price-action">
                        <div className="price-text"><span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(getFlightPrice(flight.availableSeats?.[0]?.seatClass || 'Economy'))}</span> / Person</div>
                        <button className="btn-buy-now" onClick={() => handleBookNow(flight)}>Buy Now</button>
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
          <PaginationControls pageMeta={pageMeta} onPageChange={loadSchedules} />
        </div>

        {/* Right Col: Promos & Stats */}
        <aside className="right-sidebar">
          <div className="widget-card discounts-widget">
            <div className="widget-header">
              <h3>🎫 Discount</h3>
              <a href="#">See all</a>
            </div>
            <div className="redeem-bar">Redeem no Discount</div>
            
            <div className="promo-card">
              <div className="promo-top">
                <div className="promo-icon" style={{background: '#f97316'}}>🧳</div>
                <div>
                  <h4>Discount on Extra Baggage up to 60%</h4>
                  <p>Minimum ticket purchase $400</p>
                </div>
              </div>
              <div className="promo-code-box">
                210-994-308-281 <span>📋</span>
              </div>
            </div>

            <div className="promo-card">
              <div className="promo-top">
                <div className="promo-icon" style={{background: '#3b82f6'}}>🎫</div>
                <div>
                  <h4>15% Off Your Next First Class Flight</h4>
                  <p>Discount for departures at 6 am</p>
                </div>
              </div>
              <div className="promo-code-box">
                SAVE15-VIP-991 <span>📋</span>
              </div>
            </div>
          </div>

          <div className="widget-card seat-widget">
            <h3>Seat availability</h3>
            <div className="chart-container">
              <div className="donut-chart">
                <div className="donut-hole">
                  <span className="percent">85%</span>
                  <span className="sub">Full seats</span>
                </div>
              </div>
            </div>
            <div className="chart-legend">
              <span><span className="dot" style={{background: '#10b981'}}></span> Economy</span>
              <span><span className="dot" style={{background: '#3b82f6'}}></span> Business</span>
              <span><span className="dot" style={{background: '#f97316'}}></span> First</span>
            </div>
          </div>
        </aside>
      </section>

      {/* Booking Modal */}
      {selectedFlight && (
        <BookingModal isOpen={showBookingModal} title="Book Flight" onClose={handleCloseModal}>
          <>
            <div className="booking-summary">
              <h3>{selectedFlight.airlineName}</h3>
              <p className="flight-route">{selectedFlight.originAirportName || selectedFlight.originCity} → {selectedFlight.destinationAirportName || selectedFlight.destinationCity}</p>
              <p className="flight-time">{new Date(selectedFlight.departureTime).toLocaleString?.() ?? ''}</p>
            </div>
            {bookingError && <div className="error-message" role="alert">{bookingError}</div>}
            <div className="booking-form">
              <div className="form-group">
                <label>Seat Class</label>
                <select value={bookingForm.seatClass} onChange={(e) => handleBookingFormChange('seatClass', e.target.value)} required>
                  <option value="">Select seat class</option>
                  {selectedFlight.availableSeats?.map((s) => (
                    <option key={s.seatClass} value={s.seatClass}>{s.seatClass} - {s.availableCount} available</option>
                  ))}
                </select>
                  {bookingForm.seatClass && seatsAllocationLoading && (
                    <p className="text-muted" style={{ marginTop: 8, fontSize: '0.875rem' }}>Assigning seats…</p>
                  )}
                  {seatsAllocationError && (
                    <div className="alert-error" style={{ marginTop: 8 }} role="alert">
                      <span className="alert-icon">⚠️</span>
                      {seatsAllocationError}
                    </div>
                  )}
                  {!seatsAllocationLoading && !seatsAllocationError && allocatedSeatNumbers.length > 0 && (
                    <p style={{ marginTop: 8, fontSize: '0.875rem', color: '#374151' }}>
                      Seats reserved for booking: <strong>{allocatedSeatNumbers.join(', ')}</strong>
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label>Number of Passengers</label>
                  <input type="number" min="1" max="10" value={bookingForm.numPassengers} onChange={(e) => handleBookingFormChange('numPassengers', e.target.value)} required />
                </div>
                <div className="passenger-names">
                  <label>Passenger Names</label>
                  {bookingForm.passengerNames.map((name, index) => (
                    <input key={index} type="text" placeholder={`Passenger ${index + 1} name`} value={name} onChange={(e) => handlePassengerNameChange(index, e.target.value)} required />
                  ))}
                </div>
                {bookingForm.seatClass && (
                  <div className="price-summary" style={{ padding: 0, border: 'none', marginTop: '1rem', background: 'transparent' }}>
                    <PromoCodeInput
                      basePrice={
                        (selectedFlight.fares?.find(
                          (f) => f.seatClass.toLowerCase() === bookingForm.seatClass.toLowerCase()
                        )?.basePrice || 0) * bookingForm.numPassengers
                      }
                      currency={
                        selectedFlight.fares?.find(
                          (f) => f.seatClass.toLowerCase() === bookingForm.seatClass.toLowerCase()
                        )?.currency || 'IDR'
                      }
                      onPriceCalculated={setCalculatedPricing}
                      onError={setBookingError}
                    />
                  </div>
                )}
              </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn-cancel" onClick={handleCloseModal} disabled={bookingLoading}>Cancel</button>
              <button
                className="btn-submit"
                onClick={handleSubmitBooking}
                disabled={
                  bookingLoading ||
                  !calculatedPricing ||
                  seatsAllocationLoading ||
                  !!seatsAllocationError ||
                  allocatedSeatNumbers.length !== bookingForm.numPassengers
                }
              >
                {bookingLoading ? 'Processing...' : 'Confirm Booking'}
              </button>
            </div>
          </>
        </BookingModal>
      )}
    </div>
  )
}

export default Flights
