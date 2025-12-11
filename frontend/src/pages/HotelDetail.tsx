import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { hotelAPI, Hotel, AvailableRoomInfo, bookingAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import './HotelDetail.css'

const HotelDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
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

  useEffect(() => {
    if (id) {
      loadHotel()
    }
  }, [id])

  useEffect(() => {
    if (hotel && id) {
      loadRooms()
    }
  }, [hotel, searchParams.checkin, searchParams.checkout, searchParams.guests])

  const loadHotel = async () => {
    if (!id) return

    setLoading(true)
    setError('')
    try {
      const hotelData = await hotelAPI.getHotelById(id)
      setHotel(hotelData)
    } catch (err: any) {
      console.error('Error loading hotel:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load hotel'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadRooms = async () => {
    if (!id) return

    setLoadingRooms(true)
    setError('')
    try {
      const roomsData = await hotelAPI.getHotelRooms(id, {
        checkin: searchParams.checkin,
        checkout: searchParams.checkout,
        guests: searchParams.guests,
      })
      setRooms(roomsData)
    } catch (err: any) {
      console.error('Error loading rooms:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load rooms'
      setError(errorMessage)
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

  const handleBookNow = (room: AvailableRoomInfo) => {
    setSelectedRoom(room)
    setBookingForm({
      numRooms: 1,
      guestNames: [''],
    })
    setBookingError('')
    setShowBookingModal(true)
  }

  const handleCloseModal = () => {
    setShowBookingModal(false)
    setSelectedRoom(null)
    setBookingError('')
  }

  const handleBookingFormChange = (field: string, value: any) => {
    setBookingForm((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === 'numRooms') {
        const num = parseInt(value, 10)
        // Prevent NaN or invalid numbers
        if (isNaN(num) || num < 1) {
          return prev // Don't update if invalid
        }
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

    if (!bookingForm.numRooms || bookingForm.numRooms < 1) {
      setBookingError('Please enter a valid number of rooms')
      return
    }

    if (bookingForm.guestNames.some((name) => !name.trim())) {
      setBookingError('Please enter all guest names')
      return
    }

    if (!user) {
      setBookingError('You must be logged in to create a booking')
      return
    }

    setBookingLoading(true)
    setBookingError('')

    try {
      const totalPrice = selectedRoom.minPrice * bookingForm.numRooms

      await bookingAPI.createBooking({
        booking_type: 'hotel',
        items: [
          {
            item_type: 'hotel',
            item_ref_id: selectedRoom.roomTypeId,
            price: totalPrice,
            quantity: bookingForm.numRooms,
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
      alert('Booking created successfully!')
      navigate('/bookings')
    } catch (err: any) {
      console.error('Booking error:', err)
      setBookingError(err.response?.data?.message || 'Failed to create booking. Please try again.')
    } finally {
      setBookingLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="hotel-detail">
        <div className="loading">Loading hotel details...</div>
      </div>
    )
  }

  if (error && !hotel) {
    return (
      <div className="hotel-detail">
        <div className="error-message">{error}</div>
        <Link to="/hotels" className="btn-back">
          ← Back to Hotels
        </Link>
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="hotel-detail">
        <div className="error-message">Hotel not found</div>
        <Link to="/hotels" className="btn-back">
          ← Back to Hotels
        </Link>
      </div>
    )
  }

  return (
    <div className="hotel-detail">
      <div className="hotel-detail-header">
        <Link to="/hotels" className="btn-back">
          ← Back to Hotels
        </Link>
        <h1>{hotel.name}</h1>
        <div className="hotel-meta">
          <p className="hotel-location">
            📍 {hotel.city} {hotel.address && `• ${hotel.address}`}
          </p>
          {hotel.rating && (
            <p className="hotel-rating">
              ⭐ {hotel.rating.toFixed(1)} Rating
            </p>
          )}
        </div>
      </div>

      <div className="search-filters">
        <h2>Search Available Rooms</h2>
        <div className="filter-grid">
          <div className="form-group">
            <label htmlFor="checkin">Check-in Date</label>
            <input
              type="date"
              id="checkin"
              name="checkin"
              value={searchParams.checkin}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="checkout">Check-out Date</label>
            <input
              type="date"
              id="checkout"
              name="checkout"
              value={searchParams.checkout}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="guests">Guests</label>
            <select
              id="guests"
              name="guests"
              value={searchParams.guests}
              onChange={handleInputChange}
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="rooms-section">
        <h2>Available Rooms</h2>
        {loadingRooms ? (
          <div className="loading">Loading rooms...</div>
        ) : rooms.length === 0 ? (
          <div className="no-rooms">
            <p>No rooms available for the selected dates and guest count.</p>
            <p className="hint">Try adjusting your check-in/check-out dates or number of guests.</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {rooms.map((room) => (
              <div className="room-card" key={room.roomTypeId}>
                <div className="room-card-header">
                  <h3>{room.roomTypeName}</h3>
                  <span className="room-capacity-badge">
                    {room.capacity} {room.capacity === 1 ? 'Guest' : 'Guests'}
                  </span>
                </div>
                <div className="room-card-body">
                  <div className="room-availability-info">
                    <p className="availability-text">
                      <span className="available-count">{room.availableCount}</span> /{' '}
                      <span className="total-count">{room.totalCount}</span> rooms available
                    </p>
                  </div>
                  {room.minPrice > 0 && (
                    <div className="room-price-info">
                      <p className="price-label">Starting from</p>
                      <p className="price-amount">
                        {room.currency} {room.minPrice.toLocaleString()}
                      </p>
                      <p className="price-note">per night</p>
                    </div>
                  )}
                </div>
                <div className="room-card-footer">
                  <button
                    className="btn-book"
                    disabled={room.availableCount === 0}
                    onClick={() => handleBookNow(room)}
                  >
                    {room.availableCount === 0 ? 'Not Available' : 'Book Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hotel.roomTypes && hotel.roomTypes.length > 0 && (
        <div className="room-types-section">
          <h2>Room Types</h2>
          <div className="room-types-grid">
            {hotel.roomTypes.map((rt) => (
              <div className="room-type-info" key={rt.id}>
                <h3>{rt.name}</h3>
                <p>Capacity: {rt.capacity} {rt.capacity === 1 ? 'guest' : 'guests'}</p>
                {rt.amenities && (
                  <div className="amenities">
                    <p className="amenities-label">Amenities:</p>
                    <p className="amenities-text">{rt.amenities}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedRoom && hotel && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Book Room</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
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
                <div className="error-message" role="alert">
                  {bookingError}
                </div>
              )}

              <div className="booking-form">
                <div className="form-group">
                  <label htmlFor="numRooms">Number of Rooms</label>
                  <input
                    type="number"
                    id="numRooms"
                    min="1"
                    max={selectedRoom.availableCount}
                    value={bookingForm.numRooms}
                    onChange={(e) => handleBookingFormChange('numRooms', e.target.value)}
                    required
                  />
                  <small>Maximum {selectedRoom.availableCount} rooms available</small>
                </div>

                <div className="guest-names">
                  <label>Guest Names (Primary guest per room)</label>
                  {bookingForm.guestNames.map((name, index) => (
                    <input
                      key={index}
                      type="text"
                      placeholder={`Guest ${index + 1} name`}
                      value={name}
                      onChange={(e) => handleGuestNameChange(index, e.target.value)}
                      required
                    />
                  ))}
                </div>

                <div className="price-summary">
                  <p className="total-price">
                    Total Price: {selectedRoom.currency} {(selectedRoom.minPrice * bookingForm.numRooms).toLocaleString()}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                    {selectedRoom.currency} {selectedRoom.minPrice.toLocaleString()} per night × {bookingForm.numRooms} room(s)
                  </p>
                </div>
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

export default HotelDetail

