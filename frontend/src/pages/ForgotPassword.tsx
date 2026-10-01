import { useState } from 'react'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        `http://localhost:8080/api/auth/forgot-password?email=${encodeURIComponent(email)}`,
        {
          method: 'POST',
        }
      )

      const data = await response.text()

      if (!response.ok) {
        throw new Error(data || 'Không thể gửi email đặt lại mật khẩu.')
      }

      setMessage(
        'Nếu email tồn tại trong hệ thống, link đặt lại mật khẩu đã được gửi.'
      )
      setEmail('')
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
    <div className="forgot-page">
      <div className="background-circle circle-one"></div>
      <div className="background-circle circle-two"></div>

      <div className="forgot-container">

        <div className="forgot-brand">
          <div className="logo">
            <span>TR</span>
          </div>

          <h1>TroRoom</h1>

          <p>
            Khôi phục quyền truy cập
            <br />
            vào tài khoản của bạn
          </p>
        </div>

        <div className="forgot-card">

          <div className="back-link">
            <a href="/">← Quay lại đăng nhập</a>
          </div>

          <div className="forgot-icon">
            
          </div>

          <div className="forgot-header">
            <h2>Quên mật khẩu?</h2>
            <p>
              Nhập email đã đăng ký. Chúng tôi sẽ gửi
              cho bạn một đường link để đặt lại mật khẩu.
            </p>
          </div>

          <form onSubmit={handleForgotPassword}>

            <div className="form-group">
              <label htmlFor="email">
                Email tài khoản
              </label>

              <div className="input-wrapper">
                <span className="input-icon"></span>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="forgot-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Đang gửi...
                </>
              ) : (
                'Gửi link đặt lại mật khẩu'
              )}
            </button>

          </form>

          {message && (
            <div
              className={
                message.includes('đã được gửi')
                  ? 'message success'
                  : 'message error'
              }
            >
              {message}
            </div>
          )}

        </div>

        <p className="copyright">
          © 2026 TroRoom · Hệ thống quản lý phòng trọ
        </p>

      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .forgot-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            #ced9e7 0%,
            #d1dde9 45%,
            #d1d8ee 100%
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

        .forgot-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 430px;
          padding: 32px 20px;
        }

        .forgot-brand {
          text-align: center;
          margin-bottom: 22px;
        }

        .logo {
          width: 62px;
          height: 62px;
          margin: 0 auto 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
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
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .forgot-brand h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.8px;
        }

        .forgot-brand p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .forgot-card {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 20px;
          padding: 30px 32px;
          box-shadow:
            0 20px 60px rgba(15, 23, 42, 0.10);
          backdrop-filter: blur(12px);
        }

        .back-link {
          margin-bottom: 24px;
        }

        .back-link a {
          color: #64748b;
          font-size: 13px;
          text-decoration: none;
          font-weight: 600;
        }

        .back-link a:hover {
          color: #2563eb;
        }

        .forgot-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #eff6ff;
          font-size: 25px;
        }

        .forgot-header {
          text-align: center;
          margin-bottom: 25px;
        }

        .forgot-header h2 {
          margin: 0 0 8px;
          font-size: 21px;
          font-weight: 750;
        }

        .forgot-header p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 650;
          color: #334155;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          font-size: 15px;
          z-index: 1;
          opacity: 0.75;
        }

        .input-wrapper input {
          width: 100%;
          height: 48px;
          padding: 0 44px;
          border: 1px solid #dbe2ea;
          border-radius: 11px;
          outline: none;
          background: #f8fafc;
          color: #172033;
          font-size: 14px;
          transition: all 0.2s ease;
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

        .forgot-button {
          width: 100%;
          height: 48px;
          border: none;
          border-radius: 11px;
          background: linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          );
          color: white;
          font-size: 14px;
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

        .forgot-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 12px 24px rgba(37, 99, 235, 0.28);
        }

        .forgot-button:disabled {
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
          margin-top: 16px;
          padding: 11px 13px;
          border-radius: 9px;
          font-size: 13px;
          text-align: center;
          line-height: 1.5;
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

        .copyright {
          margin: 20px 0 0;
          text-align: center;
          color: #94a3b8;
          font-size: 11px;
        }

        @media (max-width: 480px) {
          .forgot-container {
            padding: 24px 16px;
          }

          .forgot-card {
            padding: 24px 20px;
            border-radius: 17px;
          }
        }
      `}</style>
    </div>
  )
}

export default ForgotPassword