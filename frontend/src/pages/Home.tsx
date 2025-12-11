import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Home.css'

const Home = () => {
  const { isAuthenticated } = useAuth()

  return (
    <div className="home">
      <div className="hero">
        <h1>Welcome to Ticketing Application</h1>
        <p>Book flights, trains, and hotels with ease</p>
        <div className="hero-actions">
          {!isAuthenticated && (
            <>
              <Link to="/register" className="btn btn-primary">
                Get Started
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Login
              </Link>
            </>
          )}
          <Link to="/flights" className="btn btn-outline">
            Search Flights
          </Link>
          {isAuthenticated && (
            <Link to="/dashboard" className="btn btn-primary">
              Go to Dashboard
            </Link>
          )}
        </div>
      </div>

      <div className="features">
        <div className="feature-card">
          <h3>Flights</h3>
          <p>Search and book flights to your favorite destinations</p>
          <Link to="/flights" className="link-more">
            Start searching →
          </Link>
        </div>
        <div className="feature-card">
          <h3>Trains</h3>
          <p>Find the best train routes and schedules</p>
          <Link to="/trains" className="link-more">
            Start searching →
          </Link>
        </div>
        <div className="feature-card">
          <h3>Hotels</h3>
          <p>Discover comfortable accommodations</p>
          <Link to="/hotels" className="link-more">
            Start searching →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Home

