import { useEffect, useState } from 'react'

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

  const [result, setResult] = useState<SearchResponse | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        `http://localhost:8080/api/public/listings/search?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error('Không thể tải danh sách phòng')
      }

      const data: SearchResponse = await response.json()

      setResult(data)
      setPage(targetPage)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Có lỗi xảy ra khi tìm kiếm phòng'
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
    return new Intl.NumberFormat('vi-VN').format(value)
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

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Tìm phòng trọ</h1>
          <p style={styles.subtitle}>
            Tìm phòng phù hợp với nhu cầu và ngân sách của bạn
          </p>
        </header>

        <section style={styles.filterCard}>
          <div style={styles.filterGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Quận</label>
              <input
                style={styles.input}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Ví dụ: Dong Da"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Giá tối thiểu (triệu/tháng)</label>
              <input
                style={styles.input}
                type="number"
                min="0"
                value={minRent}
                onChange={(e) => setMinRent(e.target.value)}
                placeholder="2.5"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Giá tối đa (triệu/tháng)</label>
              <input
                style={styles.input}
                type="number"
                min="0"
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                placeholder="5"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Diện tích tối thiểu (m²)</label>
              <input
                style={styles.input}
                type="number"
                min="0"
                value={minArea}
                onChange={(e) => setMinArea(e.target.value)}
                placeholder="20"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Diện tích tối đa (m²)</label>
              <input
                style={styles.input}
                type="number"
                min="0"
                value={maxArea}
                onChange={(e) => setMaxArea(e.target.value)}
                placeholder="40"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Số người</label>
              <input
                style={styles.input}
                type="number"
                min="1"
                value={maxPeople}
                onChange={(e) => setMaxPeople(e.target.value)}
                placeholder="2"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Sắp xếp</label>
              <select
                style={styles.input}
                value={sort}
                onChange={(e) => {
                  const newSort = e.target.value
                  setSort(newSort)
                  searchRooms(0, newSort)
                }}
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá thấp đến cao</option>
                <option value="price_desc">Giá cao đến thấp</option>
              </select>
            </div>
          </div>

          <div style={styles.actions}>
            <button
              style={styles.searchButton}
              onClick={() => searchRooms(0)}
            >
              Tìm kiếm
            </button>

            <button
              style={styles.clearButton}
              onClick={clearFilters}
            >
              Xóa bộ lọc
            </button>
          </div>
        </section>

        {loading && (
          <div style={styles.message}>
            Đang tìm phòng...
          </div>
        )}

        {!loading && error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {!loading && !error && result && (
          <>
            <div style={styles.resultHeader}>
              <span>
                Tìm thấy <strong>{result.totalElements}</strong> phòng
              </span>
            </div>

            {result.content.length === 0 ? (
              <div style={styles.empty}>
                <h2>Không tìm thấy phòng phù hợp</h2>
                <p>
                  Hãy thử mở rộng khoảng giá hoặc diện tích để có thêm kết quả.
                </p>
              </div>
            ) : (
              <>
                <div style={styles.roomGrid}>
                  {result.content.map((room) => (
                    <article
                      key={room.id}
                      style={styles.roomCard}
                    >
                      <div style={styles.roomCode}>
                        Phòng {room.roomCode}
                      </div>

                      <h2 style={styles.roomTitle}>
                        {room.title}
                      </h2>

                      <div style={styles.price}>
                        {formatMoney(room.rent)} đ/tháng
                      </div>

                      <div style={styles.infoGrid}>
                        <div style={styles.info}>
                          Diện tích
                          <strong>{room.area} m²</strong>
                        </div>

                        <div style={styles.info}>
                          Tối đa
                          <strong>{room.maxPeople} người</strong>
                        </div>

                        <div style={styles.info}>
                          Tầng
                          <strong>{room.floor}</strong>
                        </div>

                        <div style={styles.info}>
                          Quận
                          <strong>{room.district}</strong>
                        </div>
                      </div>

                      <div style={styles.building}>
                        {room.buildingName}
                      </div>

                      <div style={styles.address}>
                        {room.address}
                      </div>
                    </article>
                  ))}
                </div>

                {result.totalPages > 1 && (
                  <div style={styles.pagination}>
                    <button
                      style={styles.pageButton}
                      disabled={result.first}
                      onClick={() => searchRooms(page - 1)}
                    >
                      ← Trước
                    </button>

                    <span>
                      Trang {result.page + 1} / {result.totalPages}
                    </span>

                    <button
                      style={styles.pageButton}
                      disabled={result.last}
                      onClick={() => searchRooms(page + 1)}
                    >
                      Sau →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f5f7fb',
    padding: '32px 20px',
    fontFamily: 'Inter, Arial, sans-serif',
    color: '#172033',
  },

  container: {
    maxWidth: 1200,
    margin: '0 auto',
  },

  header: {
    marginBottom: 24,
  },

  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 800,
  },

  subtitle: {
    color: '#64748b',
    marginTop: 8,
  },

  filterCard: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 28,
    boxShadow: '0 8px 30px rgba(15,23,42,0.07)',
  },

  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 16,
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  },

  label: {
    fontSize: 13,
    fontWeight: 700,
    color: '#475569',
  },

  input: {
    height: 44,
    border: '1px solid #dbe1ea',
    borderRadius: 9,
    padding: '0 12px',
    fontSize: 14,
    background: '#ffffff',
  },

  actions: {
    display: 'flex',
    gap: 10,
    marginTop: 20,
  },

  searchButton: {
    border: 0,
    borderRadius: 9,
    padding: '12px 24px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
  },

  clearButton: {
    border: '1px solid #dbe1ea',
    borderRadius: 9,
    padding: '12px 24px',
    background: '#ffffff',
    color: '#475569',
    fontWeight: 600,
    cursor: 'pointer',
  },

  resultHeader: {
    marginBottom: 16,
    color: '#475569',
  },

  roomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 18,
  },

  roomCard: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 20,
    border: '1px solid #edf0f5',
    boxShadow: '0 5px 20px rgba(15,23,42,0.06)',
  },

  roomCode: {
    display: 'inline-block',
    padding: '4px 9px',
    borderRadius: 7,
    background: '#eff6ff',
    color: '#2563eb',
    fontSize: 12,
    fontWeight: 700,
  },

  roomTitle: {
    fontSize: 18,
    margin: '12px 0 8px',
  },

  price: {
    fontSize: 20,
    fontWeight: 800,
    color: '#dc2626',
    marginBottom: 14,
  },

  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },

  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    background: '#f8fafc',
    borderRadius: 8,
    padding: 9,
    fontSize: 12,
    color: '#64748b',
  },

  building: {
    marginTop: 14,
    fontWeight: 700,
  },

  address: {
    marginTop: 5,
    color: '#64748b',
    fontSize: 13,
  },

  message: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 40,
    textAlign: 'center',
  },

  error: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 40,
    textAlign: 'center',
    color: '#dc2626',
  },

  empty: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 40,
    textAlign: 'center',
  },

  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 28,
  },

  pageButton: {
    border: '1px solid #dbe1ea',
    borderRadius: 9,
    background: '#ffffff',
    padding: '9px 16px',
    cursor: 'pointer',
    fontWeight: 600,
  },
}

export default SearchRooms