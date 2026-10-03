import { useState } from 'react'

function Register() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!/^0\d{9}$/.test(phone)) {
      setMessage('Số điện thoại phải có 10 chữ số và bắt đầu bằng 0.')
      return
    }

    if (!/(?=.*[A-Za-z])(?=.*\d).{8,}/.test(password)) {
      setMessage('Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        'http://localhost:8080/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            phone,
            email,
            password,
          }),
        }
      )

      const data = await response.text()

      if (!response.ok) {
        throw new Error(data || 'Đăng ký thất bại')
      }

      setMessage('Mã xác minh đã được gửi tới email Gmail của bạn.')
      setOtpStep(true)
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!/^\d{6}$/.test(otp)) {
      setMessage('Mã OTP phải gồm 6 chữ số.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        'http://localhost:8080/api/auth/verify-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            otp,
          }),
        }
      )

      const data = await response.text()

      if (!response.ok) {
        throw new Error(data || 'Xác minh email thất bại')
      }

      setMessage('Xác minh email thành công! Bạn có thể đăng nhập.')
      setOtp('')
      setOtpStep(false)
      setName('')
      setPhone('')
      setEmail('')
      setPassword('')
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
    <div className="register-page">
      <div className="background-circle circle-one"></div>
      <div className="background-circle circle-two"></div>

      <div className="register-container">
        <div className="register-brand">
          <div className="logo">
            <span>TR</span>
          </div>

          <h1>TroRoom</h1>

          <p>
            Tạo tài khoản để quản lý
            <br />
            phòng trọ dễ dàng hơn
          </p>
        </div>

        <div className="register-card">
          <div className="register-header">
            <h2>Tạo tài khoản</h2>
            <p>Điền thông tin để bắt đầu sử dụng TroRoom</p>
          </div>

          {otpStep ? (
            <form onSubmit={handleVerifyOtp}>
              <h2>Xác minh email</h2>

              <p>
                Mã OTP đã được gửi tới:
                <br />
                <strong>{email}</strong>
              </p>

              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Nhập mã OTP 6 số"
                maxLength={6}
                inputMode="numeric"
                required
              />

              <button type="submit" disabled={loading} className="register-button">
                {loading ? 'Đang xác minh...' : 'Xác minh email'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Họ và tên</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập họ và tên"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Số điện thoại</label>
                <div className="input-wrapper">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0987654321"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Mật khẩu</label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ít nhất 8 ký tự, gồm chữ và số"
                    className="password-input"
                    required
                  />
                  <button
                    type="button"
                    className="show-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="password-hint">
                  Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số
                </p>
              </div>

              <button
                type="submit"
                className="register-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Đang tạo tài khoản...
                  </>
                ) : (
                  'Tạo tài khoản'
                )}
              </button>
            </form>
          )}

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

          <div className="divider">
            <span>hoặc</span>
          </div>

          <div className="login-link">
            Đã có tài khoản?
            <a href="/"> Đăng nhập</a>
          </div>
        </div>

        <p className="copyright">
          2026 TroRoom · Hệ thống quản lý phòng trọ
        </p>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .register-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            #eff6ff 0%,
            #f8fafc 45%,
            #eef2ff 100%
          );
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          color: #172033;
        }

        .background-circle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .circle-one {
          width: 420px;
          height: 420px;
          top: -180px;
          left: -130px;
          background: rgba(37, 99, 235, 0.12);
        }

        .circle-two {
          width: 500px;
          height: 500px;
          right: -220px;
          bottom: -220px;
          background: rgba(99, 102, 241, 0.12);
        }

        .register-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 430px;
          padding: 28px 20px;
        }

        .register-brand {
          text-align: center;
          margin-bottom: 20px;
        }

        .logo {
          width: 58px;
          height: 58px;
          margin: 0 auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 17px;
          background: linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          );
          box-shadow:
            0 10px 25px rgba(37, 99, 235, 0.25);
        }

        .logo span {
          color: white;
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .register-brand h1 {
          margin: 0;
          font-size: 27px;
          font-weight: 800;
          letter-spacing: -0.8px;
        }

        .register-brand p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .register-card {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 20px;
          padding: 30px 32px;
          box-shadow:
            0 20px 60px rgba(15, 23, 42, 0.10);
          backdrop-filter: blur(12px);
        }

        .register-header {
          margin-bottom: 23px;
        }

        .register-header h2 {
          margin: 0 0 6px;
          font-size: 21px;
          font-weight: 750;
        }

        .register-header p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 7px;
          font-size: 13px;
          font-weight: 650;
          color: #334155;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-wrapper input {
          width: 100%;
          height: 46px;
          padding: 0 14px; /* Chỉnh lùi sát mép trái (14px) */
          border: 1px solid #dbe2ea;
          border-radius: 11px;
          outline: none;
          background: #f8fafc;
          color: #172033;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .input-wrapper input.password-input {
          padding-right: 42px; /* Dành khoảng trống bên phải cho nút ẩn/hiện mật khẩu */
        }

        .input-wrapper input::placeholder {
          color: #94a3b8;
        }

        .input-wrapper input:focus {
          border-color: #2563eb;
          background: white;
          box-shadow:
            0 0 0 4px rgba(37, 99, 235, 0.10);
        }

        .show-password {
          position: absolute;
          right: 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 16px;
          padding: 6px;
          opacity: 0.7;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .show-password:hover {
          opacity: 1;
        }

        .password-hint {
          margin: 6px 0 0;
          font-size: 11px;
          color: #94a3b8;
        }

        .register-button {
          width: 100%;
          height: 48px;
          margin-top: 5px;
          border: none;
          border-radius: 11px;
          background: linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          );
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            0 8px 18px rgba(37, 99, 235, 0.20);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
        }

        .register-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 12px 24px rgba(37, 99, 235, 0.28);
        }

        .register-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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
          margin-top: 15px;
          padding: 10px 12px;
          border-radius: 99px;
          font-size: 13px;
          text-align: center;
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
          margin: 20px 0 17px;
          color: #94a3b8;
          font-size: 12px;
        }

        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .login-link {
          text-align: center;
          font-size: 13px;
          color: #64748b;
        }

        .login-link a {
          color: #2563eb;
          font-weight: 700;
          text-decoration: none;
        }

        .login-link a:hover {
          text-decoration: underline;
        }

        .copyright {
          margin: 18px 0 0;
          text-align: center;
          color: #94a3b8;
          font-size: 11px;
        }

        @media (max-width: 480px) {
          .register-container {
            padding: 20px 16px;
          }

          .register-card {
            padding: 24px 20px;
            border-radius: 17px;
          }
        }
      `}</style>
    </div>
  )
}

export default Register