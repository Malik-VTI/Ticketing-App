import { FormEvent, useEffect, useMemo, useState, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { flightAPI, FlightSchedule, Airport, bookingAPI, PricingResponse } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import Skeleton from '../components/Skeleton'
import PromoCodeInput from '../components/PromoCodeInput'
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

  // Mock filters for UI
  const [isReturn, setIsReturn] = useState(false)
  const [passengers, setPassengers] = useState('1 adult')
  const [seatClass, setSeatClass] = useState('Economy')

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

  useEffect(() => {
    const fetchInitialData = async () => {
      await Promise.all([loadAirports(), loadSchedules(0)])
    }
    fetchInitialData()
  }, [])

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
    setShowBookingModal(true)
  }

  const handleCloseModal = () => {
    setShowBookingModal(false)
    setSelectedFlight(null)
    setBookingError('')
    setCalculatedPricing(null)
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

    setBookingLoading(true)
    setBookingError('')

    try {
      const selectedFare = selectedFlight.fares?.find((f) => f.seatClass === bookingForm.seatClass)
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
            metadata: { passenger_names: bookingForm.passengerNames },
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

  // Generate dynamic date carousel starting from selected date
  const baseDate = searchParams.date ? new Date(searchParams.date) : new Date()
  const dateCarousel = Array.from({length: 6}).map((_, i) => {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + i)
    return {
      iso: d.toISOString().split('T')[0],
      dateStr: `${d.getDate()} ${d.toLocaleString?.('default', { month: 'short' }) ?? ''}`,
      dayStr: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
    }
  })

  // Helper formatting
  const formatDurationFriendly = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
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
                Return <input type="checkbox" checked={isReturn} onChange={e => setIsReturn(e.target.checked)}/>
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
              <select value={passengers} onChange={e => setPassengers(e.target.value)}>
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
              <select value={seatClass} onChange={e => setSeatClass(e.target.value)}>
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
        
        {/* Left Col: Filters */}
        <aside className="filters-sidebar">
          <div className="filter-header">
            <h3>Filter</h3>
            <button className="btn-reset-filters" type="button" onClick={() => loadSchedules(0)}>Reset</button>
          </div>

          <div className="filter-group">
            <h4>Price Range <span className="chevron">⌄</span></h4>
            <div className="price-inputs">
              <input type="text" placeholder="$0,00" value="$290,00" readOnly/>
              <input type="text" placeholder="$0,00" value="$1200,00" readOnly/>
            </div>
          </div>

          <div className="filter-group">
            <h4>Airlines <span className="chevron">⌄</span></h4>
            <label className="checkbox-label"><span>All</span> <input type="checkbox" /></label>
            <label className="checkbox-label"><span>Garuda Indonesia</span> <input type="checkbox" defaultChecked /></label>
            <label className="checkbox-label"><span>Citilink</span> <input type="checkbox" /></label>
            <label className="checkbox-label"><span>Batik Air</span> <input type="checkbox" /></label>
          </div>

          <div className="filter-group">
            <h4>Departure <span className="chevron">⌄</span></h4>
            <label className="checkbox-label"><span>All</span> <input type="checkbox" defaultChecked/></label>
            <label className="checkbox-label"><span>07.00 - 12.00</span> <input type="checkbox" /></label>
            <label className="checkbox-label"><span>12.00 - 19.00</span> <input type="checkbox" /></label>
            <label className="checkbox-label"><span>19.00 - 24.00</span> <input type="checkbox" /></label>
          </div>

          <div className="filter-group">
            <h4>Transit <span className="chevron">⌄</span></h4>
            <label className="checkbox-label"><span>Direct</span> <input type="checkbox" defaultChecked/></label>
            <label className="checkbox-label"><span>1 Transit</span> <input type="checkbox" /></label>
            <label className="checkbox-label"><span>2+ Transits</span> <input type="checkbox" /></label>
          </div>
        </aside>

        {/* Mid Col: Results */}
        <div className="results-container">
          <div className="results-header">
            <div>
              <h2 style={{fontSize: '1.25rem', marginBottom: '4px'}}>Select Outbound Flight <span style={{fontSize: '0.9rem', color: '#9ca3af', fontWeight: 400}}>( The best Flight found at the best prices )</span></h2>
            </div>
            <div className="results-actions">
              <span className="sort-text">Sort =</span>
              <span className="view-toggle">
                <span className="icon">㗊</span>
                <span className="icon active">≣</span>
              </span>
            </div>
          </div>

          <div className="date-carousel">
            <button className="nav-btn">&lt;</button>
            {dateCarousel.map((d, i) => (
              <div key={i} className={`date-tab ${i === 0 ? 'active' : ''}`} onClick={() => setSearchParams(p => ({...p, date: d.iso}))}>
                <span className="date">{d.dateStr}</span>
                <span className="day">{d.dayStr}</span>
              </div>
            ))}
            <button className="nav-btn">&gt;</button>
          </div>

          {loading ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <Skeleton type="card" count={3} height="200px" />
            </div>
          ) : flights.length === 0 ? (
            <div style={{padding: '24px', textAlign: 'center'}}>No flights available.</div>
          ) : null}

          <div className="flight-list">
            {flights.map(flight => {
              const depDate = new Date(flight.departureTime);
              const arrDate = new Date(flight.arrivalTime);
              // Pick fastest fare price to show
              const lowestFare = flight.fares?.length > 0 ? flight.fares[0] : { basePrice: 0, currency: 'IDR' };
              
              return (
                <div className="flight-row-card" key={flight.id}>
                  <div className="row-card-top">
                    <div className="route-info">
                      <span className="origin">{flight.originAirportName}</span>
                      <span className="arrow">→</span>
                      <span className="dest">{flight.destinationAirportName}</span>
                    </div>
                    <div className="rating">
                      <span className="star">★</span> 4.8 <span className="bookmark">🔖</span>
                    </div>
                  </div>
                  
                  <div className="flight-class-label">
                    {flight.airlineName} {flight.flightNumber} - {flight.fares?.[0]?.seatClass || 'Economy'} class
                  </div>

                  <div className="timeline-row">
                    <div className="time-block">
                      <div className="time">{depDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      <div className="station-code">❖ {flight.originAirportCode} - Airport</div>
                    </div>
                    
                    <div className="duration-track">
                      <div className="line">
                        <span className="flight-icon-mid">✈️</span>
                      </div>
                      <div className="duration-text">Estimate: {formatDurationFriendly(flight.durationMinutes)}</div>
                    </div>

                    <div className="time-block right-align">
                      <div className="time">{arrDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      <div className="station-code">{flight.destinationAirportCode} - Airport ❖</div>
                    </div>
                  </div>

                  <div className="row-card-bottom">
                    <div className="facilities">
                      <p>Fasilities</p>
                      <div className="tags">
                        <span>🧳 20KG</span>
                        <span>🍔 Food</span>
                        <span>📺 Entert.</span>
                        <span>🔌 USB Port</span>
                      </div>
                    </div>
                    <div className="price-action">
                      <div className="price-text"><span>{lowestFare.currency} {lowestFare.basePrice}</span> / Person</div>
                      <button className="btn-buy-now" onClick={() => handleBookNow(flight)}>Buy Now</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
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
      {showBookingModal && selectedFlight && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Book Flight</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="booking-summary">
                <h3>{selectedFlight.airlineName}</h3>
                <p className="flight-route">{selectedFlight.originAirportName} → {selectedFlight.destinationAirportName}</p>
                <p className="flight-time">{new Date(selectedFlight.departureTime).toLocaleString?.() ?? ''}</p>
              </div>
              {bookingError && <div className="alert-error" role="alert"><span className="alert-icon">⚠️</span>{bookingError}</div>}
              <div className="booking-form">
                <div className="form-group">
                  <label>Seat Class</label>
                  <select value={bookingForm.seatClass} onChange={(e) => handleBookingFormChange('seatClass', e.target.value)} required>
                    <option value="">Select seat class</option>
                    {selectedFlight.fares?.map((f) => (
                      <option key={f.seatClass} value={f.seatClass}>{f.seatClass} - {f.currency} {f.basePrice}</option>
                    ))}
                  </select>
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
                      basePrice={(selectedFlight.fares?.find((f) => f.seatClass === bookingForm.seatClass)?.basePrice || 0) * bookingForm.numPassengers} 
                      currency={selectedFlight.fares?.find((f) => f.seatClass === bookingForm.seatClass)?.currency || 'IDR'} 
                      onPriceCalculated={setCalculatedPricing} 
                      onError={setBookingError} 
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseModal} disabled={bookingLoading}>Cancel</button>
              <button className="btn-submit" onClick={handleSubmitBooking} disabled={bookingLoading || !calculatedPricing}>
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
