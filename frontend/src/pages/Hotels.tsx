import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hotelAPI, Hotel } from '../services/api'
import Skeleton from '../components/Skeleton'
import DateCarousel from '../components/shared/DateCarousel'
import FilterSidebar from '../components/shared/FilterSidebar'
import PaginationControls from '../components/shared/PaginationControls'
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
  
  // Filters and sorting
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc')

  useEffect(() => {
    loadHotels(0)
  }, [])

  // Fix 2.1: Refetch on visibility change (e.g. returning from booking)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (searchMode) {
          handleSearch(new Event('submit') as any)
        } else {
          loadHotels(pageMeta.page)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [searchMode, pageMeta.page, searchParams])

  // Fix 2.2: Automatically search when checkin changes
  useEffect(() => {
    if (searchParams.city && searchParams.checkin && searchParams.checkout) {
      handleSearch(new Event('submit') as any)
    }
  }, [searchParams.checkin])

  const loadHotels = async (page: number) => {
    setLoading(true)
    setError('')
    try {
      const response = await hotelAPI.getHotels({
        page,
        size: PAGE_SIZE,
      })

      if (Array.isArray(response)) {
        setHotels(response)
        setPageMeta({ page: 0, totalPages: 1, totalElements: response.length })
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
      setError(err.response?.data?.message || err.message || 'Failed to load hotels')
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
      const result = await hotelAPI.searchHotels(searchParams)

      if (Array.isArray(result)) {
        setHotels(result)
        setPageMeta({ page: 0, totalPages: 1, totalElements: result.length })
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSearchParams(prev => ({
      ...prev,
      [e.target.name]: e.target.name === 'guests' ? parseInt(e.target.value, 10) : e.target.value,
    }))
  }



  return (
    <div className="hotels-page container">
      {/* 1. Header Search Bar Area */}
      <section className="search-banner">
        <form className="search-bar" onSubmit={handleSearch}>
          <div className="search-field" style={{ flex: 1.5 }}>
            <label>City, Destination, or Hotel Name</label>
            <div className="input-with-icon">
              <span>🏙️</span>
              <input
                type="text"
                name="city"
                value={searchParams.city}
                onChange={handleInputChange}
                placeholder="e.g., Jakarta, Bali"
              />
            </div>
          </div>

          <div className="search-divider"></div>

          <div className="search-field">
            <label>Check-in</label>
            <div className="input-with-icon">
              <span>📅</span>
              <input
                type="date"
                name="checkin"
                value={searchParams.checkin}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="search-field">
            <label>Check-out</label>
            <div className="input-with-icon">
              <span>📅</span>
              <input
                type="date"
                name="checkout"
                value={searchParams.checkout}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="search-field">
            <label>Guests & Rooms</label>
            <div className="input-with-icon">
              <span>👥</span>
              <select name="guests" value={searchParams.guests} onChange={handleInputChange}>
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num} Guest{num > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <button className="btn-search-primary" type="submit" disabled={searchLoading}>
            {searchLoading ? '...' : 'Search Hotel'}
          </button>
        </form>
      </section>

      {error && (
        <div className="alert-error" style={{marginTop: '24px'}}>
          <span className="alert-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* 2. Main Layout */}
      <section className="main-content-grid" style={{marginTop: error ? '16px' : '24px'}}>
        
        {/* Left Col: Filters */}
        <FilterSidebar 
          filters={filters}
          onFilterChange={(groupId, value, checked) => {
            setFilters(prev => {
              const groupFilters = prev[groupId] || []
              if (checked) return { ...prev, [groupId]: [...groupFilters, value] }
              return { ...prev, [groupId]: groupFilters.filter(v => v !== value) }
            })
          }}
          onReset={() => { setFilters({}); loadHotels(0) }}
          groups={[
            {
              id: 'rating', title: 'Star Rating', type: 'checkbox',
              options: [
                { label: '5 Stars ⭐⭐⭐⭐⭐', value: '5' },
                { label: '4 Stars ⭐⭐⭐⭐', value: '4' },
                { label: '3 Stars ⭐⭐⭐', value: '3' },
                { label: '1-2 Stars ⭐⭐', value: '1-2' }
              ]
            }
          ]}
        />

        {/* Mid Col: Results */}
        <div className="results-container">
          <div className="results-header">
            <div>
              <h2 style={{fontSize: '1.25rem', marginBottom: '4px'}}>Available Properties <span style={{fontSize: '0.9rem', color: '#9ca3af', fontWeight: 400}}>( The best stays at the best prices )</span></h2>
            </div>
            <div className="results-actions">
              <button className="btn-secondary" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} style={{ padding: '4px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
                Sort Price {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          <DateCarousel 
            baseDate={searchParams.checkin} 
            onDateChange={(newDate) => setSearchParams(p => ({...p, checkin: newDate}))} 
          />

          {loading ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <Skeleton type="card" count={3} height="240px" />
            </div>
          ) : hotels.length === 0 ? (
            <div style={{padding: '24px', textAlign: 'center'}}>No hotels available.</div>
          ) : null}

          <div className="hotel-list">
            {(() => {
              let displayedHotels = hotels
              
              if (filters.rating && filters.rating.length > 0) {
                displayedHotels = displayedHotels.filter(h => {
                  const r = Math.floor(h.rating || 4)
                  if (r >= 5 && filters.rating.includes('5')) return true;
                  if (r === 4 && filters.rating.includes('4')) return true;
                  if (r === 3 && filters.rating.includes('3')) return true;
                  if (r <= 2 && filters.rating.includes('1-2')) return true;
                  return false;
                })
              }
              
              const getHotelMinPrice = (hotel: Hotel) => {
                const rates = hotel.roomTypes?.flatMap(rt => rt.rates ?? []) ?? [];
                return rates.length > 0 ? Math.min(...rates.map(r => r.price)) : 0;
              }

              displayedHotels.sort((a, b) => {
                const aPrice = getHotelMinPrice(a)
                const bPrice = getHotelMinPrice(b)
                return sortOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice
              })

              if (displayedHotels.length === 0 && !loading) {
                return <div style={{padding: '24px', textAlign: 'center'}}>No matching hotels.</div>
              }

              return displayedHotels.map(hotel => {
                const hotelId = (hotel as any).id ?? (hotel as any).ID ?? (hotel as any).Id
                return (
                  <div className="hotel-row-card" key={hotelId}>
                    {/* Mock image container */}
                    <div className="hotel-image">
                      <span className="mock-img-icon">🏠</span>
                    </div>

                    <div className="hotel-content">
                      <div className="row-card-top">
                        <div className="route-info">
                          <span className="origin">{hotel.name}</span>
                        </div>
                        <div className="rating">
                          <span className="star">★</span> {hotel.rating != null ? hotel.rating.toFixed(1) : '4.5'} <span className="bookmark">🔖</span>
                        </div>
                      </div>
                      
                      <div className="hotel-class-label">
                        📍 {hotel.city} {hotel.address && `• ${hotel.address}`}
                      </div>

                      <div className="room-types-row">
                        {hotel.roomTypes && hotel.roomTypes.length > 0 ? (
                          <div className="room-badges">
                            {hotel.roomTypes.slice(0, 2).map((rt) => (
                              <span key={rt.id} className="room-badge">{rt.name} (Max: {rt.capacity})</span>
                            ))}
                            {hotel.roomTypes.length > 2 && <span className="room-badge">+{hotel.roomTypes.length - 2} more</span>}
                          </div>
                        ) : (
                          <span className="room-badge">Standard Rooms</span>
                        )}
                      </div>

                      <div className="row-card-bottom">
                        <div className="facilities">
                          <p>Facilities</p>
                          <div className="tags">
                            <span>📶 WiFi</span>
                            <span>🏊 Pool</span>
                            <span>🍳 Breakfast</span>
                          </div>
                        </div>
                        <div className="price-action">
                          <div className="price-text">Starting from <br/><span>IDR {
                            (() => {
                              const minPrice = getHotelMinPrice(hotel)
                              return minPrice > 0 ? new Intl.NumberFormat('id-ID').format(minPrice) : 'TBD';
                            })()
                          }</span> / Night</div>
                          <Link to={hotelId ? `/hotels/${hotelId}` : '#'} className="btn-buy-now" style={{display: 'inline-block', textAlign: 'center', textDecoration: 'none'}}>
                            Select Room
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
          <PaginationControls pageMeta={pageMeta} onPageChange={loadHotels} />
        </div>

        {/* Right Col: Promos */}
        <aside className="right-sidebar">
          <div className="widget-card discounts-widget">
            <div className="widget-header">
              <h3>🎫 Special Offers</h3>
              <a href="#">See all</a>
            </div>
            
            <div className="promo-card">
              <div className="promo-top">
                <div className="promo-icon" style={{background: '#10b981'}}>🏖️</div>
                <div>
                  <h4>Bali Getaway Discount 30%</h4>
                  <p>Valid for minimum 3 nights stay</p>
                </div>
              </div>
              <div className="promo-code-box">
                BALI-VIBES-30 <span>📋</span>
              </div>
            </div>

            <div className="promo-card">
              <div className="promo-top">
                <div className="promo-icon" style={{background: '#3b82f6'}}>💳</div>
                <div>
                  <h4>Bank Partner Cashback 15%</h4>
                  <p>Pay with selected credit cards</p>
                </div>
              </div>
              <div className="promo-code-box">
                CC-STAY-15 <span>📋</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

export default Hotels
