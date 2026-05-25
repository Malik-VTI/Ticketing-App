import React from 'react'
import './Shared.css'

interface BookingModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}

export default BookingModal
