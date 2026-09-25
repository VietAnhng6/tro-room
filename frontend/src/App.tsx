import { useState } from 'react'

function App() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const token = new URLSearchParams(window.location.search).get('token')

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      setMessage('Link đặt lại mật khẩu không hợp lệ.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Mật khẩu nhập lại không khớp.')
      return
    }

    if (!/(?=.*[A-Za-z])(?=.*\d).{8,}/.test(password)) {
      setMessage('Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        'http://localhost:8080/api/auth/reset-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            newPassword: password,
          }),
        }
      )

      const data = await response.text()

      if (!response.ok) {
        throw new Error(data)
      }

      setMessage('Đặt lại mật khẩu thành công!')
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Có lỗi xảy ra. Vui lòng thử lại.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f4f6f8',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '380px',
          background: 'white',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>
          TroRoom
        </h1>

        <p style={{ textAlign: 'center', color: '#666' }}>
          Đặt lại mật khẩu
        </p>

        <form onSubmit={handleReset}>
          <label>Mật khẩu mới</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu mới"
            required
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '8px',
              marginBottom: '16px',
              boxSizing: 'border-box',
            }}
          />

          <label>Nhập lại mật khẩu</label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu"
            required
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '8px',
              marginBottom: '20px',
              boxSizing: 'border-box',
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              border: 'none',
              borderRadius: '6px',
              background: '#2563eb',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: '20px',
              textAlign: 'center',
              color: message.includes('thành công')
                ? 'green'
                : 'red',
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

export default App