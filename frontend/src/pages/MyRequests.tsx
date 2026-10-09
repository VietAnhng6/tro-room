import { useEffect, useState } from 'react'

type RequestStatus =
  | 'OPEN'
  | 'SCHEDULED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED'

type RequestType = 'VIEWING' | 'RENT_NOW'

type RentalRequest = {
  id: number
  code: string
  listingId: number
  listingTitle: string
  roomId: number
  roomCode: string
  buildingName: string
  type: RequestType
  desiredDate: string
  peopleCount: number
  message: string
  status: RequestStatus
  appointmentAt: string | null
  rejectReason: string | null
  createdAt: string
}

const API = 'http://localhost:8080'

const statusLabel: Record<RequestStatus, string> = {
  OPEN: 'Mới',
  SCHEDULED: 'Đã hẹn lịch',
  ACCEPTED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã huỷ',
  COMPLETED: 'Đã xong',
}

const statusColor: Record<
  RequestStatus,
  { bg: string; color: string }
> = {
  OPEN: { bg: '#eff6ff', color: '#1d4ed8' },
  SCHEDULED: { bg: '#fef3c7', color: '#92400e' },
  ACCEPTED: { bg: '#dcfce7', color: '#166534' },
  REJECTED: { bg: '#fef2f2', color: '#b91c1c' },
  CANCELLED: { bg: '#f1f5f9', color: '#475569' },
  COMPLETED: { bg: '#e0e7ff', color: '#4338ca' },
}

const typeLabel: Record<RequestType, string> = {
  VIEWING: 'Xem phòng',
  RENT_NOW: 'Thuê ngay',
}

function formatDateTime(value: string | null): string {
  if (!value) return ''

  const normalized = value.includes('T')
    ? value
    : value.replace(' ', 'T')

  const date = new Date(normalized)

  if (Number.isNaN(date.getTime())) return value

  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')

  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
}

