import React from 'react'
import './Shared.css'

interface PageMeta {
  page: number
  totalPages: number
  totalElements: number
}

interface PaginationControlsProps {
  pageMeta: PageMeta
  onPageChange: (page: number) => void
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ pageMeta, onPageChange }) => {
  if (pageMeta.totalPages <= 1) return null

  return (
    <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
      <button 
        className="btn-secondary" 
        disabled={pageMeta.page === 0} 
        onClick={() => onPageChange(pageMeta.page - 1)}
        style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #ccc', background: pageMeta.page === 0 ? '#eee' : '#fff', cursor: pageMeta.page === 0 ? 'not-allowed' : 'pointer' }}
      >
        Previous
      </button>
      <span>Page {pageMeta.page + 1} of {pageMeta.totalPages}</span>
      <button 
        className="btn-secondary" 
        disabled={pageMeta.page >= pageMeta.totalPages - 1} 
        onClick={() => onPageChange(pageMeta.page + 1)}
        style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #ccc', background: pageMeta.page >= pageMeta.totalPages - 1 ? '#eee' : '#fff', cursor: pageMeta.page >= pageMeta.totalPages - 1 ? 'not-allowed' : 'pointer' }}
      >
        Next
      </button>
    </div>
  )
}

export default PaginationControls
