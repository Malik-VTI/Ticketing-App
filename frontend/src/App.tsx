import { Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Flights from './pages/Flights'
import Trains from './pages/Trains'
import Hotels from './pages/Hotels'
import HotelDetail from './pages/HotelDetail'
import BookingHistory from './pages/BookingHistory'
import BookingDetail from './pages/BookingDetail'
import Payment from './pages/Payment'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import AdminAddData from './pages/AdminAddData'
import ComingSoon from './pages/ComingSoon'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="flights" element={<Flights />} />
            <Route path="trains" element={<Trains />} />
            <Route path="ships" element={<ComingSoon />} />
            <Route path="buses" element={<ComingSoon />} />
            <Route path="hotels" element={<Hotels />} />
            <Route path="hotels/:id" element={<HotelDetail />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="bookings"
              element={
                <ProtectedRoute>
                  <BookingHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="bookings/:id"
              element={
                <ProtectedRoute>
                  <BookingDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="payment/:bookingId"
              element={
                <ProtectedRoute>
                  <Payment />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/add-data"
              element={
                <ProtectedRoute>
                  <AdminAddData />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