function MyRequests() {
  const [requests, setRequests] = useState<RentalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  const token = localStorage.getItem('accessToken')

  async function loadRequests() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API}/api/rental-requests/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.status === 401) {
        localStorage.clear()
        window.location.href = '/'
        return
      }

      if (res.status === 403) {
        window.location.href = '/403'
        return
      }

      if (!res.ok) {
        throw new Error('Không thể tải danh sách yêu cầu.')
      }

      const data: RentalRequest[] = await res.json()
      setRequests(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách yêu cầu.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cancelRequest(request: RentalRequest) {
    if (
      !window.confirm(
        `Bạn có chắc muốn huỷ yêu cầu ${request.code}? Huỷ rồi sẽ không khôi phục được.`
      )
    ) {
      return
    }

    setCancellingId(request.id)

    try {
      const res = await fetch(
        `${API}/api/rental-requests/${request.id}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (res.status === 401) {
        localStorage.clear()
        window.location.href = '/'
        return
      }

      if (!res.ok) {
        const text = await res.text()

        let message = 'Không thể huỷ yêu cầu.'

        try {
          const data = JSON.parse(text)
          message = data.message || message
        } catch {
          // Response không phải JSON
        }

        throw new Error(message)
      }

      await loadRequests()
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Không thể huỷ yêu cầu.'
      )
    } finally {
      setCancellingId(null)
    }
  }

  const canCancel = (status: RequestStatus) =>
    status === 'OPEN' || status === 'SCHEDULED'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        padding: 28,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
            marginBottom: 26,
          }}
        >
          <div>
            <div
              style={{
                color: '#64748b',
                fontSize: 14,
                marginBottom: 6,
              }}
            >
              TroRoom / Khách thuê
            </div>

            <h1
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: 30,
                fontWeight: 800,
              }}
            >
              Yêu cầu của tôi
            </h1>

            <p
              style={{
                margin: '7px 0 0',
                color: '#64748b',
              }}
            >
              Theo dõi trạng thái các yêu cầu thuê đã gửi.
            </p>
          </div>

          <button
            onClick={() => {
              window.location.href = '/dashboard'
            }}
            style={{
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#475569',
              borderRadius: 9,
              padding: '9px 13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            ← Dashboard
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: 12,
              padding: 15,
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        {/* TABLE */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 4px 14px rgba(15,23,42,.04)',
          }}
        >
          {loading ? (
            <div
              style={{
                padding: 50,
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              Đang tải danh sách yêu cầu...
            </div>
          ) : requests.length === 0 ? (
            <div
              style={{
                padding: 60,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 42,
                  marginBottom: 12,
                }}
              >
                📋
              </div>

              <div
                style={{
                  color: '#0f172a',
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Chưa có yêu cầu nào
              </div>

              <div
                style={{
                  color: '#64748b',
                  fontSize: 14,
                }}
              >
                Khi bạn gửi yêu cầu thuê, trạng thái sẽ hiển thị ở đây.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 980,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    {[
                      'Mã yêu cầu',
                      'Phòng',
                      'Loại',
                      'Ngày gửi',
                      'Trạng thái',
                      'Lịch hẹn',
                      'Lý do từ chối',
                      'Thao tác',
                    ].map((header) => (
                      <th
                        key={header}
                        style={{
                          textAlign: 'left',
                          padding: '15px 16px',
                          color: '#64748b',
                          fontSize: 13,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {requests.map((request) => {
                    const status = statusColor[request.status]

                    return (
                      <tr
                        key={request.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <td
                          style={{
                            padding: '16px',
                            fontWeight: 800,
                            color: '#0f172a',
                          }}
                        >
                          {request.code}
                        </td>

                        <td style={{ padding: '16px' }}>
                          <div
                            style={{
                              color: '#334155',
                              fontWeight: 600,
                            }}
                          >
                            Phòng {request.roomCode}
                          </div>

                          <div
                            style={{
                              color: '#94a3b8',
                              fontSize: 12,
                            }}
                          >
                            {request.buildingName}
                          </div>
                        </td>

                        <td
                          style={{
                            padding: '16px',
                            color: '#334155',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {typeLabel[request.type]}
                        </td>

                        <td
                          style={{
                            padding: '16px',
                            color: '#334155',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDateTime(request.createdAt)}
                        </td>

                        <td style={{ padding: '16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              borderRadius: 999,
                              padding: '7px 11px',
                              background: status.bg,
                              color: status.color,
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {statusLabel[request.status]}
                          </span>
                        </td>

                        <td
                          style={{
                            padding: '16px',
                            color: '#334155',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDateTime(request.appointmentAt) || '—'}
                        </td>

                        <td
                          style={{
                            padding: '16px',
                            color:
                              request.status === 'REJECTED'
                                ? '#b91c1c'
                                : '#94a3b8',
                            maxWidth: 220,
                          }}
                        >
                          {request.rejectReason || '—'}
                        </td>

                        <td style={{ padding: '16px' }}>
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              flexWrap: 'nowrap',
                            }}
                          >
                            <button
                              onClick={() => {
                                window.location.href = `/listing?id=${request.listingId}`
                              }}
                              style={{
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                color: '#334155',
                                borderRadius: 9,
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Xem tin
                            </button>

                            {canCancel(request.status) && (
                              <button
                                onClick={() => cancelRequest(request)}
                                disabled={cancellingId === request.id}
                                style={{
                                  border: '1px solid #fecaca',
                                  background: '#fff',
                                  color: '#dc2626',
                                  borderRadius: 9,
                                  padding: '8px 12px',
                                  cursor:
                                    cancellingId === request.id
                                      ? 'not-allowed'
                                      : 'pointer',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  opacity:
                                    cancellingId === request.id ? 0.6 : 1,
                                }}
                              >
                                {cancellingId === request.id
                                  ? 'Đang huỷ...'
                                  : 'Huỷ'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyRequests
