import { useState } from 'react'

function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
        padding: '24px',
        boxSizing: 'border-box',
        background:
          'linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #eef2ff 100%)',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          padding: '40px',
          borderRadius: '20px',
          boxSizing: 'border-box',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.10)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              color: 'white',
              fontSize: '22px',
              fontWeight: 800,
              boxShadow: '0 10px 25px rgba(37, 99, 235, 0.25)',
            }}
          >
            TR
          </div>
        </div>

        <h1
          style={{
            textAlign: 'center',
            margin: '0 0 8px',
            fontSize: '27px',
            color: '#0f172a',
          }}
        >
          Đặt lại mật khẩu
        </h1>

        <p
          style={{
            textAlign: 'center',
            color: '#64748b',
            margin: '0 0 30px',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
        >
          Tạo mật khẩu mới cho tài khoản TroRoom của bạn
        </p>

        {!token ? (
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            Link đặt lại mật khẩu không hợp lệ hoặc đã bị thiếu token.
          </div>
        ) : (
          <form onSubmit={handleReset}>
            {/* New password */}
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                color: '#334155',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Mật khẩu mới
            </label>

            <div style={{ position: 'relative', marginBottom: '18px' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                required
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '0 48px 0 14px',
                  boxSizing: 'border-box',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#0f172a',
                }}
              />

         <button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  style={{
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#64748b',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  {showPassword ? (
    /* Icon Mắt gạch chéo (Ẩn mật khẩu) */
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  ) : (
    /* Icon Mắt mở (Hiện mật khẩu) */
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )}
</button>
            </div>

            {/* Confirm password */}
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                color: '#334155',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Nhập lại mật khẩu
            </label>

            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                required
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '0 48px 0 14px',
                  boxSizing: 'border-box',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#0f172a',
                }}
              />

          <button
  type="button"
  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
  style={{
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#64748b',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  {showConfirmPassword ? (
    /* Icon Mắt gạch chéo (Ẩn) */
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  ) : (
    /* Icon Mắt mở (Hiện) */
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )}
</button>
            </div>

            <p
              style={{
                margin: '0 0 22px',
                color: '#94a3b8',
                fontSize: '12px',
              }}
            >
              Mật khẩu tối thiểu 8 ký tự và phải có cả chữ và số.
            </p>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                border: 'none',
                borderRadius: '10px',
                background: loading
                  ? '#93c5fd'
                  : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: 'white',
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading
                  ? 'none'
                  : '0 8px 20px rgba(37, 99, 235, 0.25)',
              }}
            >
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}

        {message && (
          <div
            style={{
              marginTop: '18px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: message.includes('thành công')
                ? '#f0fdf4'
                : '#fef2f2',
              color: message.includes('thành công')
                ? '#16a34a'
                : '#dc2626',
              fontSize: '13px',
              textAlign: 'center',
              lineHeight: '1.5',
            }}
          >
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            window.location.href = '/'
          }}
          style={{
            display: 'block',
            margin: '22px auto 0',
            border: 'none',
            background: 'transparent',
            color: '#64748b',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ← Quay lại đăng nhập
        </button>
      </div>
    </div>
  )
}

export default ResetPassword