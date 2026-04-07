import { useEffect, useState } from 'react'
import { adminAPI, AdminMetricsResponse } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import Skeleton from '../components/Skeleton'
import './AdminDashboard.css'

const AdminDashboard = () => {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const data = await adminAPI.getMetrics()
      setMetrics(data)
    } catch (err: any) {
      console.error('Error fetching admin metrics:', err)
      setError(err.response?.data?.message || 'Failed to load dashboard metrics. You might not have permission.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-dashboard container">
        <h1>Admin Dashboard</h1>
        <div className="metrics-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} type="card" height="150px" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-dashboard container">
        <h1>Admin Dashboard</h1>
        <div className="error-message" role="alert">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard container">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="welcome-text">Welcome back, {user?.full_name}. Here is the platform overview.</p>
        </div>
        <button className="btn-refresh" onClick={fetchMetrics}>
          Refresh Metrics
        </button>
      </div>

      {metrics && (
        <div className="metrics-section">
          <h2>Overview Platform Metrics</h2>
          
          <div className="metrics-grid main-metrics">
            <div className="metric-card revenue">
              <div className="metric-icon">💵</div>
              <div className="metric-content">
                <h3>Total Revenue</h3>
                <p className="metric-value">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(metrics.totalRevenue)}</p>
              </div>
            </div>
            
            <div className="metric-card users">
              <div className="metric-icon">👥</div>
              <div className="metric-content">
                <h3>Total Users</h3>
                <p className="metric-value">{metrics.totalUsers.toLocaleString()}</p>
              </div>
            </div>

            <div className="metric-card bookings">
              <div className="metric-icon">📑</div>
              <div className="metric-content">
                <h3>Total Bookings</h3>
                <p className="metric-value">{metrics.totalBookings.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <h2 style={{ marginTop: '2rem' }}>Inventory Overview</h2>
          <div className="metrics-grid inventory-metrics">
            <div className="metric-card inventory">
              <div className="metric-icon">✈️</div>
              <div className="metric-content">
                <h3>Registered Flights</h3>
                <p className="metric-value">{metrics.totalFlights.toLocaleString()}</p>
              </div>
            </div>

            <div className="metric-card inventory">
              <div className="metric-icon">🚄</div>
              <div className="metric-content">
                <h3>Registered Trains</h3>
                <p className="metric-value">{metrics.totalTrains.toLocaleString()}</p>
              </div>
            </div>

            <div className="metric-card inventory">
              <div className="metric-icon">🏨</div>
              <div className="metric-content">
                <h3>Registered Hotels</h3>
                <p className="metric-value">{metrics.totalHotels.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="admin-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/flights" className="action-card">
            <h3>Manage Flights</h3>
            <p>View and manage flight schedules and pricing</p>
          </Link>
          <Link to="/trains" className="action-card">
            <h3>Manage Trains</h3>
            <p>View and manage train schedules and pricing</p>
          </Link>
          <Link to="/hotels" className="action-card">
            <h3>Manage Hotels</h3>
            <p>View and manage hotel listings and pricing</p>
          </Link>
          <Link to="/admin/add-data" className="action-card" style={{ border: '2px dashed var(--primary-color)' }}>
            <h3>➕ Add Inventory</h3>
            <p>Add new flights, trains, or hotels to the system</p>
          </Link>
        </div>
        <div className="seeding-instructions" style={{ marginTop: '2rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #f59e0b' }}>
          <h3>💡 System Initialization</h3>
          <p>To populate this dashboard, you can add data using the "Manage" links above, or use the database seeding scripts in the backend services.</p>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
