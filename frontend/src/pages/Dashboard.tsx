import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Dashboard.css'

const Dashboard = () => {
  const { user } = useAuth()

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.full_name}!</p>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-card">
          <h3>My Bookings</h3>
          <p>View and manage your bookings</p>
          <Link to="/bookings" className="dashboard-link">
            View Bookings →
          </Link>
        </div>

        <div className="dashboard-card">
          <h3>Search Flights</h3>
          <p>Find and book flights</p>
          <Link to="/flights" className="dashboard-link">
            Browse Flights →
          </Link>
        </div>

        <div className="dashboard-card">
          <h3>Search Trains</h3>
          <p>Find and book train tickets</p>
          <Link to="/trains" className="dashboard-link">
            Browse Trains →
          </Link>
        </div>

        <div className="dashboard-card">
          <h3>Search Hotels</h3>
          <p>Find and book hotels</p>
          <Link to="/hotels" className="dashboard-link">
            Browse Hotels →
          </Link>
        </div>
      </div>

      <div className="user-info-card">
        <h3>Account Information</h3>
        <div className="info-row">
          <span className="info-label">Email:</span>
          <span className="info-value">{user?.email}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Full Name:</span>
          <span className="info-value">{user?.full_name}</span>
        </div>
        {user?.phone && (
          <div className="info-row">
            <span className="info-label">Phone:</span>
            <span className="info-value">{user.phone}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

