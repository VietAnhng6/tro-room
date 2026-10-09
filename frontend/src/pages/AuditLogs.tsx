import { useEffect, useState } from 'react'

type AuditLog = {
  id: number
  timestamp: string
  actorId: number | null
  actorRole: string
  action: string
  objectType: string
  objectId: number | null
  beforeData: string | null
  afterData: string | null
}

const API = 'http://localhost:8080'

function formatDateTime(value: string) {
  if (!value) return '-'

  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    CREATE: 'Tạo mới',
    UPDATE: 'Cập nhật',
    DELETE: 'Xóa',
  }

  return labels[action] || action
}

function objectLabel(objectType: string) {
  const labels: Record<string, string> = {
    ROOM: 'Phòng',
    SERVICE: 'Dịch vụ',
    CONTRACT: 'Hợp đồng',
    UTILITY_READING: 'Chỉ số điện',
    INVOICE: 'Hóa đơn',
    PAYMENT: 'Thanh toán',
    BUILDING: 'Tòa nhà',
    USER: 'Tài khoản',
  }

  return labels[objectType] || objectType
}
function formatAuditData(data: string | null) {
  if (!data) return '-'

  try {
    const obj = JSON.parse(data)

    const labels: Record<string, string> = {
      id: 'Mã',
      status: 'Trạng thái',
      buildingId: 'Mã tòa nhà',
      area: 'Diện tích',
      code: 'Mã phòng',
      floor: 'Tầng',
      rent: 'Giá thuê',
      maxPeople: 'Số người tối đa',
    }

    return Object.entries(obj)
      .map(([key, value]) => {
        const label = labels[key] || key

        let displayValue = value

        if (key === 'status') {
          const statusLabels: Record<string, string> = {
            EMPTY: 'Trống',
            DEPOSITED: 'Đã đặt cọc',
            RENTED: 'Đã thuê',
            STOPPED: 'Ngừng hoạt động',
          }

          displayValue = statusLabels[String(value)] || value
        }

        if (key === 'rent' && typeof value === 'number') {
          displayValue = `${value.toLocaleString('vi-VN')} VNĐ`
        }

        if (key === 'area' && typeof value === 'number') {
          displayValue = `${value} m²`
        }

        return `${label}: ${displayValue}`
      })
      .join('\n')
  } catch {
    return data
  }
}
function roleLabel(role: string) {
  const labels: Record<string, string> = {
    ADMIN: 'Quản trị viên',
    LANDLORD: 'Chủ nhà',
    MANAGER: 'Quản lý',
    TENANT: 'Người thuê',
  }

  return labels[role] || role
}
function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [actorId, setActorId] = useState('')
  const [objectType, setObjectType] = useState('')

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams()

      if (from) params.append('from', `${from}T00:00:00`)
      if (to) params.append('to', `${to}T23:59:59`)
      if (actorId.trim()) params.append('actorId', actorId.trim())
      if (objectType) params.append('objectType', objectType)

      const query = params.toString()

      const response = await fetch(
        `${API}/api/audit-logs${query ? `?${query}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.status === 403) {
        throw new Error('Bạn không có quyền xem nhật ký hệ thống.')
      }

      if (!response.ok) {
        throw new Error('Không thể tải nhật ký hệ thống')
      }

      const data = await response.json()
      setLogs(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Có lỗi xảy ra'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const clearFilters = () => {
    setFrom('')
    setTo('')
    setActorId('')
    setObjectType('')
  }

  const applyFilters = () => {
    loadLogs()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      padding: 30,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 28,
              color: '#0f172a',
            }}>
              Nhật ký hệ thống
            </h1>

            <p style={{
              margin: '6px 0 0',
              color: '#64748b',
            }}>
              Theo dõi các thao tác đã thực hiện trong hệ thống
            </p>
          </div>

          <button
            onClick={() => {
              window.location.href = '/dashboard'
            }}
            style={{
              border: 0,
              borderRadius: 10,
              padding: '11px 18px',
              background: '#e2e8f0',
              color: '#0f172a',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← Dashboard
          </button>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
          }}>

            <div>
              <label>Từ ngày</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label>Đến ngày</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label>Actor ID</label>
              <input
                type="number"
                value={actorId}
                onChange={e => setActorId(e.target.value)}
                placeholder="Ví dụ: 12"
                style={inputStyle}
              />
            </div>

            <div>
              <label>Loại đối tượng</label>
              <select
                value={objectType}
                onChange={e => setObjectType(e.target.value)}
                style={inputStyle}
              >
                <option value="">Tất cả</option>
                <option value="ROOM">Phòng</option>
                <option value="SERVICE">Dịch vụ</option>
                <option value="CONTRACT">Hợp đồng</option>
                <option value="UTILITY_READING">Chỉ số điện</option>
                <option value="INVOICE">Hóa đơn</option>
                <option value="PAYMENT">Thanh toán</option>
                <option value="BUILDING">Tòa nhà</option>
                <option value="USER">Tài khoản</option>
              </select>
            </div>

          </div>

          <div style={{
            display: 'flex',
            gap: 10,
            marginTop: 16,
          }}>
            <button onClick={applyFilters} style={primaryButton}>
              Lọc
            </button>

            <button onClick={clearFilters} style={secondaryButton}>
              Xóa bộ lọc
            </button>
          </div>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          overflow: 'hidden',
        }}>

          {loading ? (
            <div style={emptyStyle}>
              Đang tải nhật ký...
            </div>
          ) : error ? (
            <div style={{
              padding: 30,
              color: '#dc2626',
              textAlign: 'center',
            }}>
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div style={emptyStyle}>
              Không có nhật ký nào.
            </div>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={thStyle}>STT</th>
                  <th style={thStyle}>Thời gian</th>
                  <th style={thStyle}>Actor</th>
                  <th style={thStyle}>Vai trò</th>
                  <th style={thStyle}>Thao tác</th>
                  <th style={thStyle}>Đối tượng</th>
                  <th style={thStyle}>Chi tiết</th>
                </tr>
              </thead>

              <tbody>
  {logs.map((log, index) => (
    <tr key={log.id}>
      {/* STT */}
      <td style={tdStyle}>
        {index + 1}
      </td>

      {/* Thời gian */}
      <td style={tdStyle}>
        {formatDateTime(log.timestamp)}
      </td>

      {/* Actor */}
      <td style={tdStyle}>
        {log.actorId ?? '-'}
      </td>

      {/* Vai trò */}
      <td style={tdStyle}>
      {roleLabel(log.actorRole)}
      </td>

      {/* Thao tác */}
      <td style={tdStyle}>
        {actionLabel(log.action)}
      </td>

      {/* Đối tượng */}
      <td style={tdStyle}>
        {objectLabel(log.objectType)}
      </td>

      {/* Chi tiết */}
      <td style={tdStyle}>
        <details>
          <summary
            style={{
              cursor: 'pointer',
              color: '#2563eb',
              fontWeight: 600,
            }}
          >
            Xem
          </summary>

          <div style={{ marginTop: 10 }}>
  <strong>Dữ liệu trước:</strong>
  <pre style={preStyle}>
  {formatAuditData(log.beforeData)}
  </pre>

  <strong>Dữ liệu sau:</strong>

  <pre style={preStyle}>
  {formatAuditData(log.afterData)}
  </pre>
  </div>
        </details>
      </td>
    </tr>
  ))}
</tbody>  
            </table>
          )}

        </div>

      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 6,
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: 9,
  outline: 'none',
}

const primaryButton: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  padding: '10px 18px',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
}

const secondaryButton: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  padding: '10px 18px',
  background: '#e2e8f0',
  color: '#0f172a',
  fontWeight: 700,
  cursor: 'pointer',
}

const emptyStyle: React.CSSProperties = {
  padding: 40,
  textAlign: 'center',
  color: '#64748b',
}

const thStyle: React.CSSProperties = {
  padding: '13px 14px',
  textAlign: 'center',
  fontSize: 13,
  fontWeight: 750,
  color: '#475569',
  borderBottom: '1px solid #e2e8f0',
}

const tdStyle: React.CSSProperties = {
  padding: '13px 14px',
  borderBottom: '1px solid #f1f5f9',
  fontSize: 14,
  color: '#334155',
  textAlign: 'center',
  verticalAlign: 'middle',
}

const preStyle: React.CSSProperties = {
  background: '#f8fafc',
  padding: 10,
  borderRadius: 8,
  overflowX: 'auto',
  fontSize: 12,
}

export default AuditLogs