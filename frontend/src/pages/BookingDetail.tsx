import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { bookingAPI, Booking } from '../services/api'
import './BookingDetail.css'

const BookingDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadBooking = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError('')
    try {
      const data = await bookingAPI.getBookingById(id)
      setBooking(data)
    } catch (err: any) {
      console.error('Error loading booking:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load booking'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (id) {
      loadBooking()
    }
  }, [id, isAuthenticated, authLoading, navigate, loadBooking])

  const handleCancel = async () => {
    if (!booking) return

    if (!confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    try {
      await bookingAPI.cancelBooking(booking.id)
      // Reload booking
      loadBooking()
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
      <div className="booking-detail">
        <div className="loading">Loading booking details...</div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="booking-detail">
        <div className="error-message">{error || 'Booking not found'}</div>
        <Link to="/bookings" className="back-link">
          ← Back to My Bookings
        </Link>
      </div>
    )
  }

  return (
    <div className="booking-detail">
      <div className="booking-detail-header">
        <Link to="/bookings" className="back-link">
          ← Back to My Bookings
        </Link>
        <h1>Booking Details</h1>
      </div>

      <div className="booking-detail-card">
        <div className="booking-header-section">
          <div className="booking-ref-large">
            <strong>Booking Reference:</strong> {booking.booking_reference}
          </div>
          <span className={`status-badge-large ${getStatusColor(booking.status)}`}>
            {booking.status.toUpperCase()}
          </span>
        </div>

        <div className="booking-info-section">
          <h3>Booking Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Booking ID:</span>
              <span className="info-value">{booking.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Type:</span>
              <span className="info-value">{booking.booking_type.toUpperCase()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Amount:</span>
              <span className="info-value amount-large">
                {formatCurrency(booking.total_amount, booking.currency)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Currency:</span>
              <span className="info-value">{booking.currency}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Created:</span>
              <span className="info-value">{formatDate(booking.created_at)}</span>
            </div>
            {booking.updated_at && (
              <div className="info-item">
                <span className="info-label">Last Updated:</span>
                <span className="info-value">{formatDate(booking.updated_at)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="booking-items-section">
          <h3>Booking Items ({booking.items.length})</h3>
          <div className="items-list">
            {booking.items.map((item, index) => (
              <div key={item.id} className="item-card">
                <div className="item-header">
                  <span className="item-number">Item {index + 1}</span>
                  <span className="item-type">{item.item_type.toUpperCase()}</span>
                </div>
                <div className="item-details">
                  <div className="item-detail-row">
                    <span className="detail-label">Reference ID:</span>
                    <span className="detail-value">{item.item_ref_id}</span>
                  </div>
                  <div className="item-detail-row">
                    <span className="detail-label">Quantity:</span>
                    <span className="detail-value">{item.quantity}</span>
                  </div>
                  <div className="item-detail-row">
                    <span className="detail-label">Unit Price:</span>
                    <span className="detail-value">
                      {formatCurrency(item.price, booking.currency)}
                    </span>
                  </div>
                  <div className="item-detail-row">
                    <span className="detail-label">Subtotal:</span>
                    <span className="detail-value amount">
                      {formatCurrency(item.price * item.quantity, booking.currency)}
                    </span>
                  </div>
                  {item.metadata && (
                    <div className="item-metadata">
                      {item.metadata.seat_numbers && (
                        <div className="metadata-item">
                          <strong>Seat Numbers:</strong> {item.metadata.seat_numbers.join(', ')}
                        </div>
                      )}
                      {item.metadata.room_numbers && (
                        <div className="metadata-item">
                          <strong>Room Numbers:</strong> {item.metadata.room_numbers.join(', ')}
                        </div>
                      )}
                      {item.metadata.passenger_names && (
                        <div className="metadata-item">
                          <strong>Passengers:</strong> {item.metadata.passenger_names.join(', ')}
                        </div>
                      )}
                      {item.metadata.check_in_date && (
                        <div className="metadata-item">
                          <strong>Check-in:</strong> {item.metadata.check_in_date}
                        </div>
                      )}
                      {item.metadata.check_out_date && (
                        <div className="metadata-item">
                          <strong>Check-out:</strong> {item.metadata.check_out_date}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="booking-actions-section">
          {booking.status === 'pending' && (
            <button onClick={handleCancel} className="btn-danger-large">
              Cancel Booking
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookingDetail

