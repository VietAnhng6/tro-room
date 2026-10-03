import { useEffect, useState } from 'react'

type ListingDetail = {
  id: number
  title: string
  description: string
  status: string
  expiresAt: string
  room: {
    id: number
    code: string
    floor: number
    area: number
    rent: number
    maxPeople: number
  }
  building: {
    id: number
    name: string
    address: string
  }
}

const API = 'http://localhost:8080'

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ'
}

function formatDate(value: string): string {
  if (!value) return ''

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()

  return `${dd}/${mm}/${yyyy}`
}

function ListingDetail() {
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [type, setType] = useState<'VIEW' | 'RENT_NOW'>('VIEW')
  const [desiredDate, setDesiredDate] = useState('')
  const [peopleCount, setPeopleCount] = useState('1')
  const [message, setMessage] = useState('')

  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState('')

  const listingId = new URLSearchParams(
    window.location.search
  ).get('id')

  useEffect(() => {
    const loadListing = async () => {
      const accessToken = localStorage.getItem('accessToken')

      if (!accessToken) {
        window.location.href = '/'
        return
      }

      if (!listingId) {
        setError('Thiếu mã tin đăng.')
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`${API}/api/listings/${listingId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (res.status === 401) {
          localStorage.clear()
          window.location.href = '/'
          return
        }

        if (!res.ok) {
          throw new Error('Không thể tải tin đăng.')
        }

        const data: ListingDetail = await res.json()
        setListing(data)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải tin đăng.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadListing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSendRequest() {
    setError('')
    setSuccess('')

    const accessToken = localStorage.getItem('accessToken')

    if (!accessToken) {
      window.location.href = '/'
      return
    }

    if (!desiredDate) {
      setError('Vui lòng chọn ngày mong muốn.')
      return
    }

    if (!listingId) {
      setError('Thiếu mã tin đăng.')
      return
    }

    setSending(true)

    try {
      const res = await fetch(`${API}/api/rental-requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId: Number(listingId),
          type,
          desiredDate,
          peopleCount: Number(peopleCount),
          message,
        }),
      })

      if (res.status === 401) {
        localStorage.clear()
        window.location.href = '/'
        return
      }

      const text = await res.text()

      let data: { message?: string; code?: string } = {}

      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        // Response không phải JSON
      }

      if (!res.ok) {
        throw new Error(
          data.message || 'Không thể gửi yêu cầu.'
        )
      }

      setSuccess(
        `Gửi yêu cầu thành công. Mã yêu cầu: ${data.code}`
      )
      setMessage('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể gửi yêu cầu.'
      )
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>Đang tải tin đăng...</div>
      </div>
    )
  }

  if (error && !listing) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>{error}</div>
      </div>
    )
  }

  if (!listing) {
    return null
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* HEADER */}
        <div style={styles.topRow}>
          <div>
            <div style={styles.logo}>TR</div>

            <h1 style={styles.title}>{listing.title}</h1>

            <p style={styles.subtitle}>
              {listing.building.name} · {listing.building.address}
            </p>
          </div>

          <button
            onClick={() => {
              window.location.href = '/my-requests'
            }}
            style={styles.backTop}
          >
            ← Yêu cầu của tôi
          </button>
        </div>

        {/* THÔNG TIN PHÒNG */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Thông tin phòng</h2>

          <div style={styles.grid}>
            <Info label="Mã phòng" value={`Phòng ${listing.room.code}`} />
            <Info label="Diện tích" value={`${listing.room.area} m²`} />
            <Info
              label="Giá thuê"
              value={formatMoney(listing.room.rent) + '/tháng'}
            />
            <Info
              label="Số người tối đa"
              value={`${listing.room.maxPeople} người`}
            />
            <Info
              label="Hết hạn tin"
              value={formatDate(listing.expiresAt)}
            />
          </div>
        </div>

        {/* MÔ TẢ */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Mô tả</h2>
          <p style={styles.description}>
            {listing.description || 'Không có mô tả thêm.'}
          </p>
        </div>

        {/* GỬI YÊU CẦU */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Gửi yêu cầu thuê</h2>

          {success && <div style={styles.success}>✓ {success}</div>}
          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label}>Loại yêu cầu</label>
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as 'VIEW' | 'RENT_NOW')
            }
            style={styles.input}
          >
            <option value="VIEW">Xem phòng</option>
            <option value="RENT_NOW">Thuê ngay</option>
          </select>

          <label style={styles.label}>Ngày mong muốn</label>
          <input
            type="date"
            value={desiredDate}
            onChange={(e) => setDesiredDate(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Số người dự kiến ở</label>
          <input
            type="number"
            min="1"
            max={listing.room.maxPeople}
            value={peopleCount}
            onChange={(e) => setPeopleCount(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Lời nhắn</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Ví dụ: Muốn hẹn xem phòng vào cuối tuần"
            style={{ ...styles.input, height: 'auto', padding: 12 }}
          />

          <button
            onClick={handleSendRequest}
            disabled={sending}
            style={{
              ...styles.button,
              opacity: sending ? 0.7 : 1,
              cursor: sending ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue}>{value}</div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #eff6ff, #f8fafc, #eef2ff)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '40px 20px',
    boxSizing: 'border-box',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },

  loadingCard: {
    marginTop: 80,
    padding: 30,
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 15px 40px rgba(15,23,42,.08)',
    color: '#64748b',
  },

  card: {
    width: '100%',
    maxWidth: 720,
    background: '#fff',
    borderRadius: 22,
    padding: 34,
    boxShadow: '0 20px 60px rgba(15,23,42,.10)',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box',
  },

  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    marginBottom: 24,
  },

  logo: {
    width: 50,
    height: 50,
    borderRadius: 14,
    background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 19,
    marginBottom: 14,
  },

  title: {
    margin: 0,
    fontSize: 24,
    color: '#0f172a',
    lineHeight: 1.35,
  },

  subtitle: {
    margin: '7px 0 0',
    color: '#64748b',
    fontSize: 14,
  },

  backTop: {
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#475569',
    borderRadius: 9,
    padding: '9px 13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  section: {
    padding: 22,
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    marginBottom: 18,
    background: '#fbfdff',
  },

  sectionTitle: {
    margin: '0 0 16px',
    fontSize: 17,
    color: '#172033',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 15,
  },

  infoLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 5,
  },

  infoValue: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: 700,
  },

  description: {
    margin: 0,
    color: '#334155',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },

  label: {
    display: 'block',
    margin: '13px 0 7px',
    fontWeight: 650,
    color: '#334155',
    fontSize: 13,
  },

  input: {
    width: '100%',
    height: 46,
    padding: '0 13px',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },

  button: {
    width: '100%',
    marginTop: 20,
    padding: 14,
    border: 0,
    borderRadius: 11,
    background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    boxShadow: '0 8px 20px rgba(37,99,235,.20)',
  },

  success: {
    background: '#ecfdf5',
    color: '#047857',
    border: '1px solid #a7f3d0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 13,
  },

  error: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 13,
  },
}

export default ListingDetail
