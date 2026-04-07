import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { bookingAPI, paymentAPI, Booking, Payment as PaymentRecord, PaymentMethod } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import './Payment.css'

type Step = 'summary' | 'method' | 'processing' | 'result'

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; description: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', description: 'Transfer via BCA, Mandiri, BNI, or BRI' },
  { value: 'ewallet', label: 'E-Wallet', icon: '📱', description: 'GoPay, OVO, DANA, or ShopeePay' },
  { value: 'credit_card', label: 'Credit / Debit Card', icon: '💳', description: 'Visa, Mastercard, or JCB' },
]

const Payment = () => {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [step, setStep] = useState<Step>('summary')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [payment, setPayment] = useState<PaymentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (bookingId) loadBooking()
  }, [bookingId])

  const loadBooking = async () => {
    if (!bookingId) return
    setLoading(true)
    setError('')
    try {
      const data = await bookingAPI.getBookingById(bookingId)
      if (data.status !== 'pending') {
        // Already paid or cancelled
        navigate(`/bookings/${bookingId}`, { replace: true })
        return
      }
      setBooking(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load booking details.')
    } finally {
      setLoading(false)
    }
  }

  const handleProceedToPayment = () => {
    setStep('method')
  }

  const handlePay = async () => {
    if (!booking) return
    setStep('processing')
    setError('')

    try {
      const result = await paymentAPI.createPayment({
        booking_id: booking.id,
        amount: booking.total_amount,
        currency: booking.currency,
        payment_method: paymentMethod,
      })
      setPayment(result)
      setStep('result')

      if (result.status === 'succeeded') {
        showToast('Payment successful! Your booking is confirmed.', 'success')
      } else {
        showToast('Payment failed. Please try again.', 'error')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Payment processing failed.'
      setError(msg)
      showToast(msg, 'error')
      setStep('method')
    }
  }

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: currency || 'IDR' }).format(amount)

  if (loading) {
    return (
      <div className="payment-page">
        <div className="payment-loading">
          <div className="payment-spinner" />
          <p>Loading booking details…</p>
        </div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="payment-page">
        <div className="payment-error-state">
          <span className="payment-error-icon">⚠️</span>
          <p>{error}</p>
          <Link to="/bookings" className="btn-back-link">← Back to Bookings</Link>
        </div>
      </div>
    )
  }

  if (!booking) return null

  return (
    <div className="payment-page">
      {/* Progress indicator */}
      <div className="payment-progress">
        {(['summary', 'method', 'processing', 'result'] as Step[]).map((s, i) => (
          <div key={s} className={`progress-step ${step === s ? 'active' : ''} ${
            ['summary', 'method', 'processing', 'result'].indexOf(step) > i ? 'done' : ''
          }`}>
            <div className="progress-dot">{['summary', 'method', 'processing', 'result'].indexOf(step) > i ? '✓' : i + 1}</div>
            <span className="progress-label">{['Summary', 'Method', 'Processing', 'Result'][i]}</span>
          </div>
        ))}
      </div>

      <div className="payment-card">

        {/* Step 1: Booking Summary */}
        {step === 'summary' && (
          <>
            <div className="payment-card-header">
              <h1>Confirm Your Booking</h1>
              <p>Review your booking details before proceeding to payment.</p>
            </div>
            <div className="booking-summary-section">
              <div className="summary-row">
                <span>Booking Reference</span>
                <strong>{booking.booking_reference}</strong>
              </div>
              <div className="summary-row">
                <span>Type</span>
                <span className="booking-type-badge">{booking.booking_type.toUpperCase()}</span>
              </div>
              <div className="summary-row">
                <span>Items</span>
                <span>{booking.items.length} item(s)</span>
              </div>
              <div className="summary-row total">
                <span>Total Amount</span>
                <strong className="total-amount">{formatCurrency(booking.total_amount, booking.currency)}</strong>
              </div>
            </div>
            <div className="payment-actions">
              <Link to="/bookings" className="btn-secondary-pay">Cancel</Link>
              <button className="btn-primary-pay" onClick={handleProceedToPayment}>
                Proceed to Payment →
              </button>
            </div>
          </>
        )}

        {/* Step 2: Choose Payment Method */}
        {step === 'method' && (
          <>
            <div className="payment-card-header">
              <h1>Choose Payment Method</h1>
              <p>Select how you would like to pay <strong>{formatCurrency(booking.total_amount, booking.currency)}</strong></p>
            </div>
            <div className="payment-methods">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.value}
                  className={`payment-method-option ${paymentMethod === m.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={m.value}
                    checked={paymentMethod === m.value}
                    onChange={() => setPaymentMethod(m.value)}
                  />
                  <span className="method-icon">{m.icon}</span>
                  <div className="method-info">
                    <span className="method-label">{m.label}</span>
                    <span className="method-desc">{m.description}</span>
                  </div>
                  {paymentMethod === m.value && <span className="method-check">✓</span>}
                </label>
              ))}
            </div>
            {error && <div className="payment-inline-error">{error}</div>}
            <div className="payment-actions">
              <button className="btn-secondary-pay" onClick={() => setStep('summary')}>← Back</button>
              <button className="btn-primary-pay" onClick={handlePay}>
                Pay {formatCurrency(booking.total_amount, booking.currency)} →
              </button>
            </div>
          </>
        )}

        {/* Step 3: Processing */}
        {step === 'processing' && (
          <div className="payment-processing">
            <div className="payment-spinner large" />
            <h2>Processing Payment…</h2>
            <p>Please do not close or refresh this page.</p>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 'result' && payment && (
          <>
            <div className={`payment-result ${payment.status === 'succeeded' ? 'success' : 'failed'}`}>
              <div className="result-icon">
                {payment.status === 'succeeded' ? '✅' : '❌'}
              </div>
              <h2>{payment.status === 'succeeded' ? 'Payment Successful!' : 'Payment Failed'}</h2>
              {payment.status === 'succeeded' ? (
                <p>Your booking <strong>{booking.booking_reference}</strong> is now confirmed.</p>
              ) : (
                <p>We could not process your payment. Please try again.</p>
              )}
              <div className="result-detail">
                <div className="summary-row">
                  <span>Amount</span>
                  <strong>{formatCurrency(payment.amount, payment.currency)}</strong>
                </div>
                <div className="summary-row">
                  <span>Method</span>
                  <span>{PAYMENT_METHODS.find((m) => m.value === payment.payment_method)?.label}</span>
                </div>
                <div className="summary-row">
                  <span>Status</span>
                  <span className={`status-pill status-${payment.status}`}>{payment.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="payment-actions">
              {payment.status === 'failed' && (
                <button className="btn-primary-pay" onClick={() => setStep('method')}>
                  Try Again
                </button>
              )}
              <Link
                to={`/bookings/${booking.id}`}
                className={payment.status === 'succeeded' ? 'btn-primary-pay' : 'btn-secondary-pay'}
              >
                View Booking Details
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Payment
