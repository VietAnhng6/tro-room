import React, { useState } from 'react'

export function Register() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccessMsg, setIsSuccessMsg] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!/^0\d{9}$/.test(phone)) {
      setMessage('Số điện thoại phải có 10 chữ số và bắt đầu bằng 0.')
      setIsSuccessMsg(false)
      return
    }

    if (!/(?=.*[A-Za-z])(?=.*\d).{8,}/.test(password)) {
      setMessage('Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số.')
      setIsSuccessMsg(false)
      return
    }

    setLoading(true)
    setMessage('')
    setIsSuccessMsg(false)

    try {
      const response = await fetch('http://localhost:8080/api/auth/register', {
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
      })

      const data = await response.text()

      if (!response.ok) {
        throw new Error(data || 'Đăng ký thất bại')
      }

      setMessage('Mã xác minh OTP đã được gửi thành công về Gmail của bạn!')
      setIsSuccessMsg(true)
      setOtpStep(true)
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.'
      )
      setIsSuccessMsg(false)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!/^\d{6}$/.test(otp)) {
      setMessage('Mã OTP phải gồm 6 chữ số.')
      setIsSuccessMsg(false)
      return
    }

    setLoading(true)
    setMessage('')
    setIsSuccessMsg(false)

    try {
      const response = await fetch('http://localhost:8080/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      })

      const data = await response.text()

      if (!response.ok) {
        throw new Error(data || 'Xác minh email thất bại')
      }

      setMessage('Xác minh email thành công! Đang chuyển đến trang đăng nhập...')
      setIsSuccessMsg(true)

      // Chuyển thẳng về trang đăng nhập
      setTimeout(() => {
        window.location.href = '/'
      }, 1000)
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.'
      )
      setIsSuccessMsg(false)
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
            và tìm kiếm phòng trọ dễ dàng hơn
          </p>
        </div>

        <div className="register-card">
          <div className="register-header">
            <h2>{otpStep ? 'Xác thực OTP Email' : 'Tạo tài khoản mới'}</h2>
            <p>
              {otpStep
                ? 'Nhập mã gồm 6 số đã gửi về hòm thư Gmail của bạn'
                : 'Điền thông tin để bắt đầu sử dụng TroRoom'}
            </p>
          </div>

          {/* DÒNG THÔNG BÁO MÃ OTP / LỖI / THÀNH CÔNG (MÀU XANH LÁ RÕ RÀNG KHI GỬI THÀNH CÔNG) */}
          {message && (
            <div
              className={`message-box ${
                isSuccessMsg ||
                message.includes('thành công') ||
                message.includes('đã được gửi')
                  ? 'message-success'
                  : 'message-error'
              }`}
            >
              <span>{message}</span>
            </div>
          )}

          {otpStep ? (
            <form onSubmit={handleVerifyOtp} style={{ marginTop: '16px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Mã OTP đã được gửi tới email:
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e40af', marginTop: '4px' }}>
                  {email}
                </div>
              </div>

              {/* INPUT KHUNG NHẬP OTP TINH TẾ, ĐẸP MẮT */}
              <div className="form-group" style={{ textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: '#334155' }}>
                  Mã xác nhận 6 chữ số
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  required
                  className="sleek-otp-input"
                />
              </div>

              <button type="submit" disabled={loading} className="register-button" style={{ marginTop: '16px' }}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Đang xác minh...
                  </>
                ) : (
                  'Xác thực & Đăng nhập ngay'
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep(false)
                    setMessage('')
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#2563eb',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  ← Quay lại sửa thông tin email
                </button>
              </div>
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
                    placeholder="Nhập họ và tên đầy đủ"
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
                <label>Email (nhận mã OTP)</label>
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
                  Mật khẩu cần ít nhất 8 ký tự, gồm cả chữ và số
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
                    Đang gửi mã xác minh...
                  </>
                ) : (
                  'Đăng ký tài khoản'
                )}
              </button>
            </form>
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
          © 2026 TroRoom · Hệ thống quản lý phòng trọ
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
          max-width: 440px;
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
          fontSize: 13px;
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
          margin-bottom: 18px;
        }

        .register-header h2 {
          margin: 0 0 6px;
          font-size: 21px;
          font-weight: 800;
          color: #0f172a;
        }

        .register-header p {
          margin: 0;
          color: #64748b;
          font-size: 13.5px;
          line-height: 1.4;
        }

        /* THÔNG BÁO OTP MÀU XANH / ĐỎ */
        .message-box {
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 650;
          line-height: 1.45;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .message-success {
          background-color: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #047857;
        }

        .message-error {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        /* KHUNG NHẬP OTP ĐẸP, MỊN MÀNG */
        .sleek-otp-input {
          width: 100%;
          letter-spacing: 12px;
          text-align: center;
          font-size: 26px;
          font-weight: 800;
          font-family: monospace, -apple-system, sans-serif;
          padding: 14px 16px;
          border: 2px solid #93c5fd;
          border-radius: 14px;
          background: #f8fafc;
          color: #1e3a8a;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.06);
        }

        .sleek-otp-input:focus {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-wrapper input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border: 1.5px solid #cbd5e1;
          border-radius: 11px;
          font-size: 14px;
          outline: none;
          color: #0f172a;
          background: #ffffff;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-wrapper input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .password-input {
          padding-right: 44px !important;
        }

        .show-password {
          position: absolute;
          right: 12px;
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }

        .show-password:hover {
          color: #475569;
        }

        .password-hint {
          margin: 5px 0 0;
          font-size: 11.5px;
          color: #64748b;
        }

        .register-button {
          width: 100%;
          height: 46px;
          margin-top: 10px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          );
          color: white;
          font-size: 15px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .register-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 25px rgba(37, 99, 235, 0.30);
        }

        .register-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .divider {
          position: relative;
          text-align: center;
          margin: 20px 0;
        }

        .divider::before {
          content: "";
          position: absolute;
          left: 0;
          top: 50%;
          width: 100%;
          height: 1px;
          background: #e2e8f0;
        }

        .divider span {
          position: relative;
          background: white;
          padding: 0 10px;
          color: #94a3b8;
          font-size: 12px;
        }

        .login-link {
          text-align: center;
          font-size: 13.5px;
          color: #64748b;
        }

        .login-link a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 750;
          margin-left: 4px;
        }

        .copyright {
          text-align: center;
          margin-top: 20px;
          color: #94a3b8;
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}

export default Register