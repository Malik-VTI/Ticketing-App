import { useNavigate } from 'react-router-dom'

const ComingSoon = () => {
  const navigate = useNavigate()

  return (
    <div className="coming-soon-page container" style={{
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '60vh',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚧</div>
      <h1 style={{ fontSize: '2rem', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Coming Soon</h1>
      <p style={{ color: 'var(--text-gray)', marginBottom: '2rem', maxWidth: '400px' }}>
        We are working hard to bring this feature to you. Please check back later!
      </p>
      <button 
        style={{
          background: 'var(--blue-primary)',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          fontWeight: 500,
          cursor: 'pointer'
        }}
        onClick={() => navigate('/')}
      >
        Back to Home
      </button>
    </div>
  )
}

export default ComingSoon
