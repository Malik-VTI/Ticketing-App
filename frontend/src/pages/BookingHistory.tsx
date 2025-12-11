import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { bookingAPI, Booking } from '../services/api'
import './BookingHistory.css'

const BookingHistory = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadBookings = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError('')
    try {
      const data = await bookingAPI.getUserBookings(user.id, { limit: 50, offset: 0 })
      if (!Array.isArray(data)) {
        throw new Error('Unexpected response format from bookings API')
      }
      setBookings(data)
    } catch (err: any) {
      console.error('Error loading bookings:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load bookings'
      setError(errorMessage)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (user?.id) {
      loadBookings()
    } else {
      // If authenticated but no user ID, stop loading
      setLoading(false)
    }
  }, [user, isAuthenticated, authLoading, navigate, loadBookings])

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    try {
      await bookingAPI.cancelBooking(bookingId)
      // Reload bookings
      loadBookings()
    } catch (err: any) {
      console.error('Error cancelling booking:', err)
      alert(err.response?.data?.message || 'Failed to cancel booking')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency || 'IDR',
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'status-confirmed'
      case 'pending':
        return 'status-pending'
      case 'cancelled':
        return 'status-cancelled'
      case 'expired':
        return 'status-expired'
      default:
        return ''
    }
  }

  if (authLoading || loading) {
    return (
      <div className="booking-history">
        <div className="loading">Loading bookings...</div>
      </div>
    )
  }

  // If no user ID after loading, show error
  if (!user?.id) {
    return (
      <div className="booking-history">
        <div className="error-message">Unable to load user information. Please try logging in again.</div>
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="booking-history">
      <div className="booking-history-header">
        <h1>My Bookings</h1>
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      {bookings.length === 0 ? (
        <div className="no-bookings">
          <p>You don't have any bookings yet.</p>
          <div className="booking-actions">
            <Link to="/flights" className="btn-primary">
              Search Flights
            </Link>
            <Link to="/trains" className="btn-primary">
              Search Trains
            </Link>
            <Link to="/hotels" className="btn-primary">
              Search Hotels
            </Link>
          </div>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <div key={booking.id} className="booking-card">
              <div className="booking-card-header">
                <div className="booking-ref">
                  <strong>Reference:</strong> {booking.booking_reference}
                </div>
                <span className={`status-badge ${getStatusColor(booking.status)}`}>
                  {booking.status.toUpperCase()}
                </span>
              </div>

              <div className="booking-card-body">
                <div className="booking-info">
                  <div className="info-row">
                    <span className="info-label">Type:</span>
                    <span className="info-value">{booking.booking_type.toUpperCase()}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Total Amount:</span>
                    <span className="info-value amount">
                      {formatCurrency(booking.total_amount, booking.currency)}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Created:</span>
                    <span className="info-value">{formatDate(booking.created_at)}</span>
                  </div>
                </div>

                <div className="booking-items">
                  <h4>Items ({booking.items.length}):</h4>
                  <ul>
                    {booking.items.map((item) => (
                      <li key={item.id}>
                        {item.item_type.toUpperCase()} - {item.quantity}x -{' '}
                        {formatCurrency(item.price * item.quantity, booking.currency)}
                        {item.metadata?.seat_numbers && (
                          <span className="metadata">
                            {' '}
                            (Seats: {item.metadata.seat_numbers.join(', ')})
                          </span>
                        )}
                        {item.metadata?.room_numbers && (
                          <span className="metadata">
                            {' '}
                            (Rooms: {item.metadata.room_numbers.join(', ')})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="booking-card-actions">
                <Link to={`/bookings/${booking.id}`} className="btn-secondary">
                  View Details
                </Link>
                {booking.status === 'pending' && (
                  <button
                    onClick={() => handleCancel(booking.id)}
                    className="btn-danger"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BookingHistory

