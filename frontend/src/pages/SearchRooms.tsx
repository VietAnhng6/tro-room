import { useEffect, useState } from 'react'

const API = 'http://localhost:8080'

type Listing = {
  id: number
  title: string
  description: string
  roomCode: string
  floor: number
  area: number
  rent: number
  maxPeople: number
  buildingName: string
  district: string
  address: string
}

type SearchResponse = {
  content: Listing[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

function SearchRooms() {
  const [district, setDistrict] = useState('')
  const [minRent, setMinRent] = useState('')
  const [maxRent, setMaxRent] = useState('')
  const [minArea, setMinArea] = useState('')
  const [maxArea, setMaxArea] = useState('')
  const [maxPeople, setMaxPeople] = useState('')
  const [sort, setSort] = useState('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [result, setResult] = useState<SearchResponse | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('accessToken')

  const searchRooms = async (targetPage = 0, targetSort = sort) => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()

      if (district.trim()) {
        params.set('district', district.trim())
      }

      if (minRent) {
        params.set('minRent', String(Number(minRent) * 1000000))
      }

      if (maxRent) {
        params.set('maxRent', String(Number(maxRent) * 1000000))
      }

      if (minArea) {
        params.set('minArea', minArea)
      }

      if (maxArea) {
        params.set('maxArea', maxArea)
      }

      if (maxPeople) {
        params.set('maxPeople', maxPeople)
      }

      params.set('sort', targetSort)
      params.set('page', String(targetPage))

      const response = await fetch(
        `${API}/api/public/listings/search?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error('Không thể tải danh sách phòng.')
      }

      const data: SearchResponse = await response.json()
      setResult(data)
      setPage(targetPage)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Có lỗi xảy ra khi tìm kiếm phòng.'
      )
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    searchRooms(0)
  }, [])

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value) + ' đ'
  }

  const clearFilters = () => {
    setDistrict('')
    setMinRent('')
    setMaxRent('')
    setMinArea('')
    setMaxArea('')
    setMaxPeople('')
    setSort('newest')

    setTimeout(() => {
      searchRooms(0, 'newest')
    }, 0)
  }

  const applyPricePreset = (min: string, max: string) => {
    setMinRent(min)
    setMaxRent(max)
    setTimeout(() => {
      searchRooms(0)
    }, 0)
  }

  return (
    <div className="search-page-wrapper">
      {/* NAVIGATION BAR */}
      <nav className="search-navbar">
        <div className="nav-container">
          <a href="/search-rooms" className="brand-logo">
            <div className="logo-icon">🏠</div>
            <div className="logo-text">
              <span className="logo-itro"><span className="highlight">i</span>Tro</span>
              <span className="logo-tagline">Tìm trọ dễ dàng & uy tín</span>
            </div>
          </a>

          <div className="nav-actions">
            {token ? (
              <a href="/dashboard" className="nav-btn primary">
                Vào Dashboard ➔
              </a>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <a href="/" className="nav-btn secondary">
                  Đăng nhập
                </a>
                <a href="/register" className="nav-btn primary">
                  Đăng ký
                </a>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="search-main-content">
        <div className="content-container">
          {/* PAGE HERO HEADER */}
          <header className="page-hero">
            <div className="hero-badge">KHÁM PHÁ PHÒNG TRỌ</div>
            <h1 className="hero-title">Tìm kiếm & Thuê phòng trọ lý tưởng</h1>
            <p className="hero-subtitle">
              Hàng trăm phòng trọ, căn hộ mini khép kín, tiện nghi với giá cả minh bạch và hỗ trợ đặt lịch xem phòng trực tuyến.
            </p>
          </header>

          {/* ADVANCED FILTER CARD */}
          <section className="filter-card">
            <div className="filter-card-header">
              <div className="filter-card-title">
                <span>🔍</span> Bộ lọc tìm kiếm kết hợp
              </div>
              <div className="price-presets">
                <span className="preset-label">Khoảng giá nhanh:</span>
                <button
                  type="button"
                  className={`preset-chip ${minRent === '' && maxRent === '2' ? 'active' : ''}`}
                  onClick={() => applyPricePreset('', '2')}
                >
                  &lt; 2 triệu
                </button>
                <button
                  type="button"
                  className={`preset-chip ${minRent === '2' && maxRent === '3.5' ? 'active' : ''}`}
                  onClick={() => applyPricePreset('2', '3.5')}
                >
                  2 - 3.5 triệu
                </button>
                <button
                  type="button"
                  className={`preset-chip ${minRent === '3.5' && maxRent === '5' ? 'active' : ''}`}
                  onClick={() => applyPricePreset('3.5', '5')}
                >
                  3.5 - 5 triệu
                </button>
                <button
                  type="button"
                  className={`preset-chip ${minRent === '5' && maxRent === '' ? 'active' : ''}`}
                  onClick={() => applyPricePreset('5', '')}
                >
                  &gt; 5 triệu
                </button>
              </div>
            </div>

            <div className="filter-grid">
              {/* Quận / Huyện */}
              <div className="filter-group">
                <label className="filter-label">Quận / Huyện</label>
                <input
                  className="filter-input"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="VD: Cầu Giấy, Đống Đa, TP. Thái Nguyên..."
                />
              </div>

              {/* Giá tối thiểu */}
              <div className="filter-group">
                <label className="filter-label">Giá tối thiểu (Triệu/tháng)</label>
                <input
                  className="filter-input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={minRent}
                  onChange={(e) => setMinRent(e.target.value)}
                  placeholder="VD: 2.0"
                />
              </div>

              {/* Giá tối đa */}
              <div className="filter-group">
                <label className="filter-label">Giá tối đa (Triệu/tháng)</label>
                <input
                  className="filter-input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={maxRent}
                  onChange={(e) => setMaxRent(e.target.value)}
                  placeholder="VD: 5.0"
                />
              </div>

              {/* Diện tích tối thiểu */}
              <div className="filter-group">
                <label className="filter-label">Diện tích từ (m²)</label>
                <input
                  className="filter-input"
                  type="number"
                  min="0"
                  value={minArea}
                  onChange={(e) => setMinArea(e.target.value)}
                  placeholder="VD: 20"
                />
              </div>

              {/* Diện tích tối đa */}
              <div className="filter-group">
                <label className="filter-label">Diện tích đến (m²)</label>
                <input
                  className="filter-input"
                  type="number"
                  min="0"
                  value={maxArea}
                  onChange={(e) => setMaxArea(e.target.value)}
                  placeholder="VD: 45"
                />
              </div>

              {/* Số người ở tối đa */}
              <div className="filter-group">
                <label className="filter-label">Số người ở</label>
                <select
                  className="filter-input"
                  value={maxPeople}
                  onChange={(e) => setMaxPeople(e.target.value)}
                >
                  <option value="">Tất cả sức chứa</option>
                  <option value="1">1 người</option>
                  <option value="2">2 người</option>
                  <option value="3">3 người</option>
                  <option value="4">4+ người</option>
                </select>
              </div>

              {/* Sắp xếp */}
              <div className="filter-group">
                <label className="filter-label">Sắp xếp theo</label>
                <select
                  className="filter-input"
                  value={sort}
                  onChange={(e) => {
                    const newSort = e.target.value
                    setSort(newSort)
                    searchRooms(0, newSort)
                  }}
                >
                  <option value="newest">🕒 Tin mới nhất trước</option>
                  <option value="price_asc">💵 Giá: Thấp đến Cao</option>
                  <option value="price_desc">💎 Giá: Cao đến Thấp</option>
                </select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="filter-actions-bar">
              <button
                type="button"
                className="btn-filter-search"
                onClick={() => searchRooms(0)}
              >
                🔎 Tìm kiếm ngay
              </button>

              <button
                type="button"
                className="btn-filter-clear"
                onClick={clearFilters}
              >
                🔄 Xóa bộ lọc
              </button>
            </div>
          </section>

          {/* RESULTS CONTROLS BAR */}
          <div className="results-control-bar">
            <div className="results-count">
              {loading ? (
                <span>Đang tìm phòng trọ...</span>
              ) : result ? (
                <span>
                  Tìm thấy <strong className="count-num">{result.totalElements}</strong> phòng phù hợp
                </span>
              ) : null}
            </div>

            {/* View Mode Toggle: Grid or List */}
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Xem dạng lưới"
              >
                🔲 Lưới
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Xem dạng danh sách"
              >
                📋 Danh sách
              </button>
            </div>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="error-box">
              ⚠️ {error}
            </div>
          )}

          {/* LOADING STATE */}
          {loading && (
            <div className="loading-box">
              <div className="loading-spinner"></div>
              <p>Đang tìm kiếm phòng trọ tốt nhất cho bạn...</p>
            </div>
          )}

          {/* EMPTY STATE */}
          {!loading && !error && result && result.content.length === 0 && (
            <section className="empty-state-card">
              <div className="empty-illustration">🏚️</div>
              <h2 className="empty-title">Không tìm thấy phòng phù hợp</h2>
              <p className="empty-desc">
                Rất tiếc, hiện tại không có phòng nào khớp với các tiêu chí tìm kiếm của bạn. Hãy thử nới rộng khoảng giá hoặc điều chỉnh diện tích để xem nhiều phòng hơn.
              </p>
              <div className="empty-actions">
                <button
                  type="button"
                  className="btn-expand-price"
                  onClick={() => {
                    setMinRent('')
                    setMaxRent('')
                    setMinArea('')
                    setMaxArea('')
                    searchRooms(0)
                  }}
                >
                  🎯 Nới rộng khoảng giá & diện tích
                </button>
                <button
                  type="button"
                  className="btn-reset-all"
                  onClick={clearFilters}
                >
                  🔄 Đặt lại tất cả bộ lọc
                </button>
              </div>
            </section>
          )}

          {/* LISTINGS DISPLAY (GRID OR LIST) */}
          {!loading && !error && result && result.content.length > 0 && (
            <>
              <div className={`listings-container ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
                {result.content.map((item) => (
                  <article key={item.id} className="room-card">
                    <div className="card-thumb-area">
                      <div className="thumb-placeholder">
                        <span>🏠</span>
                      </div>
                      <div className="card-room-badge">Phòng {item.roomCode}</div>
                      <div className="card-floor-badge">Tầng {item.floor}</div>
                    </div>

                    <div className="card-body">
                      <h3 className="card-title">
                        <a href={`/listing/${item.id}`}>{item.title}</a>
                      </h3>

                      <div className="card-location">
                        📍 <strong>{item.buildingName}</strong> · {item.district || item.address}
                      </div>

                      <div className="card-specs">
                        <span className="spec-tag">📐 {item.area} m²</span>
                        <span className="spec-tag">👥 Tối đa {item.maxPeople} người</span>
                      </div>

                      <p className="card-desc">
                        {item.description ? item.description.slice(0, 110) + '...' : 'Phòng đẹp đầy đủ tiện nghi, an ninh tốt, vệ sinh khép kín.'}
                      </p>

                      <div className="card-footer">
                        <div className="card-price-box">
                          <span className="price-label">Giá thuê:</span>
                          <span className="price-value">{formatMoney(item.rent)}</span>
                          <span className="price-unit">/tháng</span>
                        </div>

                        <a href={`/listing/${item.id}`} className="btn-view-detail">
                          Xem chi tiết ➔
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* PAGINATION */}
              {result.totalPages > 1 && (
                <div className="pagination-bar">
                  <button
                    type="button"
                    disabled={result.first}
                    onClick={() => searchRooms(page - 1)}
                    className="page-nav-btn"
                  >
                    ← Trang trước
                  </button>

                  <div className="page-info">
                    Trang <strong>{result.page + 1}</strong> / <strong>{result.totalPages}</strong> ({result.totalElements} tin)
                  </div>

                  <button
                    type="button"
                    disabled={result.last}
                    onClick={() => searchRooms(page + 1)}
                    className="page-nav-btn"
                  >
                    Trang sau →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="search-footer">
        <div className="footer-inner">
          <p>© 2026 ITRO · Nền tảng quản lý & đăng tin thuê phòng trọ thông minh</p>
        </div>
      </footer>

      {/* STYLES */}
      <style>{`
        .search-page-wrapper {
          min-height: 100vh;
          background-color: #f8fafc;
          font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1e293b;
          display: flex;
          flex-direction: column;
        }

        .search-navbar {
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
          gap: 12px;
          text-decoration: none;
        }

        .logo-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #eb6b40, #f97316);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 20px;
          box-shadow: 0 4px 10px rgba(235, 107, 64, 0.28);
        }

        .logo-text {
          display: flex;
          flex-direction: column;
        }

        .logo-itro {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
        }

        .logo-itro .highlight {
          color: #eb6b40;
        }

        .logo-tagline {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
        }

        .nav-btn {
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
        }

        .nav-btn.primary {
          background: #eb6b40;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(235, 107, 64, 0.25);
        }

        .nav-btn.primary:hover {
          background: #dc592e;
          transform: translateY(-1px);
        }

        .nav-btn.secondary {
          background: #f1f5f9;
          color: #334155;
        }

        .nav-btn.secondary:hover {
          background: #e2e8f0;
        }

        .search-main-content {
          flex: 1;
          padding: 32px 20px;
        }

        .content-container {
          max-width: 1280px;
          margin: 0 auto;
        }

        .page-hero {
          text-align: center;
          margin-bottom: 28px;
        }

        .hero-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #ffedd5;
          color: #c2410c;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }

        .hero-title {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 10px 0;
          letter-spacing: -0.5px;
        }

        .hero-subtitle {
          font-size: 15px;
          color: #64748b;
          max-width: 680px;
          margin: 0 auto;
          line-height: 1.5;
        }

        .filter-card {
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          padding: 24px;
          margin-bottom: 28px;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
        }

        .filter-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .filter-card-title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .price-presets {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .preset-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
        }

        .preset-chip {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .preset-chip:hover {
          border-color: #eb6b40;
          color: #eb6b40;
          background: #fff7ed;
        }

        .preset-chip.active {
          background: #eb6b40;
          color: #fff;
          border-color: #eb6b40;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-label {
          font-size: 12.5px;
          font-weight: 700;
          color: #475569;
        }

        .filter-input {
          padding: 10px 12px;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          font-size: 13.5px;
          color: #1e293b;
          outline: none;
          background: #ffffff;
          transition: border-color 0.2s;
        }

        .filter-input:focus {
          border-color: #eb6b40;
          box-shadow: 0 0 0 3px rgba(235, 107, 64, 0.12);
        }

        .filter-actions-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
        }

        .btn-filter-search {
          padding: 11px 24px;
          background: #eb6b40;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(235, 107, 64, 0.28);
          transition: all 0.2s;
        }

        .btn-filter-search:hover {
          background: #dc592e;
          transform: translateY(-1px);
        }

        .btn-filter-clear {
          padding: 11px 18px;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-filter-clear:hover {
          background: #e2e8f0;
        }

        .results-control-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .results-count {
          font-size: 15px;
          color: #475569;
        }

        .count-num {
          color: #eb6b40;
          font-weight: 800;
        }

        .view-mode-toggle {
          display: flex;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 2px;
        }

        .view-btn {
          padding: 6px 12px;
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          border-radius: 6px;
          cursor: pointer;
        }

        .view-btn.active {
          background: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
        }

        /* GRID VIEW & LIST VIEW */
        .listings-container.grid-view {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 22px;
        }

        .listings-container.list-view {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .room-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
        }

        .listings-container.list-view .room-card {
          flex-direction: row;
        }

        .room-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }

        .card-thumb-area {
          height: 180px;
          background: linear-gradient(135deg, #1e293b, #334155);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .listings-container.list-view .card-thumb-area {
          width: 240px;
          height: auto;
        }

        .thumb-placeholder {
          font-size: 48px;
          opacity: 0.8;
        }

        .card-room-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background: #eb6b40;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }

        .card-floor-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(15, 23, 42, 0.75);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .card-body {
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .card-title {
          margin: 0 0 8px 0;
          font-size: 16.5px;
          font-weight: 800;
          line-height: 1.35;
        }

        .card-title a {
          color: #0f172a;
          text-decoration: none;
          transition: color 0.2s;
        }

        .card-title a:hover {
          color: #eb6b40;
        }

        .card-location {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 12px;
        }

        .card-specs {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .spec-tag {
          background: #f1f5f9;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 9px;
          border-radius: 6px;
        }

        .card-desc {
          font-size: 13.5px;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 16px 0;
          flex: 1;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 14px;
          border-top: 1px solid #f1f5f9;
        }

        .card-price-box {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .price-label {
          font-size: 12px;
          color: #64748b;
        }

        .price-value {
          font-size: 18px;
          font-weight: 800;
          color: #eb6b40;
        }

        .price-unit {
          font-size: 12px;
          color: #64748b;
        }

        .btn-view-detail {
          padding: 8px 16px;
          background: #eff6ff;
          color: #2563eb;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
        }

        .btn-view-detail:hover {
          background: #2563eb;
          color: #ffffff;
        }

        /* EMPTY STATE */
        .empty-state-card {
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          padding: 60px 24px;
          text-align: center;
          margin-top: 20px;
        }

        .empty-illustration {
          font-size: 56px;
          margin-bottom: 16px;
        }

        .empty-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 10px 0;
        }

        .empty-desc {
          font-size: 14.5px;
          color: #64748b;
          max-width: 500px;
          margin: 0 auto 24px auto;
          line-height: 1.6;
        }

        .empty-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-expand-price {
          padding: 11px 22px;
          background: #eb6b40;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-reset-all {
          padding: 11px 20px;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        /* PAGINATION */
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 36px;
        }

        .page-nav-btn {
          padding: 9px 18px;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s;
        }

        .page-nav-btn:hover:not(:disabled) {
          border-color: #eb6b40;
          color: #eb6b40;
        }

        .page-nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-info {
          font-size: 14px;
          color: #64748b;
        }

        .loading-box {
          text-align: center;
          padding: 60px 20px;
        }

        .loading-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #e2e8f0;
          border-top-color: #eb6b40;
          border-radius: 50%;
          margin: 0 auto 16px auto;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .search-footer {
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          padding: 24px 20px;
          text-align: center;
          margin-top: 40px;
          font-size: 13px;
          color: #94a3b8;
        }

        /* RESPONSIVE STYLES (DOWN TO 360PX) */
        @media (max-width: 768px) {
          .listings-container.list-view .room-card {
            flex-direction: column;
          }

          .listings-container.list-view .card-thumb-area {
            width: 100%;
            height: 160px;
          }

          .hero-title {
            font-size: 24px;
          }
        }

        @media (max-width: 480px) {
          .filter-card {
            padding: 16px;
          }

          .filter-actions-bar {
            flex-direction: column;
          }

          .btn-filter-search, .btn-filter-clear {
            width: 100%;
          }

          .card-footer {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .btn-view-detail {
            width: 100%;
            text-align: center;
          }
        }

        @media (max-width: 360px) {
          .search-main-content {
            padding: 16px 10px;
          }

          .nav-container {
            padding: 10px 14px;
          }

          .logo-itro {
            font-size: 17px;
          }

          .hero-title {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  )
}

export default SearchRooms