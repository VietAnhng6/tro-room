import { useEffect, useState } from 'react'

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


const money = (value: number) =>
  `${new Intl.NumberFormat('vi-VN').format(value)} đ`


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
  const [listing, setListing] = useState<ListingDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

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
  errorTitle: {
    marginTop: 0,
  },
}

export default ListingDetail
