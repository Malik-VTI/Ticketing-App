import { FormEvent, useEffect, useState, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { trainAPI, TrainSchedule, Station, bookingAPI, PricingResponse } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import Skeleton from '../components/Skeleton'
import PromoCodeInput from '../components/PromoCodeInput'
import DateCarousel from '../components/shared/DateCarousel'
import FilterSidebar from '../components/shared/FilterSidebar'
import PaginationControls from '../components/shared/PaginationControls'
import BookingModal from '../components/shared/BookingModal'
import './Trains.css'

const PAGE_SIZE = 6

const getTrainPrice = (seatClass: string) => {
  const cls = (seatClass || '').toLowerCase()
  if (cls.includes('executive')) return 485000
  if (cls.includes('business')) return 250000
  return 100000
}

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

  // Fix 2.1: Refetch on visibility change (e.g. returning from booking)
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
            <label>Depart</label>
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
                { label: 'Executive', value: 'Executive' }
              ]
            }
          ]}
        />

        {/* Mid Col: Results */}
        <div className="results-container">
          <div className="results-header">
            <div>
              <h2 style={{fontSize: '1.25rem', marginBottom: '4px'}}>Select Return Train <span style={{fontSize: '0.9rem', color: '#9ca3af', fontWeight: 400}}>( The best Train found at the best prices )</span></h2>
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
          ) : (
          <div className="train-list">
            {(() => {
              let displayedTrains = trains
              
              if (filters.class && filters.class.length > 0) {
                displayedTrains = displayedTrains.filter(t => t.availableSeats?.some(s => filters.class.includes(s.seatClass || '')))
              }
              
              displayedTrains.sort((a, b) => {
                const aPrice = getTrainPrice(a.availableSeats?.[0]?.seatClass || 'Economy')
                const bPrice = getTrainPrice(b.availableSeats?.[0]?.seatClass || 'Economy')
                return sortOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice
              })

              if (displayedTrains.length === 0 && !loading) {
                return <div style={{padding: '24px', textAlign: 'center'}}>No matching trains.</div>
              }

              return displayedTrains.map(train => {
                const depDate = new Date(train.departureTime);
                const arrDate = new Date(train.arrivalTime);
                
                return (
                  <div className="train-row-card" key={train.id}>
                    <div className="row-card-top">
                      <div className="route-info">
                        <span className="origin">{train.departureStationName || train.departureCity}</span>
                        <span className="arrow">→</span>
                        <span className="destination">{train.arrivalStationName || train.arrivalCity}</span>
                      </div>
                      <div className="times">
                        <span className="time-block">
                          <strong>{depDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
                          <small>{depDate.toLocaleDateString()}</small>
                        </span>
                        <span className="duration">
                          {formatDuration(train.departureTime, train.arrivalTime)}
                        </span>
                        <span className="time-block">
                          <strong>{arrDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
                          <small>{arrDate.toLocaleDateString()}</small>
                        </span>
                      </div>
                    </div>
                    <div className="row-card-bottom">
                      <div className="train-details">
                        <div className="train-name">{train.operator} {train.trainNumber}</div>
                        <div className="train-class">{train.availableSeats?.[0]?.seatClass || 'Economy'}</div>
                        <div className="train-facilities">
                          <span>🍽️ Dining</span>
                          <span>❄️ AC</span>
                          <span>🔌 Power & USB Port</span>
                        </div>
                      </div>
                      <div className="price-action">
                        <div className="price-text"><span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(getTrainPrice(train.availableSeats?.[0]?.seatClass || 'Economy'))}</span> / Person</div>
                        <button className="btn-buy-now" onClick={() => handleBookNow(train)}>Buy Now</button>
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
          )}
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
      {selectedTrain && (
        <BookingModal isOpen={showBookingModal} title="Book Train" onClose={handleCloseModal}>
          <>
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
                    <PromoCodeInput basePrice={getTrainPrice(bookingForm.seatClass) * bookingForm.numPassengers} currency="IDR" onPriceCalculated={setCalculatedPricing} onError={setBookingError} />
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

export default Trains
