import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Layout.css'

const Layout = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Helper to determine if a route is active
  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <div className="layout">
      <header className="header">
        <div className="container header-container">
          <Link to="/" className="logo">
            <span className="logo-icon">🚄</span>
            <h1>RailPlan</h1>
          </Link>
          
          <nav className="nav-tabs">
            <NavLink to="/trains" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
              <span className="tab-icon">🚆</span> Train
            </NavLink>
            <NavLink to="/ships" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
              <span className="tab-icon">🚢</span> Ship
            </NavLink>
            <NavLink to="/flights" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
              <span className="tab-icon">✈️</span> Flight
            </NavLink>
            <NavLink to="/buses" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
              <span className="tab-icon">🚌</span> Bus
            </NavLink>
            <NavLink to="/hotels" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
              <span className="tab-icon">🏨</span> Hotel
            </NavLink>
            <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
              <span className="tab-icon">⚙️</span> Admin
            </NavLink>
          </nav>

          <div className="header-right">
            <button className="icon-btn">
              <span>🔖</span>
            </button>
            <button className="icon-btn">
              <span>🔔</span>
            </button>

            {isAuthenticated ? (
              <div className="user-dropdown">
                <Link to="/profile" className="profile-btn">
                  <div className="avatar">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <span className="user-name">{user?.full_name}</span>
                  <span className="chevron">⌄</span>
                </Link>
                <div className="dropdown-menu">
                  <Link to="/dashboard">Dashboard</Link>
                  <Link to="/admin/dashboard" className="admin-link">Admin</Link>
                  <button onClick={handleLogout}>Logout</button>
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="btn-login">Login</Link>
                <Link to="/register" className="btn-register">Register</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        {/* We don't restrict max-width here if the child wants to override, but usually container is useful */}
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
