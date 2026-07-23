import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { bookingAPI, flightAPI, trainAPI, Booking, BookingItem, FlightSchedule, TrainSchedule } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import Skeleton from '../components/Skeleton'
import { CalendarEvent, downloadICS, googleCalendarUrl } from '../utils/calendar'
import './BookingDetail.css'

interface ItemEnrichment {
  headline: string
  sub?: string
  departure?: string
  arrival?: string
  checkIn?: string
  checkOut?: string
  event?: CalendarEvent
}

const tripDescription = (bookingRef: string, extra: string[]): string =>
  [`Booking ${bookingRef}`, ...extra].filter(Boolean).join('\n')

const buildFlightEnrichment = (bookingRef: string, item: BookingItem, s: FlightSchedule): ItemEnrichment => ({
  headline: `${s.airlineName} ${s.flightNumber}`,
  sub: `${s.originCity} (${s.originAirportCode}) → ${s.destinationCity} (${s.destinationAirportCode})`,
  departure: s.departureTime,
  arrival: s.arrivalTime,
  event: {
    uid: `${bookingRef}-${item.id}@ticketing-app`,
    title: `✈️ ${s.airlineName} ${s.flightNumber} · ${s.originAirportCode}→${s.destinationAirportCode}`,
    description: tripDescription(bookingRef, [
      item.metadata?.seat_numbers?.length ? `Seats: ${item.metadata.seat_numbers.join(', ')}` : '',
      item.metadata?.passenger_names?.length ? `Passengers: ${item.metadata.passenger_names.join(', ')}` : '',
    ]),
    location: `${s.originAirportName} (${s.originAirportCode})`,
    start: s.departureTime,
    end: s.arrivalTime,
    allDay: false,
  },
})

const buildTrainEnrichment = (bookingRef: string, item: BookingItem, s: TrainSchedule): ItemEnrichment => ({
  headline: `${s.operator} ${s.trainNumber}`,
  sub: `${s.departureCity} (${s.departureStationCode}) → ${s.arrivalCity} (${s.arrivalStationCode})`,
  departure: s.departureTime,
  arrival: s.arrivalTime,
  event: {
    uid: `${bookingRef}-${item.id}@ticketing-app`,
    title: `🚆 ${s.operator} ${s.trainNumber} · ${s.departureStationCode}→${s.arrivalStationCode}`,
    description: tripDescription(bookingRef, [
      item.metadata?.seat_numbers?.length ? `Seats: ${item.metadata.seat_numbers.join(', ')}` : '',
      item.metadata?.passenger_names?.length ? `Passengers: ${item.metadata.passenger_names.join(', ')}` : '',
    ]),
    location: `${s.departureStationName} (${s.departureStationCode})`,
    start: s.departureTime,
    end: s.arrivalTime,
    allDay: false,
  },
})

const buildHotelEnrichment = (bookingRef: string, item: BookingItem): ItemEnrichment => {
  const ci = item.metadata?.check_in_date
  const co = item.metadata?.check_out_date
  const headline = item.metadata?.hotel_name || 'Hotel stay'
  const roomType = item.metadata?.room_type_name
  const enr: ItemEnrichment = {
    headline,
    sub: [item.metadata?.hotel_city, roomType].filter(Boolean).join(' · ') || undefined,
    checkIn: ci,
    checkOut: co,
  }
  if (ci && co) {
    enr.event = {
      uid: `${bookingRef}-${item.id}@ticketing-app`,
      title: `🏨 ${headline}`,
      description: tripDescription(bookingRef, [
        roomType ? `Room: ${roomType}` : '',
        item.metadata?.room_numbers?.length ? `Room no: ${item.metadata.room_numbers.join(', ')}` : '',
        item.metadata?.passenger_names?.length ? `Guests: ${item.metadata.passenger_names.join(', ')}` : '',
      ]),
      location: item.metadata?.hotel_city,
      start: ci,
      end: co,
      allDay: true,
    }
  }
  return enr
}

const BookingDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [enriched, setEnriched] = useState<Record<string, ItemEnrichment>>({})

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

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (booking?.status === 'pending' || booking?.status === 'initiated') {
      interval = setInterval(async () => {
        if (!id) return;
        try {
          const data = await bookingAPI.getBookingById(id);
          setBooking(data);
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [booking?.status, id]);

  // Resolve each item's schedule so we can render a real e-ticket and build
  // calendar events (flight/train departure times aren't stored on the booking).
  const bookingId = booking?.id
  useEffect(() => {
    if (!booking) return
    const currentBooking = booking
    let active = true
    const run = async () => {
      const entries = await Promise.all(
        currentBooking.items.map(async (item): Promise<[string, ItemEnrichment] | null> => {
          try {
            if (item.item_type === 'flight') {
              const s = await flightAPI.getScheduleById(item.item_ref_id)
              return [item.id, buildFlightEnrichment(currentBooking.booking_reference, item, s)]
            }
            if (item.item_type === 'train') {
              const s = await trainAPI.getScheduleById(item.item_ref_id)
              return [item.id, buildTrainEnrichment(currentBooking.booking_reference, item, s)]
            }
            return [item.id, buildHotelEnrichment(currentBooking.booking_reference, item)]
          } catch {
            return null // schedule unavailable — fall back to raw item display
          }
        })
      )
      if (!active) return
      const map: Record<string, ItemEnrichment> = {}
      for (const e of entries) if (e) map[e[0]] = e[1]
      setEnriched(map)
    }
    run()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  const handleCancel = () => {
    if (!booking) return
    setShowCancelConfirm(true)
  }

  const handleConfirmCancel = async () => {
    if (!booking) return
    setShowCancelConfirm(false)
    try {
      await bookingAPI.cancelBooking(booking.id)
      showToast('Booking cancelled successfully.', 'success')
      loadBooking()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to cancel booking.', 'error')
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
        <div className="skeleton-container" style={{ padding: '2rem' }}>
          <Skeleton type="title" width="30%" />
          <Skeleton type="card" height="300px" />
          <Skeleton type="card" height="200px" />
        </div>
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
            {booking.items.map((item, index) => {
              const enr = enriched[item.id]
              return (
              <div key={item.id} className="item-card">
                <div className="item-header">
                  <span className="item-number">Item {index + 1}</span>
                  <span className="item-type">{item.item_type.toUpperCase()}</span>
                </div>
                {enr && (
                  <div className="trip-summary">
                    <div className="trip-headline">{enr.headline}</div>
                    {enr.sub && <div className="trip-route">{enr.sub}</div>}
                    {enr.departure && enr.arrival && (
                      <div className="trip-times">
                        <span>{formatDate(enr.departure)}</span>
                        <span className="trip-arrow">→</span>
                        <span>{formatDate(enr.arrival)}</span>
                      </div>
                    )}
                    {enr.checkIn && enr.checkOut && (
                      <div className="trip-times">
                        <span>Check-in {enr.checkIn}</span>
                        <span className="trip-arrow">→</span>
                        <span>Check-out {enr.checkOut}</span>
                      </div>
                    )}
                    {booking.status === 'confirmed' && enr.event && (
                      <div className="calendar-actions">
                        <a
                          className="btn-calendar"
                          href={googleCalendarUrl(enr.event)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          📅 Add to Google Calendar
                        </a>
                        <button
                          type="button"
                          className="btn-calendar btn-calendar-outline"
                          onClick={() => downloadICS([enr.event!], `${booking.booking_reference}-${item.item_type}`)}
                        >
                          ⬇️ Download .ics
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
              )
            })}
          </div>
        </div>

        <div className="booking-actions-section">
          {booking.status === 'confirmed' &&
            Object.values(enriched).filter((e) => e.event).length > 1 && (
              <button
                type="button"
                className="btn-secondary-large"
                onClick={() =>
                  downloadICS(
                    Object.values(enriched)
                      .map((e) => e.event)
                      .filter(Boolean) as CalendarEvent[],
                    `${booking.booking_reference}-itinerary`
                  )
                }
              >
                📅 Add all to calendar (.ics)
              </button>
            )}
          {booking.status === 'pending' && (
            showCancelConfirm ? (
              <div className="cancel-confirm-inline">
                <p>Are you sure you want to cancel this booking?</p>
                <div className="cancel-confirm-buttons">
                  <button onClick={handleConfirmCancel} className="btn-danger-large">
                    Yes, Cancel Booking
                  </button>
                  <button onClick={() => setShowCancelConfirm(false)} className="btn-secondary-large">
                    No, Keep It
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={handleCancel} className="btn-danger-large">
                Cancel Booking
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default BookingDetail

