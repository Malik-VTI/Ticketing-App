import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { hotelAPI, Hotel, AvailableRoomInfo, bookingAPI, PricingResponse } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import Skeleton from '../components/Skeleton'
import PromoCodeInput from '../components/PromoCodeInput'
import './HotelDetail.css'

const HotelDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [rooms, setRooms] = useState<AvailableRoomInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useState({
    checkin: new Date().toISOString().split('T')[0],
    checkout: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    guests: 1,
  })

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoomInfo | null>(null)
  const [bookingForm, setBookingForm] = useState({
    numRooms: 1,
    guestNames: [''],
  })
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [calculatedPricing, setCalculatedPricing] = useState<PricingResponse | null>(null)

  useEffect(() => {
    if (id) loadHotel()
  }, [id])

  useEffect(() => {
    if (hotel && id) loadRooms()
  }, [hotel, searchParams.checkin, searchParams.checkout, searchParams.guests])

  const loadHotel = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const hotelData = await hotelAPI.getHotelById(id)
      setHotel(hotelData)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load hotel')
    } finally {
      setLoading(false)
    }
  }

  const loadRooms = async () => {
    if (!id) return
    setLoadingRooms(true)
    try {
      const roomsData = await hotelAPI.getHotelRooms(id, searchParams)
      setRooms(roomsData)
    } catch (err: any) {
      // Don't override primary screen error unless necessary, just log or silent fail available rooms load
      console.error('Failed to load rooms', err)
      setRooms([])
    } finally {
      setLoadingRooms(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setSearchParams((prev) => ({
      ...prev,
      [name]: name === 'guests' ? parseInt(value, 10) : value,
    }))
  }

  /* Booking Logic */
  const handleBookNow = (room: AvailableRoomInfo) => {
    if (!room?.roomTypeId) {
      setError('Room data is unavailable. Please refresh.')
      return
    }
    setSelectedRoom(room)
    setBookingForm({ numRooms: 1, guestNames: [''] })
    setBookingError('')
    setShowBookingModal(true)
  }

  const handleCloseModal = () => {
    setShowBookingModal(false)
    setSelectedRoom(null)
    setBookingError('')
    setCalculatedPricing(null)
  }

  const handleBookingFormChange = (field: string, value: any) => {
    setBookingForm((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === 'numRooms') {
        const num = parseInt(value, 10)
        if (isNaN(num) || num < 1) return prev
        updated.numRooms = num
        updated.guestNames = Array(num).fill('').map((_, i) => prev.guestNames[i] || '')
      }
      return updated
    })
  }

  const handleGuestNameChange = (index: number, name: string) => {
    setBookingForm((prev) => ({
      ...prev,
      guestNames: prev.guestNames.map((n, i) => (i === index ? name : n)),
    }))
  }

  const handleSubmitBooking = async () => {
    if (!selectedRoom || !hotel) return
    if (bookingForm.guestNames.some((name) => !name.trim())) return setBookingError('Please enter all guest names')
    if (!user) return setBookingError('You must be logged in to create a booking')
    if (!calculatedPricing) return setBookingError('Pricing is still calculating or failed.')

    setBookingLoading(true)
    setBookingError('')

    try {
      const itemPrice = calculatedPricing.totalPrice / bookingForm.numRooms
      await bookingAPI.createBooking({
        booking_type: 'hotel',
        items: [
          {
            item_type: 'hotel',
            item_ref_id: selectedRoom.roomTypeId,
            price: itemPrice,
            quantity: Number(bookingForm.numRooms),
            metadata: {
              room_numbers: [],
              passenger_names: bookingForm.guestNames,
              check_in_date: searchParams.checkin,
              check_out_date: searchParams.checkout,
            },
          },
        ],
      })
      handleCloseModal()
      showToast('Hotel booked successfully!', 'success')
      navigate('/bookings')
    } catch (err: any) {
      setBookingError(err.response?.data?.message || 'Failed to create booking.')
    } finally {
      setBookingLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="hotel-detail-page container">
        <Skeleton type="card" height="400px" />
      </div>
    )
  }

  if (error && !hotel) {
    return (
      <div className="hotel-detail-page container">
        <div className="alert-error"><span className="alert-icon">⚠️</span>{error}</div>
        <Link to="/hotels" className="btn-back">← Back to Hotels</Link>
      </div>
    )
  }

  if (!hotel) return null

  return (
    <div className="hotel-detail-page container">
      {/* Top Breadcrumb & Actions */}
      <div className="detail-nav-bar">
        <Link to="/hotels" className="btn-back">← Back</Link>
        <div className="detail-nav-actions">
          <button className="icon-btn-outline"><span>🔖</span> Save</button>
          <button className="icon-btn-outline"><span>↗️</span> Share</button>
        </div>
      </div>

      {/* Hero Header Region */}
      <div className="detail-hero">
        <div className="detail-hero-info">
          <h1>{hotel.name}</h1>
          <div className="rating">
            <span className="star">★</span> {hotel.rating != null ? hotel.rating.toFixed(1) : '4.5'} 
            <span style={{color: 'var(--text-light)', marginLeft: '8px', fontSize: '0.9rem'}}>Excellent</span>
          </div>
          <p className="location-text">📍 {hotel.city} {hotel.address && `• ${hotel.address}`}</p>
        </div>
        
        {/* Mock Gallery */}
        <div className="detail-gallery">
          <div className="main-image"></div>
          <div className="side-images">
            <div className="img-box"></div>
            <div className="img-box"></div>
          </div>
        </div>
      </div>

      <div className="detail-content-layout">
        
        {/* Left Column: Description & Search */}
        <div className="detail-main-col">
          <section className="about-section detail-card">
            <h2>About this property</h2>
            <p>Welcome to {hotel.name}, a premier destination in {hotel.city}. Enjoy world-class amenities and comfortable stays suited for leisure and business trips alike. Our facilities are designed to guarantee an unforgettable experience.</p>
            <div className="amenities-highlights">
              <span>🏊 Pool</span>
              <span>📶 Free WiFi</span>
              <span>🏋️ Fitness Center</span>
              <span>🍽️ Restaurant</span>
            </div>
          </section>

          <section className="rooms-search-section detail-card">
            <h2>Search Available Rooms</h2>
            <div className="search-bar inline-search">
              <div className="search-field">
                <label>Check-in</label>
                <div className="input-with-icon">
                  <span>📅</span>
                  <input type="date" name="checkin" value={searchParams.checkin} onChange={handleInputChange}/>
                </div>
              </div>
              <div className="search-field">
                <label>Check-out</label>
                <div className="input-with-icon">
                  <span>📅</span>
                  <input type="date" name="checkout" value={searchParams.checkout} onChange={handleInputChange}/>
                </div>
              </div>
              <div className="search-field">
                <label>Guests</label>
                <div className="input-with-icon">
                  <span>👥</span>
                  <select name="guests" value={searchParams.guests} onChange={handleInputChange}>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Guest{(n>1)?'s':''}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="available-rooms-section">
            <h2>Available Rooms</h2>
            {loadingRooms ? (
              <Skeleton type="card" height="150px" count={3} />
            ) : rooms.length === 0 ? (
              <div className="no-rooms-box">
                <p>No rooms available for your selected dates.</p>
              </div>
            ) : (
              <div className="room-list">
                {rooms.map(room => (
                  <div className="room-row-card" key={room.roomTypeId}>
                    <div className="room-image-mock">🛏️</div>
                    <div className="room-row-content">
                      <div className="r-head">
                        <h3>{room.roomTypeName}</h3>
                        <span className="room-badge">Max {room.capacity} Guests</span>
                      </div>
                      <p className="r-desc">Spacious and comfortable room featuring essential amenities for a pleasant stay.</p>
                      <div className="r-facilities">
                        <span>🚿 Private Bath</span>
                        <span>📺 TV</span>
                        <span>❄️ AC</span>
                      </div>
                      
                      <div className="r-bottom">
                        <div className="r-avail text-success">Only {room.availableCount} left!</div>
                        <div className="r-price-action">
                          <div className="price">Starting <span>{room.currency} {room.minPrice?.toLocaleString() ?? 'N/A'}</span> /night</div>
                          <button className="btn-buy-now" onClick={() => handleBookNow(room)} disabled={room.availableCount===0}>
                            Select Room
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Sticky Sidebar: Overview Map */}
        <aside className="detail-sidebar">
          <div className="widget-card location-widget">
            <h3>Location Map</h3>
            <div className="map-mock">🗺️</div>
            <p className="map-desc">{hotel.address}, {hotel.city}</p>
            <button className="btn-outline-full">View on map</button>
          </div>

          <div className="widget-card policy-widget">
            <h3>Hotel Policy</h3>
            <ul className="policy-list">
              <li><strong>Check-in:</strong> 14:00</li>
              <li><strong>Check-out:</strong> 12:00</li>
              <li>Valid ID required upon checkin.</li>
              <li>No smoking in indoor premises.</li>
            </ul>
          </div>
        </aside>

      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedRoom && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Complete Booking</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="booking-summary">
                <h3>{hotel.name}</h3>
                <p className="room-type-name">{selectedRoom.roomTypeName}</p>
                <p className="booking-dates">
                  {new Date(searchParams.checkin).toLocaleDateString()} → {new Date(searchParams.checkout).toLocaleDateString()}
                </p>
              </div>
              
              {bookingError && (
                <div className="alert-error" style={{marginTop: '1rem'}}>
                  <span className="alert-icon">⚠️</span>{bookingError}
                </div>
              )}

              <div className="booking-form" style={{marginTop: '1.5rem'}}>
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" min="1" max={selectedRoom.availableCount} value={bookingForm.numRooms} onChange={(e) => handleBookingFormChange('numRooms', e.target.value)} required />
                </div>
                
                <div className="passenger-names">
                  <label>Guest Names (Primary per room)</label>
                  {bookingForm.guestNames.map((name, index) => (
                    <input key={index} type="text" placeholder={`Guest ${index + 1}`} value={name} onChange={(e) => handleGuestNameChange(index, e.target.value)} required />
                  ))}
                </div>

                <div className="price-summary" style={{ padding: 0, border: 'none', marginTop: '1rem', background: 'transparent' }}>
                  <PromoCodeInput 
                    basePrice={selectedRoom.minPrice * bookingForm.numRooms} 
                    currency={selectedRoom.currency} 
                    onPriceCalculated={setCalculatedPricing} 
                    onError={setBookingError} 
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseModal} disabled={bookingLoading}>Cancel</button>
              <button className="btn-submit" onClick={handleSubmitBooking} disabled={bookingLoading || !calculatedPricing}>
                {bookingLoading ? 'Processing...' : 'Confirm Details'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HotelDetail
