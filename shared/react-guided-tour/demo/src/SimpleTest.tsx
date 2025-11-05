import { useState } from 'react'

export function SimpleTest() {
  const [clicked, setClicked] = useState(false)

  return (
    <div style={{ padding: '20px' }}>
      <h1>🎯 Tour Test</h1>
      <p>Testing step progression...</p>
      <button 
        onClick={() => setClicked(!clicked)}
        style={{
          padding: '12px 24px',
          background: clicked ? 'green' : 'blue',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        {clicked ? '✅ Working!' : 'Click to Test'}
      </button>
      <div style={{ marginTop: '20px' }}>
        {clicked && <p>✅ Step progression is working correctly!</p>}
      </div>
    </div>
  )
}