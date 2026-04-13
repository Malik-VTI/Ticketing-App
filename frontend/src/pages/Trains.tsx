import { FormEvent, useEffect, useState, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { trainAPI, TrainSchedule, Station, bookingAPI, PricingResponse } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import Skeleton from '../components/Skeleton'
import PromoCodeInput from '../components/PromoCodeInput'
import './Trains.css'

const PAGE_SIZE = 6

const Trains = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  
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
  const [_searchMode, setSearchMode] = useState(false)
  const [_pageMeta, setPageMeta] = useState({
    page: 0,
    totalPages: 0,
    totalElements: 0,
  })

  // Mock filters for UI
  const [isReturn, setIsReturn] = useState(false)
  const [passengers, setPassengers] = useState('2 adult')
  const [seatClass, setSeatClass] = useState('Economy')

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
  const [calculatedPricing, setCalculatedPricing] = useState<PricingResponse | null>(null)
  const [allocatedSeatNumbers, setAllocatedSeatNumbers] = useState<string[]>([])
  const [seatsAllocationLoading, setSeatsAllocationLoading] = useState(false)
  const [seatsAllocationError, setSeatsAllocationError] = useState('')

  useEffect(() => {
    const fetchInitialData = async () => {
      await Promise.all([loadStations(), loadSchedules(0)])
    }
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (!showBookingModal || !selectedTrain?.id || !bookingForm.seatClass) {
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
    trainAPI
      .getAvailableSeats(selectedTrain.id)
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
            `Only ${matching.length} seat(s) available in ${bookingForm.seatClass} for this train (need ${n}).`
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
  }, [showBookingModal, selectedTrain?.id, bookingForm.seatClass, bookingForm.numPassengers])

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

      if (Array.isArray(response)) {
        setTrains(response)
        setPageMeta({ page: 0, totalPages: 1, totalElements: response.length })
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
      setError(err.response?.data?.message || err.message || 'Failed to load trains')
      setTrains([])
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
      const result = await trainAPI.searchSchedulesByNames(searchParams)
      setTrains(result)
      setSearchMode(true)
      setPageMeta({ page: 0, totalPages: 1, totalElements: result.length })
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

  const handleSwapStations = () => {
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

  const formatDuration = (departure: string, arrival: string) => {
    const dep = new Date(departure)
    const arr = new Date(arrival)
    const diffMs = arr.getTime() - dep.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const _getDayAndDateStr = (dateStr: string) => {
    const d = new Date(dateStr)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return {
      date: `${d.getDate()} ${d.toLocaleString?.('default', { month: 'short' }) ?? ''}`,
      day: days[d.getDay()]
    }
  }

  /* Booking Logic */
  const handleBookNow = (train: TrainSchedule) => {
    setSelectedTrain(train)
    setBookingForm({
      seatClass: train.availableSeats?.[0]?.seatClass || '',
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
    setSelectedTrain(null)
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
    if (!selectedTrain) return
    if (!bookingForm.seatClass) return setBookingError('Please select a seat class')
    if (!bookingForm.numPassengers || bookingForm.numPassengers < 1) return setBookingError('Valid number of passengers required')
    if (bookingForm.passengerNames.some((name) => !name.trim())) return setBookingError('Please enter all passenger names')
    if (!user) return setBookingError('You must be logged in to create a booking')
    if (!calculatedPricing) return setBookingError('Pricing is still calculating or failed.')
    if (seatsAllocationLoading) return setBookingError('Still assigning seats…')
    if (seatsAllocationError) return setBookingError(seatsAllocationError)
    if (allocatedSeatNumbers.length !== bookingForm.numPassengers) {
      return setBookingError('Seat assignment does not match passenger count. Adjust class or passenger count.')
    }

    setBookingLoading(true)
    setBookingError('')

    try {
      const itemPrice = calculatedPricing.totalPrice / bookingForm.numPassengers
      await bookingAPI.createBooking({
        booking_type: 'train',
        items: [
          {
            item_type: 'train',
            item_ref_id: selectedTrain.id,
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
      showToast('Train booked successfully!', 'success')
      navigate('/bookings')
    } catch (err: any) {
      setBookingError(err.response?.data?.message || 'Failed to create booking.')
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

  return (
    <div className="trains-page container">
      {/* 1. Header Search Bar Area */}
      <section className="search-banner">
        <form className="search-bar" onSubmit={handleSearch}>
          <div className="search-field">
            <label>From</label>
            <div className="input-with-icon">
              <span>🎯</span>
              <input
                type="text"
                name="originName"
                value={searchParams.originName}
                onChange={handleInputChange}
                list="stations-list"
                placeholder="Surabaya"
              />
            </div>
          </div>

          <button type="button" className="btn-swap" onClick={handleSwapStations}>
            ⇄
          </button>

          <div className="search-field">
            <label>To</label>
            <div className="input-with-icon">
              <span>📍</span>
              <input
                type="text"
                name="destinationName"
                value={searchParams.destinationName}
                onChange={handleInputChange}
                list="stations-list"
                placeholder="Semarang"
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
            <label>Seat</label>
            <div className="input-with-icon">
              <span>💺</span>
              <select value={seatClass} onChange={e => setSeatClass(e.target.value)}>
                <option value="Economy">Economy</option>
                <option value="Business">Business</option>
                <option value="Executive">Executive</option>
              </select>
            </div>
          </div>

          <button className="btn-search-primary" type="submit" disabled={searchLoading}>
            {searchLoading ? '...' : 'Search Ticket'}
          </button>
        </form>
        <datalist id="stations-list">
          {stations.map((s) => (
            <option key={s.id} value={s.name}>{s.name} ({s.code}) - {s.city}</option>
          ))}
        </datalist>
      </section>

      {/* 2. Main 3 Column Layout */}
      {error && (
        <div className="alert-error">
          <span className="alert-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}
      
      <section className="main-content-grid">
        
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
              <input type="text" placeholder="$0,00" value="$500,00" readOnly/>
            </div>
          </div>

          <div className="filter-group">
            <h4>Class <span className="chevron">⌄</span></h4>
            <label className="checkbox-label"><span>All</span> <input type="checkbox" /></label>
            <label className="checkbox-label"><span>Economy</span> <input type="checkbox" defaultChecked /></label>
            <label className="checkbox-label"><span>Business</span> <input type="checkbox" /></label>
            <label className="checkbox-label"><span>Executive</span> <input type="checkbox" /></label>
          </div>

          <div className="filter-group">
            <h4>Departure <span className="chevron">⌄</span></h4>
            <label className="checkbox-label"><span>All</span> <input type="checkbox" defaultChecked/></label>
            <label className="checkbox-label"><span>07.00 - 12.00</span> <input type="checkbox" /></label>
            <label className="checkbox-label"><span>12.00 - 19.00</span> <input type="checkbox" /></label>
            <label className="checkbox-label"><span>19.00 - 24.00</span> <input type="checkbox" /></label>
          </div>

          <div className="filter-group">
            <h4>Passenger <span className="chevron">⌄</span></h4>
            <label className="checkbox-label"><span>Children</span> <input type="checkbox" /></label>
            <label className="checkbox-label"><span>Mature</span> <input type="checkbox" defaultChecked/></label>
            <label className="checkbox-label"><span>Elderly</span> <input type="checkbox" /></label>
          </div>
          
          <div className="filter-group">
            <h4>Transit <span className="chevron">⌄</span></h4>
            <label className="checkbox-label"><span>Direct</span> <input type="checkbox" defaultChecked/></label>
            <label className="checkbox-label"><span>1+ Transit</span> <input type="checkbox" /></label>
            <label className="checkbox-label"><span>2+ Transit</span> <input type="checkbox" /></label>
          </div>
        </aside>

        {/* Mid Col: Results */}
        <div className="results-container">
          <div className="results-header">
            <div>
              <h2 style={{fontSize: '1.25rem', marginBottom: '4px'}}>Select Return Train <span style={{fontSize: '0.9rem', color: '#9ca3af', fontWeight: 400}}>( The best Train found at the best prices )</span></h2>
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
          ) : trains.length === 0 ? (
            <div style={{padding: '24px', textAlign: 'center'}}>No trains available.</div>
          ) : null}

          <div className="train-list">
            {trains.map(train => {
              const depDate = new Date(train.departureTime);
              const arrDate = new Date(train.arrivalTime);
              
              return (
                <div className="train-row-card" key={train.id}>
                  <div className="row-card-top">
                    <div className="route-info">
                      <span className="origin">{train.departureStationName || train.departureCity}</span>
                      <span className="arrow">→</span>
                      <span className="dest">{train.arrivalStationName || train.arrivalCity}</span>
                    </div>
                    <div className="rating">
                      <span className="star">★</span> 4.9 <span className="bookmark">🔖</span>
                    </div>
                  </div>
                  
                  <div className="train-class-label">
                    {train.operator} {train.trainNumber} - {train.availableSeats?.[0]?.seatClass || 'Economy'} class
                  </div>

                  <div className="timeline-row">
                    <div className="time-block">
                      <div className="time">{depDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      <div className="station-code">❖ {train.departureStationCode} - Station</div>
                    </div>
                    
                    <div className="duration-track">
                      <div className="line">
                        <span className="train-icon-mid">🚆</span>
                      </div>
                      <div className="duration-text">Estimate: {formatDuration(train.departureTime, train.arrivalTime)}</div>
                    </div>

                    <div className="time-block right-align">
                      <div className="time">{arrDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      <div className="station-code">{train.arrivalStationCode} - Station ❖</div>
                    </div>
                  </div>

                  <div className="row-card-bottom">
                    <div className="facilities">
                      <p>Fasilities</p>
                      <div className="tags">
                        <span>📶 Wifi</span>
                        <span>🍔 Food</span>
                        <span>❄️ AC</span>
                        <span>🔌 Power & USB Port</span>
                      </div>
                    </div>
                    <div className="price-action">
                      <div className="price-text"><span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(485000)}</span> / Person</div>
                      <button className="btn-buy-now" onClick={() => handleBookNow(train)}>Buy Now</button>
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
                <div className="promo-icon">🍷</div>
                <div>
                  <h4>Discount on drink purchases up to 80%</h4>
                  <p>Minimum ticket purchase $280</p>
                </div>
              </div>
              <div className="promo-code-box">
                890-774-908-898 <span>📋</span>
              </div>
            </div>

            <div className="promo-card">
              <div className="promo-top">
                <div className="promo-icon" style={{background: '#3b82f6'}}>🎫</div>
                <div>
                  <h4>50% discount for departures at 10 AM</h4>
                  <p>Discount for departures at 10 am</p>
                </div>
              </div>
              <div className="promo-code-box">
                722-959-001-812 <span>📋</span>
              </div>
            </div>
          </div>

          <div className="widget-card seat-widget">
            <h3>Seat availability</h3>
            <div className="chart-container">
              <div className="donut-chart">
                <div className="donut-hole">
                  <span className="percent">75%</span>
                  <span className="sub">Full seats</span>
                </div>
              </div>
            </div>
            <div className="chart-legend">
              <span><span className="dot" style={{background: '#10b981'}}></span> Economy</span>
              <span><span className="dot" style={{background: '#3b82f6'}}></span> Business</span>
              <span><span className="dot" style={{background: '#f97316'}}></span> Executive</span>
            </div>
          </div>
        </aside>
      </section>

      {/* Booking Modal */}
      {showBookingModal && selectedTrain && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Book Train</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="booking-summary">
                <h3>{selectedTrain.operator}</h3>
                <p className="train-route">{selectedTrain.departureStationName} → {selectedTrain.arrivalStationName}</p>
                <p className="train-time">{new Date(selectedTrain.departureTime).toLocaleString?.() ?? ''}</p>
              </div>
              {bookingError && <div className="error-message" role="alert">{bookingError}</div>}
              <div className="booking-form">
                <div className="form-group">
                  <label>Seat Class</label>
                  <select value={bookingForm.seatClass} onChange={(e) => handleBookingFormChange('seatClass', e.target.value)} required>
                    <option value="">Select seat class</option>
                    {selectedTrain.availableSeats?.map((s) => (
                      <option key={s.seatClass} value={s.seatClass}>{s.seatClass} - {s.availableCount} available</option>
                    ))}
                  </select>
                  {bookingForm.seatClass && seatsAllocationLoading && (
                    <p className="text-muted" style={{ marginTop: 8, fontSize: '0.875rem' }}>Assigning seats…</p>
                  )}
                  {seatsAllocationError && (
                    <p className="error-message" style={{ marginTop: 8 }} role="alert">{seatsAllocationError}</p>
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
                    <PromoCodeInput basePrice={100000 * bookingForm.numPassengers} currency="IDR" onPriceCalculated={setCalculatedPricing} onError={setBookingError} />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
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
          </div>
        </div>
      )}
    </div>
  )
}

export default Trains
