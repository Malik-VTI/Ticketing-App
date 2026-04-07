import React, { useState } from 'react'
import { adminAPI } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'

const AdminAddData: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'flight' | 'train' | 'hotel'>('flight')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    flight: { flightNumber: '', airlineId: '', departureAirportId: '', arrivalAirportId: '', departureTime: '', arrivalTime: '' },
    train: { trainNumber: '', name: '', type: 'Express' },
    hotel: { name: '', city: '', address: '', rating: 5, description: '' }
  })

  const handleChange = (type: keyof typeof formData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (activeTab === 'flight') await adminAPI.addFlight(formData.flight)
      else if (activeTab === 'train') await adminAPI.addTrain(formData.train)
      else if (activeTab === 'hotel') await adminAPI.addHotel(formData.hotel)
      
      showToast(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} added successfully!`, 'success')
      navigate('/admin/dashboard')
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to add data.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-add-data container">
      <div className="card admin-form-card">
        <div className="admin-form-header">
          <h1>Add New Inventory</h1>
          <p>Fill in the details to add new services to the system.</p>
        </div>

        <div className="admin-tabs">
          <button className={activeTab === 'flight' ? 'active' : ''} onClick={() => setActiveTab('flight')}>Flight</button>
          <button className={activeTab === 'train' ? 'active' : ''} onClick={() => setActiveTab('train')}>Train</button>
          <button className={activeTab === 'hotel' ? 'active' : ''} onClick={() => setActiveTab('hotel')}>Hotel</button>
        </div>

        <form onSubmit={handleSubmit} className="premium-form">
          {activeTab === 'flight' && (
            <div className="form-grid">
              <div className="form-group">
                <label>Flight Number</label>
                <input type="text" value={formData.flight.flightNumber} onChange={(e) => handleChange('flight', 'flightNumber', e.target.value)} required placeholder="GA-123" />
              </div>
              <div className="form-group">
                <label>Airline ID (UUID)</label>
                <input type="text" value={formData.flight.airlineId} onChange={(e) => handleChange('flight', 'airlineId', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Departure Airport ID</label>
                <input type="text" value={formData.flight.departureAirportId} onChange={(e) => handleChange('flight', 'departureAirportId', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Arrival Airport ID</label>
                <input type="text" value={formData.flight.arrivalAirportId} onChange={(e) => handleChange('flight', 'arrivalAirportId', e.target.value)} required />
              </div>
            </div>
          )}

          {activeTab === 'train' && (
            <div className="form-grid">
              <div className="form-group">
                <label>Train Number</label>
                <input type="text" value={formData.train.trainNumber} onChange={(e) => handleChange('train', 'trainNumber', e.target.value)} required placeholder="KA-Argolawu" />
              </div>
              <div className="form-group">
                <label>Train Name</label>
                <input type="text" value={formData.train.name} onChange={(e) => handleChange('train', 'name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={formData.train.type} onChange={(e) => handleChange('train', 'type', e.target.value)}>
                  <option value="Express">Express</option>
                  <option value="Business">Business</option>
                  <option value="Economy">Economy</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'hotel' && (
            <div className="form-grid">
              <div className="form-group">
                <label>Hotel Name</label>
                <input type="text" value={formData.hotel.name} onChange={(e) => handleChange('hotel', 'name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>City</label>
                <input type="text" value={formData.hotel.city} onChange={(e) => handleChange('hotel', 'city', e.target.value)} required />
              </div>
              <div className="form-group full-width">
                <label>Address</label>
                <input type="text" value={formData.hotel.address} onChange={(e) => handleChange('hotel', 'address', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Rating</label>
                <input type="number" min="1" max="5" value={formData.hotel.rating} onChange={(e) => handleChange('hotel', 'rating', Number(e.target.value))} />
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate('/admin/dashboard')}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Adding...' : `Add ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminAddData
