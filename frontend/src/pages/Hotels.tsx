import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hotelAPI, Hotel } from '../services/api'
import './Hotels.css'

const PAGE_SIZE = 6

const Hotels = () => {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [searchParams, setSearchParams] = useState({
    city: '',
    checkin: new Date().toISOString().split('T')[0],
    checkout: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    guests: 1,
  })
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchMode, setSearchMode] = useState(false)
  const [pageMeta, setPageMeta] = useState({
    page: 0,
    totalPages: 0,
    totalElements: 0,
  })

  useEffect(() => {
    loadHotels(0)
  }, [])

  const loadHotels = async (page: number) => {
    setLoading(true)
    setError('')
    try {
      const response = await hotelAPI.getHotels({
        page,
        size: PAGE_SIZE,
      })

      // Handle both array response (search) and paginated response
      if (Array.isArray(response)) {
        setHotels(response)
        setPageMeta({
          page: 0,
          totalPages: 1,
          totalElements: response.length,
        })
      } else {
        setHotels(response.content || [])
        setPageMeta({
          page: response.number ?? page,
          totalPages: response.totalPages ?? 0,
          totalElements: response.totalElements ?? 0,
        })
      }
      setSearchMode(false)
    } catch (err: any) {
      console.error('Error loading hotels:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load hotels'
      setError(errorMessage)
      setHotels([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!searchParams.city) {
      setError('Please provide a city name')
      return
    }

    if (searchParams.checkin >= searchParams.checkout) {
      setError('Check-out date must be after check-in date')
      return
    }

    setSearchLoading(true)
    try {
      const result = await hotelAPI.searchHotels({
        city: searchParams.city,
        checkin: searchParams.checkin,
        checkout: searchParams.checkout,
        guests: searchParams.guests,
      })

      if (Array.isArray(result)) {
        setHotels(result)
        setPageMeta({
          page: 0,
          totalPages: 1,
          totalElements: result.length,
        })
      } else {
        setHotels(result.content || [])
        setPageMeta({
          page: result.number ?? 0,
          totalPages: result.totalPages ?? 0,
          totalElements: result.totalElements ?? 0,
        })
      }
      setSearchMode(true)
      if (hotels.length === 0) {
        setError('No hotels found for the selected criteria.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search hotels')
      setHotels([])
      setSearchMode(true)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleReset = () => {
    setSearchMode(false)
    setSearchParams((prev) => ({
      ...prev,
      city: '',
    }))
    setError('')
    // setSelectedHotelRooms({})
    loadHotels(0)
  }

  const handlePageChange = (newPage: number) => {
    if (searchMode || newPage < 0 || newPage >= pageMeta.totalPages) return
    loadHotels(newPage)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams((prev) => ({
      ...prev,
      [e.target.name]: parseInt(e.target.value, 10),
    }))
  }


  return (
    <div className="hotels">
      <div className="hotels-header">
        <h1>Hotels</h1>
        <p>Browse available hotels or search by city, check-in, and check-out dates.</p>
      </div>

      <form className="hotels-form" onSubmit={handleSearch}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input
              type="text"
              id="city"
              name="city"
              value={searchParams.city}
              onChange={handleInputChange}
              placeholder="e.g., Jakarta, Bandung, Bali"
            />
          </div>

          <div className="form-group">
            <label htmlFor="checkin">Check-in Date</label>
            <input
              type="date"
              id="checkin"
              name="checkin"
              value={searchParams.checkin}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="checkout">Check-out Date</label>
            <input
              type="date"
              id="checkout"
              name="checkout"
              value={searchParams.checkout}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="guests">Guests</label>
            <select
              id="guests"
              name="guests"
              value={searchParams.guests}
              onChange={handleSelectChange}
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-search" type="submit" disabled={searchLoading}>
            {searchLoading ? 'Searching...' : 'Search Hotels'}
          </button>
          {searchMode && (
            <button type="button" className="btn-reset" onClick={handleReset}>
              Reset Search
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="hotels-results">
        {loading && <p>Loading hotels...</p>}

        {!loading && hotels.length === 0 && !error && (
          <p>{searchMode ? 'No hotels matched your search.' : 'No hotels available.'}</p>
        )}

        {hotels.map((hotel) => {
          // Defensive: some backends might return Id/ID instead of id
          const hotelId = (hotel as any).id ?? (hotel as any).ID ?? (hotel as any).Id
          return (
          <div className="hotel-card" key={hotelId}>
            <div className="hotel-card__header">
              <div>
                <h2>{hotel.name}</h2>
                <p className="hotel-location">
                  {hotel.city} {hotel.address && `• ${hotel.address}`}
                </p>
                {hotel.rating && (
                  <p className="hotel-rating">
                    ⭐ {hotel.rating.toFixed(1)}
                  </p>
                )}
              </div>
            </div>

            <div className="hotel-info">
              {hotel.roomTypes && hotel.roomTypes.length > 0 && (
                <div className="room-types">
                  <p className="label">Room Types Available</p>
                  <div className="room-type-grid">
                    {hotel.roomTypes.map((rt) => (
                      <div className="room-type-card" key={rt.id}>
                        <p className="room-type-name">{rt.name}</p>
                        <p className="room-type-capacity">Capacity: {rt.capacity} guests</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link
                to={hotelId ? `/hotels/${hotelId}` : '#'}
                className="btn-view-rooms"
              >
                View Available Rooms →
              </Link>
            </div>
          </div>
        )})}

        {!searchMode && pageMeta.totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => handlePageChange(pageMeta.page - 1)} disabled={pageMeta.page === 0}>
              Previous
            </button>
            <span>
              Page {pageMeta.page + 1} of {pageMeta.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pageMeta.page + 1)}
              disabled={pageMeta.page + 1 >= pageMeta.totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Hotels

