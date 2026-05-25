import React, { useMemo } from 'react'

interface DateCarouselProps {
  baseDate: string // YYYY-MM-DD
  onDateChange: (newDate: string) => void
}

const DateCarousel: React.FC<DateCarouselProps> = ({ baseDate, onDateChange }) => {
  const dateCarousel = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return {
        iso: d.toISOString().split('T')[0],
        dateStr: d.getDate(),
        dayStr: d.toLocaleDateString('en-US', { weekday: 'short' }),
      }
    })
  }, [])

  return (
    <div className="date-carousel">
      <button className="nav-btn">&lt;</button>
      {dateCarousel.map((d, i) => {
        const isActive = d.iso === baseDate
        return (
          <div 
            key={i} 
            className={`date-tab ${isActive ? 'active' : ''}`} 
            onClick={() => onDateChange(d.iso)}
            style={{ cursor: 'pointer' }}
          >
            <span className="date">{d.dateStr}</span>
            <span className="day">{d.dayStr}</span>
          </div>
        )
      })}
      <button className="nav-btn">&gt;</button>
    </div>
  )
}

export default DateCarousel
