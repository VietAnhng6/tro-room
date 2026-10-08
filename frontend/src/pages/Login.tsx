import { useState } from 'react'

function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        'http://localhost:8080/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifier,
            password,
          }),
        }
      )

      const contentType = response.headers.get('content-type') || ''

      if (!response.ok) {
        if (contentType.includes('application/json')) {
          const data = await response.json()
          throw new Error(
            data.message || 'Thông tin đăng nhập không chính xác'
          )
        }

        const errText = await response.text()
        throw new Error(
          errText || 'Thông tin đăng nhập không chính xác'
        )
      }

      const data = await response.json()

      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('role', data.role)

      setMessage('Đăng nhập thành công!')

      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 500)
    } catch (error) {
      const errStr = error instanceof Error ? error.message : String(error)
      if (errStr.includes('Failed to fetch') || errStr.includes('NetworkError')) {
        setMessage('Không thể kết nối đến máy chủ backend (http://localhost:8080). Vui lòng đảm bảo backend đang chạy.')
      } else {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Có lỗi xảy ra. Vui lòng thử lại.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="background-circle circle-one"></div>
        <div className="background-circle circle-two"></div>
      </div>

      <div className="login-container">
        {/* NÚT XEM PHÒNG TRỌ KHÔNG CẦN ĐĂNG NHẬP */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 20px',
              borderRadius: 24,
              background: '#ffffff',
              color: '#eb6b40',
              fontSize: 13.5,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 10px rgba(235,107,64,0.12)',
              border: '1.5px solid #fed7aa',
              transition: 'all 0.15s ease',
            }}
          >
            ← Khám phá phòng trọ (Không cần đăng nhập)
          </a>
        </div>

        {/* Logo / giới thiệu */}
        <div className="login-brand">
          <div className="logo">
            <span>TR</span>
          </div>

          <h1>TroRoom</h1>

          <p>
            Quản lý phòng trọ
            <br />
            đơn giản & hiệu quả
          </p>
        </div>

        {/* Form */}
        <div className="login-card">
          <div className="login-header">
            <h2>Chào mừng trở lại</h2>
            <p>Đăng nhập để tiếp tục sử dụng TroRoom</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="identifier">
                Số điện thoại hoặc Email
              </label>

              <div className="input-wrapper">
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Nhập số điện thoại hoặc email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="password-label">
                <label htmlFor="password">
                  Mật khẩu
                </label>

                <a href="/forgot-password">
                  Quên mật khẩu?
                </a>
              </div>

              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    /* Icon Mắt ẩn (gạch chéo) */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    /* Icon Mắt hiện (mở) */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          {message && (
            <div
              className={
                message.includes('thành công')
                  ? 'message success'
                  : 'message error'
              }
            >
              {message}
            </div>
          )}

          <div className="register-link" style={{ marginTop: '20px' }}>
            Chưa có tài khoản?
            <a href="/register"> Đăng ký ngay</a>
          </div>
        </div>

        <p className="copyright">
          © 2026 TroRoom · Hệ thống quản lý phòng trọ
        </p>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .login-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            #fff8f5 0%,
            #fdfbf7 45%,
            #fff4ee 100%
          );
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          color: #172033;
        }

        .login-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .background-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(2px);
        }

        .circle-one {
          width: 420px;
          height: 420px;
          top: -180px;
          left: -130px;
          background: rgba(235, 107, 64, 0.12);
        }

        .circle-two {
          width: 500px;
          height: 500px;
          right: -220px;
          bottom: -220px;
          background: rgba(238, 118, 77, 0.10);
        }

        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 430px;
          padding: 32px 20px;
        }

        .login-brand {
          text-align: center;
          margin-bottom: 24px;
        }

        .logo {
          width: 64px;
          height: 64px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: linear-gradient(
            135deg,
            #eb6b40,
            #f08050
          );
          box-shadow:
            0 10px 25px rgba(235, 107, 64, 0.25);
        }

        .logo span {
          color: white;
          font-size: 23px;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .login-brand h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.8px;
          color: #172033;
        }

        .login-brand p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(237, 232, 225, 0.9);
          border-radius: 20px;
          padding: 32px;
          box-shadow:
            0 20px 60px rgba(235, 107, 64, 0.08);
          backdrop-filter: blur(12px);
        }

        .login-header {
          margin-bottom: 26px;
        }

        .login-header h2 {
          margin: 0 0 7px;
          font-size: 21px;
          font-weight: 750;
          color: #172033;
        }

        .login-header p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label,
        .password-label label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 650;
          color: #334155;
        }

        .password-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .password-label a {
          font-size: 12px;
          color: #eb6b40;
          text-decoration: none;
          font-weight: 600;
        }

        .password-label a:hover {
          color: #dc592e;
          text-decoration: underline;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .input-wrapper input {
          width: 100%;
          height: 48px;
          padding: 0 42px 0 16px;
          border: 1px solid #dbe2ea;
          border-radius: 11px;
          outline: none;
          background: #fdfbf7;
          color: #172033;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .input-wrapper input::placeholder {
          color: #94a3b8;
        }

        .input-wrapper input:focus {
          border-color: #eb6b40;
          background: white;
          box-shadow:
            0 0 0 4px rgba(235, 107, 64, 0.12);
        }

        .show-password {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          cursor: pointer;
          color: #64748b;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: color 0.2s ease, background-color 0.2s ease;
        }

        .show-password:hover {
          color: #eb6b40;
          background-color: #fff3ec;
        }

        .login-button {
          width: 100%;
          height: 48px;
          margin-top: 3px;
          border: none;
          border-radius: 11px;
          background: linear-gradient(
            135deg,
            #eb6b40,
            #f08050
          );
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            0 8px 18px rgba(235, 107, 64, 0.25);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 12px 24px rgba(235, 107, 64, 0.32);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .spinner {
          width: 17px;
          height: 17px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .message {
          margin-top: 16px;
          padding: 11px 13px;
          border-radius: 9px;
          font-size: 13px;
          text-align: center;
          line-height: 1.4;
        }

        .message.success {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0 20px;
          color: #94a3b8;
          font-size: 12px;
        }

        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #ede8e1;
        }

        .register-link {
          text-align: center;
          font-size: 13px;
          color: #64748b;
        }

        .register-link a {
          color: #eb6b40;
          font-weight: 700;
          text-decoration: none;
        }

        .register-link a:hover {
          color: #dc592e;
          text-decoration: underline;
        }

        .copyright {
          margin: 20px 0 0;
          text-align: center;
          color: #94a3b8;
          font-size: 11px;
        }

        @media (max-width: 480px) {
          .login-container {
            padding: 24px 16px;
          }

          .login-card {
            padding: 24px 20px;
            border-radius: 17px;
          }

          .login-brand h1 {
            font-size: 25px;
          }
        }
      `}</style>
    </div>
  )
}

export default Login