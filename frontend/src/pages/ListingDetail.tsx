import { useEffect, useMemo, useState } from 'react'

const API = 'http://localhost:8080'

type ServiceItem = {
  id: number
  name: string
  calculationMethod: string
  unit: string
  price: number
}

type ListingDetailData = {
  id: number
  title: string
  description: string
  status: string
  createdAt: string
  expiresAt: string
  roomId: number
  roomCode: string
  floor: number
  area: number
  rent: number
  maxPeople: number
  estimatedDeposit: number
  buildingName: string
  district: string
  address: string
  images: { id: number; imageUrl: string; sortOrder: number }[]
  services: ServiceItem[]
  estimatedFixedMonthlyCost: number
  estimatedFirstMonthCost: number
}

type Notice = {
  type: 'success' | 'error' | 'info'
  text: string
  requestCode?: string
}

const money = (value: number) =>
  `${new Intl.NumberFormat('vi-VN').format(value)} đ`

function vietnamDate(daysFromToday = 0) {
  const today = new Date()
  const base = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + daysFromToday)

  const year = base.getFullYear()
  const month = String(base.getMonth() + 1).padStart(2, '0')
  const day = String(base.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function methodLabel(method: string, unit: string) {
  switch (method) {
    case 'FIXED_ROOM':
      return `Cố định / ${unit || 'tháng'}`
    case 'BY_METER':
      return `Theo số đồng hồ (${unit || 'số'})`
    case 'BY_PERSON':
      return `Theo số người (${unit || 'người'})`
    default:
      return unit || method
  }
}

function ListingDetail() {
  const listingId = Number(window.location.pathname.split('/').pop())
  const today = useMemo(() => vietnamDate(), [])
  const maxDate = useMemo(() => vietnamDate(60), [])

  const [listing, setListing] = useState<ListingDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [previewZoomUrl, setPreviewZoomUrl] = useState<string | null>(null)

  // S2-06 Rental Request form state
  const [requestType, setRequestType] = useState<'VIEWING' | 'RENT_NOW'>('VIEWING')
  const [desiredDate, setDesiredDate] = useState('')
  const [expectedPeople, setExpectedPeople] = useState('1')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const token = localStorage.getItem('accessToken')
  const role = localStorage.getItem('role')

  useEffect(() => {
    if (!Number.isFinite(listingId)) {
      setLoadError('Tin đăng không hợp lệ')
      setLoading(false)
      return
    }

    const controller = new AbortController()

    fetch(`${API}/api/public/listings/${listingId}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.message || 'Tin đăng không còn hiển thị hoặc phòng đã được thuê.')
        }
        setListing(data as ListingDetailData)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setLoadError(error instanceof Error ? error.message : 'Không thể tải tin đăng.')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [listingId])

  const submitRequest = async () => {
    setNotice(null)

    if (!token) {
      setNotice({
        type: 'info',
        text: 'Vui lòng đăng nhập tài khoản Khách thuê để gửi yêu cầu thuê hoặc đặt lịch xem phòng.',
      })
      return
    }

    if (role && role !== 'TENANT') {
      setNotice({
        type: 'error',
        text: 'Chỉ tài khoản Khách thuê mới được gửi yêu cầu xem phòng hoặc thuê ngay.',
      })
      return
    }

    if (!desiredDate) {
      setNotice({ type: 'error', text: 'Vui lòng chọn ngày mong muốn.' })
      return
    }

    if (desiredDate < today || desiredDate > maxDate) {
      setNotice({
        type: 'error',
        text: 'Ngày mong muốn phải từ hôm nay đến tối đa 60 ngày tới.',
      })
      return
    }

    const people = Number(expectedPeople)
    if (!Number.isInteger(people) || people < 1) {
      setNotice({ type: 'error', text: 'Số người dự kiến ở phải lớn hơn 0.' })
      return
    }

    if (listing && people > listing.maxPeople) {
      setNotice({
        type: 'error',
        text: `Số người vượt giới hạn của phòng: tối đa ${listing.maxPeople} người.`,
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(
        `${API}/api/public/listings/${listingId}/requests`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: requestType,
            desiredDate,
            expectedPeople: people,
            message: message.trim(),
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setNotice({
          type: 'success',
          text: 'Yêu cầu của bạn đã được gửi thành công đến chủ nhà!',
          requestCode: data.requestCode,
        })
        setDesiredDate('')
        setMessage('')
        return
      }

      setNotice({
        type: 'error',
        text: data.message || 'Không thể gửi yêu cầu. Vui lòng thử lại sau.',
      })
    } catch {
      setNotice({
        type: 'error',
        text: 'Không thể kết nối máy chủ backend.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="detail-loading-screen">
        <div className="spinner"></div>
        <p>Đang tải thông tin chi tiết phòng...</p>
      </div>
    )
  }

  if (loadError || !listing) {
    return (
      <div className="detail-page-wrapper">
        <div className="error-container">
          <div className="error-card">
            <div className="error-icon">🏚️</div>
            <h1 className="error-heading">Không thể mở tin đăng</h1>
            <p className="error-message">{loadError || 'Tin đăng không còn hiển thị.'}</p>
            <a href="/search-rooms" className="btn-back-search">
              ← Quay lại trang tìm kiếm phòng
            </a>
          </div>
        </div>
      </div>
    )
  }

  const services = listing.services || []
  const images = listing.images || []
  const currentImage = images[selectedImageIndex] || images[0]

  // Tính tổng chi phí tháng đầu: Tiền phòng + Tiền cọc (1 tháng) + Dịch vụ cố định
  const depositAmount = listing.estimatedDeposit || listing.rent
  const fixedCost = listing.estimatedFixedMonthlyCost || 0
  const calculatedFirstMonthTotal = listing.rent + depositAmount + fixedCost

  return (
    <div className="detail-page-wrapper">
      {/* NAVBAR */}
      <nav className="detail-navbar">
        <div className="nav-container">
          <a href="/search-rooms" className="brand-logo">
            <div className="logo-icon">🏠</div>
            <div className="logo-text">
              <span className="logo-itro"><span className="highlight">i</span>Tro</span>
            </div>
          </a>

          <div className="nav-actions">
            <a href="/search-rooms" className="nav-link-btn">
              ← Danh sách phòng
            </a>
            {token ? (
              <a href="/dashboard" className="nav-btn-primary">
                Dashboard ➔
              </a>
            ) : (
              <a href="/" className="nav-btn-primary">
                Đăng nhập
              </a>
            )}
          </div>
        </div>
      </nav>

      <main className="detail-main-content">
        <div className="detail-container">
          {/* TOP BREADCRUMB & TITLE */}
          <div className="breadcrumb-bar">
            <a href="/search-rooms">Tìm phòng</a>
            <span>/</span>
            <span>{listing.buildingName}</span>
            <span>/</span>
            <span className="current">Phòng {listing.roomCode}</span>
          </div>

          <div className="listing-header">
            <div>
              <div className="status-badge">🟢 ĐANG CHO THUÊ</div>
              <h1 className="listing-title">{listing.title}</h1>
              <p className="listing-address">
                📍 <strong>{listing.buildingName}</strong> · {listing.address} ({listing.district || 'Hà Nội'})
              </p>
            </div>

            <div className="price-tag-hero">
              <div className="price-hero-label">Giá thuê niêm yết</div>
              <div className="price-hero-value">{money(listing.rent)}</div>
              <div className="price-hero-unit">/ tháng</div>
            </div>
          </div>

          {/* MAIN GRID: 2 COLUMNS (LEFT: GALLERY & SPECS, RIGHT: COST & REQUEST FORM) */}
          <div className="detail-grid-layout">
            {/* LEFT COLUMN */}
            <div className="detail-left-col">
              {/* INTERACTIVE IMAGE GALLERY (S2-05) */}
              <section className="gallery-card">
                {images.length > 0 ? (
                  <>
                    <div className="main-image-container">
                      <img
                        src={`${API}${currentImage.imageUrl}`}
                        alt={`${listing.title} - ảnh ${selectedImageIndex + 1}`}
                        className="main-gallery-img"
                        onClick={() => setPreviewZoomUrl(`${API}${currentImage.imageUrl}`)}
                      />
                      <div className="gallery-counter-badge">
                        📸 {selectedImageIndex + 1} / {images.length}
                      </div>
                      <button
                        type="button"
                        className="btn-zoom-image"
                        onClick={() => setPreviewZoomUrl(`${API}${currentImage.imageUrl}`)}
                        title="Phóng to ảnh"
                      >
                        🔍 Phóng to
                      </button>
                    </div>

                    {/* Thumbnail carousel */}
                    <div className="gallery-thumbs-row">
                      {images.map((img, idx) => (
                        <button
                          key={img.id}
                          type="button"
                          className={`thumb-btn ${selectedImageIndex === idx ? 'active' : ''}`}
                          onClick={() => setSelectedImageIndex(idx)}
                        >
                          <img src={`${API}${img.imageUrl}`} alt={`Thumbnail ${idx + 1}`} />
                          {idx === 0 && <span className="thumb-cover-tag">Ảnh bìa</span>}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="no-images-placeholder">
                    <span>🏠</span>
                    <p>Chưa có hình ảnh phòng thực tế cho tin đăng này</p>
                  </div>
                )}
              </section>

              {/* ROOM SPECIFICATIONS */}
              <section className="info-card">
                <h2 className="card-section-title">📐 Thông số chi tiết phòng</h2>
                <div className="specs-grid">
                  <div className="spec-card-item">
                    <div className="spec-item-icon">🚪</div>
                    <div className="spec-item-info">
                      <span className="spec-item-label">Mã phòng</span>
                      <strong className="spec-item-val">{listing.roomCode}</strong>
                    </div>
                  </div>

                  <div className="spec-card-item">
                    <div className="spec-item-icon">📏</div>
                    <div className="spec-item-info">
                      <span className="spec-item-label">Diện tích</span>
                      <strong className="spec-item-val">{listing.area} m²</strong>
                    </div>
                  </div>

                  <div className="spec-card-item">
                    <div className="spec-item-icon">🏢</div>
                    <div className="spec-item-info">
                      <span className="spec-item-label">Vị trí tầng</span>
                      <strong className="spec-item-val">Tầng {listing.floor}</strong>
                    </div>
                  </div>

                  <div className="spec-card-item">
                    <div className="spec-item-icon">👥</div>
                    <div className="spec-item-info">
                      <span className="spec-item-label">Sức chứa tối đa</span>
                      <strong className="spec-item-val">{listing.maxPeople} người</strong>
                    </div>
                  </div>

                  <div className="spec-card-item">
                    <div className="spec-item-icon">💰</div>
                    <div className="spec-item-info">
                      <span className="spec-item-label">Tiền cọc giữ phòng</span>
                      <strong className="spec-item-val">{money(depositAmount)} (1 tháng)</strong>
                    </div>
                  </div>

                  <div className="spec-card-item">
                    <div className="spec-item-icon">📅</div>
                    <div className="spec-item-info">
                      <span className="spec-item-label">Thời hạn tin đăng</span>
                      <strong className="spec-item-val">Đến {listing.expiresAt ? listing.expiresAt.slice(0, 10) : '30 ngày'}</strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* DESCRIPTION */}
              <section className="info-card">
                <h2 className="card-section-title">📝 Mô tả chi tiết từ chủ nhà</h2>
                <div className="description-content">
                  {listing.description ? (
                    <p style={{ whiteSpace: 'pre-line' }}>{listing.description}</p>
                  ) : (
                    <p className="muted-text">Phòng trọ khép kín, tiện nghi đầy đủ, an ninh đảm bảo, giờ giấc tự do.</p>
                  )}
                </div>
              </section>

              {/* SERVICES AND FEES TABLE (S2-05) */}
              <section className="info-card">
                <h2 className="card-section-title">⚡ Bảng đơn giá dịch vụ & tiện ích</h2>
                <div className="table-responsive">
                  <table className="services-detail-table">
                    <thead>
                      <tr>
                        <th>Tên dịch vụ</th>
                        <th>Cách tính</th>
                        <th>Đơn vị</th>
                        <th style={{ textAlign: 'right' }}>Đơn giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.length > 0 ? (
                        services.map((srv) => (
                          <tr key={srv.id}>
                            <td className="font-bold">{srv.name}</td>
                            <td>
                              <span className="method-pill">{methodLabel(srv.calculationMethod, srv.unit)}</span>
                            </td>
                            <td>{srv.unit || '-'}</td>
                            <td className="price-cell">{money(srv.price)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="empty-cell">
                            Chưa có danh sách dịch vụ riêng được thiết lập.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: ESTIMATED FIRST MONTH COST & RENTAL REQUEST FORM */}
            <div className="detail-right-col">
              {/* FIRST MONTH ESTIMATED COST BOX (S2-05) */}
              <section className="first-month-card">
                <div className="cost-card-header">
                  <span className="cost-icon">🧮</span>
                  <div>
                    <h3 className="cost-card-title">Ước tính tổng chi phí tháng đầu</h3>
                    <p className="cost-card-subtitle">Chi phí dự kiến khi ký hợp đồng và nhận phòng</p>
                  </div>
                </div>

                <div className="cost-breakdown-list">
                  <div className="cost-row">
                    <span>💵 Tiền thuê phòng (tháng 1):</span>
                    <strong>{money(listing.rent)}</strong>
                  </div>
                  <div className="cost-row">
                    <span>🔒 Tiền đặt cọc giữ phòng (1 tháng):</span>
                    <strong>{money(depositAmount)}</strong>
                  </div>
                  <div className="cost-row">
                    <span>📦 Chi phí dịch vụ cố định hàng tháng:</span>
                    <strong>{money(fixedCost)}</strong>
                  </div>

                  <div className="cost-total-row">
                    <span>TỔNG CỘNG THÁNG ĐẦU:</span>
                    <span className="total-amount">{money(calculatedFirstMonthTotal)}</span>
                  </div>
                </div>

                <div className="cost-disclaimer-note">
                  <strong>💡 Ghi chú quan trọng về Điện & Nước:</strong>
                  <p>
                    Khoản tính trên chưa bao gồm tiền Điện & Nước. Tiền Điện & Nước sẽ được tính riêng theo chỉ số công tơ/đồng hồ thực tế tiêu thụ trong tháng (theo bảng đơn giá dịch vụ niêm yết).
                  </p>
                </div>
              </section>

              {/* RENTAL REQUEST FORM (S2-06) */}
              <section className="request-card">
                <h3 className="request-card-title">📨 Gửi yêu cầu đặt lịch hoặc thuê</h3>
                <p className="request-card-desc">
                  Chủ nhà sẽ nhận được thông tin và liên hệ lại với bạn sớm nhất.
                </p>

                {notice && (
                  <div className={`notice-box ${notice.type}`}>
                    <div>{notice.text}</div>
                    {notice.requestCode && (
                      <div className="request-code-highlight">
                        Mã yêu cầu của bạn: <strong>{notice.requestCode}</strong>
                      </div>
                    )}
                  </div>
                )}

                {!token && (
                  <div className="unauthenticated-notice">
                    <span>ℹ️</span>
                    <div>
                      Bạn đang xem tin với tư cách khách vãng lai. Vui lòng <a href="/">Đăng nhập</a> hoặc <a href="/register">Đăng ký tài khoản Khách thuê</a> để gửi yêu cầu đặt lịch xem phòng.
                    </div>
                  </div>
                )}

                <div className="form-group-item">
                  <label className="form-label">Loại yêu cầu *</label>
                  <div className="request-type-selector">
                    <button
                      type="button"
                      className={`type-btn ${requestType === 'VIEWING' ? 'active' : ''}`}
                      onClick={() => setRequestType('VIEWING')}
                    >
                      👁️ Đặt lịch xem phòng
                    </button>
                    <button
                      type="button"
                      className={`type-btn ${requestType === 'RENT_NOW' ? 'active' : ''}`}
                      onClick={() => setRequestType('RENT_NOW')}
                    >
                      🚀 Thuê ngay
                    </button>
                  </div>
                </div>

                <div className="form-group-item">
                  <label className="form-label">Ngày mong muốn (trong 60 ngày tới) *</label>
                  <input
                    type="date"
                    className="form-input"
                    min={today}
                    max={maxDate}
                    value={desiredDate}
                    onChange={(e) => setDesiredDate(e.target.value)}
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-label">Số người dự kiến ở * (Tối đa {listing.maxPeople} người)</label>
                  <input
                    type="number"
                    min="1"
                    max={listing.maxPeople}
                    className="form-input"
                    value={expectedPeople}
                    onChange={(e) => setExpectedPeople(e.target.value)}
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-label">Lời nhắn gửi chủ nhà (Tùy chọn)</label>
                  <textarea
                    rows={3}
                    className="form-input"
                    placeholder="VD: Tôi có thể xem phòng vào lúc 18h tối được không?..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  className="btn-submit-request"
                  onClick={submitRequest}
                >
                  {submitting ? 'Đang gửi yêu cầu...' : '🚀 Gửi yêu cầu ngay'}
                </button>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL ZOOM ẢNH FULL SIZE */}
      {previewZoomUrl && (
        <div
          className="zoom-overlay"
          onClick={() => setPreviewZoomUrl(null)}
        >
          <div className="zoom-modal-content">
            <img src={previewZoomUrl} alt="Phóng to ảnh phòng" />
            <p>Bấm bất kỳ đâu để đóng</p>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="detail-footer">
        <p>© 2026 ITRO · Nền tảng quản lý phòng trọ trực tuyến</p>
      </footer>

      {/* CSS STYLES */}
      <style>{`
        .detail-page-wrapper {
          min-height: 100vh;
          background-color: #f8fafc;
          font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1e293b;
          display: flex;
          flex-direction: column;
        }

        .detail-navbar {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .nav-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #eb6b40, #f97316);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 18px;
        }

        .logo-itro {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
        }

        .logo-itro .highlight {
          color: #eb6b40;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-link-btn {
          color: #475569;
          text-decoration: none;
          font-size: 13.5px;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .nav-link-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .nav-btn-primary {
          background: #eb6b40;
          color: #fff;
          font-size: 13.5px;
          font-weight: 700;
          padding: 8px 18px;
          border-radius: 8px;
          text-decoration: none;
          box-shadow: 0 4px 10px rgba(235, 107, 64, 0.25);
        }

        .detail-main-content {
          flex: 1;
          padding: 28px 20px;
        }

        .detail-container {
          max-width: 1280px;
          margin: 0 auto;
        }

        .breadcrumb-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #64748b;
          margin-bottom: 16px;
        }

        .breadcrumb-bar a {
          color: #2563eb;
          text-decoration: none;
        }

        .breadcrumb-bar .current {
          color: #0f172a;
          font-weight: 600;
        }

        .listing-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          background: #dcfce7;
          color: #15803d;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .listing-title {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
          line-height: 1.3;
        }

        .listing-address {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .price-tag-hero {
          background: linear-gradient(135deg, #fff7ed, #ffedd5);
          border: 1px solid #fed7aa;
          padding: 16px 22px;
          border-radius: 14px;
          text-align: right;
          min-width: 200px;
        }

        .price-hero-label {
          font-size: 12px;
          color: #9a3412;
          font-weight: 600;
        }

        .price-hero-value {
          font-size: 26px;
          font-weight: 900;
          color: #c2410c;
          line-height: 1.2;
        }

        .price-hero-unit {
          font-size: 12px;
          color: #9a3412;
        }

        /* 2-COLUMN GRID */
        .detail-grid-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.1fr);
          gap: 24px;
          align-items: start;
        }

        .detail-left-col, .detail-right-col {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .gallery-card, .info-card, .first-month-card, .request-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
        }

        /* GALLERY */
        .main-image-container {
          position: relative;
          height: 380px;
          border-radius: 14px;
          overflow: hidden;
          background: #0f172a;
          cursor: zoom-in;
        }

        .main-gallery-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.3s;
        }

        .main-gallery-img:hover {
          transform: scale(1.02);
        }

        .gallery-counter-badge {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: rgba(15, 23, 42, 0.75);
          color: #fff;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
        }

        .btn-zoom-image {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          color: #0f172a;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .gallery-thumbs-row {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .thumb-btn {
          width: 80px;
          height: 60px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid transparent;
          background: #0f172a;
          padding: 0;
          cursor: pointer;
          flex-shrink: 0;
          position: relative;
        }

        .thumb-btn.active {
          border-color: #eb6b40;
        }

        .thumb-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumb-cover-tag {
          position: absolute;
          bottom: 2px;
          left: 2px;
          right: 2px;
          background: #eb6b40;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          text-align: center;
        }

        .no-images-placeholder {
          text-align: center;
          padding: 60px 20px;
          background: #f8fafc;
          border-radius: 14px;
          border: 1px dashed #cbd5e1;
          color: #64748b;
        }

        .no-images-placeholder span {
          font-size: 48px;
          display: block;
          margin-bottom: 10px;
        }

        .card-section-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 16px 0;
        }

        /* SPECS GRID */
        .specs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
        }

        .spec-card-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 16px;
        }

        .spec-item-icon {
          font-size: 24px;
        }

        .spec-item-info {
          display: flex;
          flex-direction: column;
        }

        .spec-item-label {
          font-size: 11.5px;
          color: #64748b;
          font-weight: 600;
        }

        .spec-item-val {
          font-size: 14.5px;
          color: #0f172a;
          font-weight: 750;
        }

        .description-content {
          font-size: 14.5px;
          line-height: 1.65;
          color: #334155;
        }

        /* SERVICES TABLE */
        .table-responsive {
          overflow-x: auto;
        }

        .services-detail-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        .services-detail-table th {
          background: #f8fafc;
          padding: 10px 14px;
          text-align: left;
          font-weight: 700;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }

        .services-detail-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #f1f5f9;
        }

        .font-bold {
          font-weight: 700;
          color: #1e293b;
        }

        .method-pill {
          background: #f1f5f9;
          color: #334155;
          font-size: 12px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .price-cell {
          text-align: right;
          font-weight: 800;
          color: #0f172a;
        }

        .empty-cell {
          text-align: center;
          color: #94a3b8;
          padding: 24px;
        }

        /* FIRST MONTH COST CARD */
        .first-month-card {
          background: #fdfbf7;
          border: 1.5px solid #fed7aa;
        }

        .cost-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid #ffedd5;
        }

        .cost-icon {
          font-size: 28px;
        }

        .cost-card-title {
          font-size: 17px;
          font-weight: 800;
          color: #9a3412;
          margin: 0;
        }

        .cost-card-subtitle {
          font-size: 12px;
          color: #c2410c;
          margin: 2px 0 0 0;
        }

        .cost-breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .cost-row {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
          color: #475569;
        }

        .cost-row strong {
          color: #0f172a;
        }

        .cost-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 14px;
          margin-top: 6px;
          border-top: 2px dashed #fed7aa;
          font-size: 14px;
          font-weight: 800;
          color: #9a3412;
        }

        .total-amount {
          font-size: 22px;
          font-weight: 900;
          color: #c2410c;
        }

        .cost-disclaimer-note {
          margin-top: 16px;
          padding: 12px 14px;
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid #fed7aa;
          font-size: 12px;
          color: #78350f;
          line-height: 1.5;
        }

        .cost-disclaimer-note p {
          margin: 4px 0 0 0;
        }

        /* RENTAL REQUEST FORM */
        .request-card-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
        }

        .request-card-desc {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 16px 0;
        }

        .unauthenticated-notice {
          padding: 10px 14px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          color: #1e40af;
          font-size: 12.5px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .unauthenticated-notice a {
          color: #2563eb;
          font-weight: 700;
          text-decoration: underline;
        }

        .notice-box {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13.5px;
          margin-bottom: 16px;
        }

        .notice-box.success {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
        }

        .notice-box.error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .notice-box.info {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
        }

        .request-code-highlight {
          margin-top: 6px;
          font-size: 14px;
        }

        .form-group-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }

        .form-label {
          font-size: 12.5px;
          font-weight: 700;
          color: #475569;
        }

        .request-type-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .type-btn {
          padding: 9px 12px;
          border: 1.5px solid #cbd5e1;
          background: #f8fafc;
          color: #334155;
          font-size: 13px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .type-btn.active {
          border-color: #eb6b40;
          background: #fff7ed;
          color: #c2410c;
        }

        .form-input {
          padding: 10px 12px;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13.5px;
          outline: none;
          font-family: inherit;
        }

        .form-input:focus {
          border-color: #eb6b40;
        }

        .btn-submit-request {
          width: 100%;
          padding: 13px;
          background: #eb6b40;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(235, 107, 64, 0.3);
          transition: all 0.2s;
          margin-top: 6px;
        }

        .btn-submit-request:hover:not(:disabled) {
          background: #dc592e;
          transform: translateY(-1px);
        }

        /* ZOOM OVERLAY */
        .zoom-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          cursor: zoom-out;
        }

        .zoom-modal-content {
          max-width: 900px;
          width: 100%;
          text-align: center;
        }

        .zoom-modal-content img {
          max-width: 100%;
          max-height: 85vh;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }

        .zoom-modal-content p {
          color: #fff;
          font-size: 13px;
          margin-top: 10px;
        }

        .detail-loading-screen, .error-container {
          min-height: 80vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          text-align: center;
        }

        .spinner {
          width: 38px;
          height: 38px;
          border: 3px solid #e2e8f0;
          border-top-color: #eb6b40;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        .error-card {
          background: #fff;
          padding: 40px 30px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          max-width: 440px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
        }

        .error-icon {
          font-size: 50px;
          margin-bottom: 12px;
        }

        .error-heading {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 8px 0;
        }

        .error-message {
          font-size: 14px;
          color: #64748b;
          margin: 0 0 20px 0;
        }

        .btn-back-search {
          display: inline-block;
          padding: 10px 20px;
          background: #2563eb;
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-size: 13.5px;
          font-weight: 700;
        }

        .detail-footer {
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          padding: 24px;
          text-align: center;
          font-size: 13px;
          color: #94a3b8;
          margin-top: 40px;
        }

        /* RESPONSIVE STYLING DOWN TO 360PX */
        @media (max-width: 960px) {
          .detail-grid-layout {
            grid-template-columns: 1fr;
          }
          .main-image-container {
            height: 300px;
          }
        }

        @media (max-width: 600px) {
          .listing-header {
            padding: 18px;
          }
          .price-tag-hero {
            width: 100%;
            text-align: left;
          }
          .main-image-container {
            height: 240px;
          }
          .gallery-card, .info-card, .first-month-card, .request-card {
            padding: 18px;
          }
        }

        @media (max-width: 360px) {
          .detail-main-content {
            padding: 16px 8px;
          }
          .listing-title {
            font-size: 19px;
          }
          .main-image-container {
            height: 190px;
          }
          .price-hero-value {
            font-size: 21px;
          }
          .total-amount {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  )
}

export default ListingDetail
