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
      return `Theo ${unit || 'đơn vị sử dụng'}`
    case 'BY_PERSON':
      return `Theo ${unit || 'người'}`
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
  const [requestType, setRequestType] = useState<'VIEWING' | 'RENT_NOW'>('VIEWING')
  const [desiredDate, setDesiredDate] = useState('')
  const [expectedPeople, setExpectedPeople] = useState('1')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

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
          throw new Error(data.message || 'Tin đăng không còn hiển thị')
        }
        setListing(data as ListingDetailData)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setLoadError(error instanceof Error ? error.message : 'Không thể tải tin đăng')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [listingId])

  const submitRequest = async () => {
    setNotice(null)

    const token = localStorage.getItem('accessToken')
    const role = localStorage.getItem('role')

    if (!token) {
      setNotice({
        type: 'info',
        text: 'Vui lòng đăng nhập tài khoản Khách thuê để gửi yêu cầu.',
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
        },
      )

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setNotice({
          type: 'success',
          text: 'Yêu cầu đã được gửi thành công.',
          requestCode: data.requestCode,
        })
        setDesiredDate('')
        setMessage('')
        return
      }

      setNotice({
        type: response.status === 409 ? 'error' : 'error',
        text: data.message || 'Không thể gửi yêu cầu. Vui lòng kiểm tra lại thông tin.',
      })
    } catch {
      setNotice({
        type: 'error',
        text: 'Không thể kết nối máy chủ. Hãy kiểm tra Backend đang chạy.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div style={styles.center}>Đang tải chi tiết tin đăng...</div>
  }

  if (loadError || !listing) {
    return (
      <div style={styles.page}>
        <main style={styles.narrowContainer}>
          <section style={styles.card}>
            <h1 style={styles.errorTitle}>Không thể mở tin đăng</h1>
            <p style={styles.muted}>{loadError || 'Tin đăng không còn hiển thị.'}</p>
            <button style={styles.secondaryButton} onClick={() => (window.location.href = '/search-rooms')}>
              ← Quay lại tìm phòng
            </button>
          </section>
        </main>
      </div>
    )
  }

  const services = listing.services || []
  const images = listing.images || []

  return (
    <div style={styles.page}>
      <main style={styles.container}>
        <button style={styles.backButton} onClick={() => (window.location.href = '/search-rooms')}>
          ← Quay lại tìm phòng
        </button>

        <section style={styles.card}>
          <div style={styles.headerRow}>
            <div>
              <div style={styles.publicBadge}>ĐANG HIỂN THỊ</div>
              <h1 style={styles.title}>{listing.title}</h1>
              <p style={styles.muted}>
                {listing.buildingName} · {listing.district || 'Chưa cập nhật quận'} · {listing.address}
              </p>
            </div>
            <div style={styles.roomCode}>Phòng {listing.roomCode}</div>
          </div>

          <div style={styles.imageGrid}>
            {images.length > 0 ? (
              images.map((image) => (
                <img
                  key={image.id}
                  src={`${API}${image.imageUrl}`}
                  alt={`${listing.title} - ảnh ${image.sortOrder + 1}`}
                  style={styles.image}
                />
              ))
            ) : (
              <div style={styles.placeholder}>Chưa có ảnh phòng</div>
            )}
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoBox}>
              <span>Giá thuê</span>
              <strong>{money(listing.rent)} / tháng</strong>
            </div>
            <div style={styles.infoBox}>
              <span>Diện tích</span>
              <strong>{listing.area} m²</strong>
            </div>
            <div style={styles.infoBox}>
              <span>Số người tối đa</span>
              <strong>{listing.maxPeople} người</strong>
            </div>
            <div style={styles.infoBox}>
              <span>Tiền cọc dự kiến</span>
              <strong>{money(listing.estimatedDeposit)}</strong>
            </div>
          </div>

          <h2 style={styles.sectionTitle}>Mô tả phòng</h2>
          <p style={styles.description}>{listing.description || 'Chưa có mô tả cho tin đăng này.'}</p>

          <h2 style={styles.sectionTitle}>Dịch vụ và chi phí</h2>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Dịch vụ</th>
                  <th style={styles.th}>Cách tính</th>
                  <th style={styles.th}>Đơn giá</th>
                </tr>
              </thead>
              <tbody>
                {services.length > 0 ? (
                  services.map((service) => (
                    <tr key={service.id}>
                      <td style={styles.td}>{service.name}</td>
                      <td style={styles.td}>{methodLabel(service.calculationMethod, service.unit)}</td>
                      <td style={styles.td}>{money(service.price)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={styles.td} colSpan={3}>Chưa có dịch vụ được cấu hình.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.costSummary}>
            <div>
              <div style={styles.costLabel}>Chi phí cố định hàng tháng</div>
              <strong>{money(listing.estimatedFixedMonthlyCost)}</strong>
            </div>
            <div>
              <div style={styles.costLabel}>Ước tính tổng tháng đầu</div>
              <strong>{money(listing.estimatedFirstMonthCost)}</strong>
            </div>
          </div>
          <p style={styles.disclaimer}>
            Ước tính tháng đầu = tiền phòng + các khoản phí cố định. Chưa bao gồm tiền điện/nước theo thực tế sử dụng.
          </p>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Gửi yêu cầu</h2>
              <p style={styles.muted}>Bạn cần đăng nhập tài khoản Khách thuê để gửi yêu cầu.</p>
            </div>
          </div>

          <div style={styles.formGrid}>
            <label style={styles.field}>
              <span style={styles.label}>Loại yêu cầu</span>
              <select
                style={styles.input}
                value={requestType}
                onChange={(event) => setRequestType(event.target.value as 'VIEWING' | 'RENT_NOW')}
              >
                <option value="VIEWING">Xem phòng</option>
                <option value="RENT_NOW">Thuê ngay</option>
              </select>
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Ngày mong muốn</span>
              <input
                style={styles.input}
                type="date"
                min={today}
                max={maxDate}
                value={desiredDate}
                onChange={(event) => setDesiredDate(event.target.value)}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Số người dự kiến ở</span>
              <input
                style={styles.input}
                type="number"
                min={1}
                max={listing.maxPeople}
                value={expectedPeople}
                onChange={(event) => setExpectedPeople(event.target.value)}
                aria-describedby="people-limit"
              />
              <small id="people-limit" style={styles.helper}>
                Tối đa {listing.maxPeople} người theo giới hạn phòng.
              </small>
            </label>
          </div>

          <label style={styles.field}>
            <span style={styles.label}>Lời nhắn</span>
            <textarea
              style={styles.textarea}
              rows={5}
              maxLength={1000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ví dụ: Tôi muốn xem phòng vào buổi chiều..."
            />
            <small style={styles.helper}>{message.length}/1000 ký tự</small>
          </label>

          <button
            style={{ ...styles.submitButton, opacity: submitting ? 0.7 : 1 }}
            onClick={submitRequest}
            disabled={submitting}
          >
            {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>

          {notice && (
            <div
              style={{
                ...styles.notice,
                ...(notice.type === 'success'
                  ? styles.successNotice
                  : notice.type === 'error'
                    ? styles.errorNotice
                    : styles.infoNotice),
              }}
            >
              <strong>{notice.text}</strong>
              {notice.requestCode && (
                <div style={styles.codeBox}>
                  Mã yêu cầu: <span>{notice.requestCode}</span>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f5f7fb',
    padding: '24px 12px 48px',
    fontFamily: 'Inter, Arial, sans-serif',
    color: '#172033',
  },
  container: {
    maxWidth: 1120,
    margin: '0 auto',
  },
  narrowContainer: {
    maxWidth: 720,
    margin: '0 auto',
    paddingTop: 24,
  },
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, Arial, sans-serif',
    color: '#475569',
    padding: 24,
  },
  backButton: {
    border: 0,
    background: 'transparent',
    padding: '4px 0 12px',
    fontWeight: 800,
    color: '#2563eb',
    cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid #dbe1ea',
    borderRadius: 10,
    padding: '11px 18px',
    background: '#fff',
    color: '#334155',
    fontWeight: 700,
    cursor: 'pointer',
  },
  card: {
    background: '#fff',
    borderRadius: 18,
    padding: 24,
    marginBottom: 18,
    boxShadow: '0 8px 30px rgba(15,23,42,0.07)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  publicBadge: {
    display: 'inline-block',
    padding: '5px 9px',
    borderRadius: 999,
    background: '#ecfdf3',
    color: '#166534',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.5,
  },
  title: {
    margin: '10px 0 8px',
    fontSize: 30,
    lineHeight: 1.2,
  },
  muted: {
    color: '#64748b',
    lineHeight: 1.55,
    margin: 0,
  },
  roomCode: {
    padding: '7px 10px',
    borderRadius: 8,
    background: '#eff6ff',
    color: '#2563eb',
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 10,
    margin: '20px 0',
  },
  image: {
    width: '100%',
    height: 230,
    objectFit: 'cover',
    borderRadius: 12,
    background: '#e2e8f0',
  },
  placeholder: {
    minHeight: 180,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    borderRadius: 12,
    color: '#64748b',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 10,
  },
  infoBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    padding: 13,
    borderRadius: 11,
    background: '#f8fafc',
    color: '#64748b',
    fontSize: 13,
  },
  sectionTitle: {
    margin: '24px 0 10px',
    fontSize: 20,
  },
  description: {
    margin: 0,
    color: '#334155',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },
  tableWrap: {
    width: '100%',
    overflowX: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
  },
  table: {
    width: '100%',
    minWidth: 520,
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: 12,
    background: '#f8fafc',
    color: '#475569',
    fontSize: 13,
  },
  td: {
    padding: 12,
    borderTop: '1px solid #eef2f7',
    color: '#334155',
    fontSize: 13,
  },
  costSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 12,
    marginTop: 16,
  },
  costLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  disclaimer: {
    margin: '12px 0 0',
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.6,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginTop: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: 800,
    color: '#475569',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    height: 44,
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '0 12px',
    fontSize: 14,
    background: '#fff',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: 12,
    resize: 'vertical',
    fontSize: 14,
    lineHeight: 1.5,
    fontFamily: 'inherit',
  },
  helper: {
    color: '#64748b',
    fontSize: 12,
  },
  submitButton: {
    width: '100%',
    border: 0,
    borderRadius: 10,
    padding: '13px 18px',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer',
  },
  notice: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    lineHeight: 1.55,
  },
  successNotice: {
    background: '#ecfdf3',
    color: '#166534',
  },
  errorNotice: {
    background: '#fef2f2',
    color: '#b91c1c',
  },
  infoNotice: {
    background: '#eff6ff',
    color: '#1d4ed8',
  },
  codeBox: {
    marginTop: 8,
    display: 'inline-block',
    padding: '8px 10px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.7)',
    fontWeight: 800,
  },
  errorTitle: {
    marginTop: 0,
  },
}

export default ListingDetail
