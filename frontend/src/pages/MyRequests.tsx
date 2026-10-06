import { useEffect, useState } from 'react'

export type RequestStatus =
  | 'OPEN'
  | 'SCHEDULED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | string

export type RequestType = 'VIEWING' | 'RENT_NOW' | string

export type RentalRequest = {
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

export type HistoryItem = {
  id: number
  changedAt: string
  actorName: string
  actorRole: string
  fromStatus: string | null
  toStatus: string
  note: string | null
  reason: string | null
}

const API = 'http://localhost:8080'

const statusLabel: Record<string, string> = {
  OPEN: 'Mới gửi',
  SCHEDULED: 'Đã hẹn lịch xem phòng',
  ACCEPTED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  CANCELLED: 'Đã huỷ',
  COMPLETED: 'Hoàn tất',
}

const statusColor: Record<string, { bg: string; color: string; border: string }> = {
  OPEN: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  SCHEDULED: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  ACCEPTED: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  REJECTED: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  CANCELLED: { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  COMPLETED: { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
}

const typeLabel: Record<string, string> = {
  VIEWING: '👁️ Xem phòng',
  RENT_NOW: '⚡ Thuê ngay',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  if (value.includes('T')) value = value.split('T')[0]
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function MyRequests() {
  const [requests, setRequests] = useState<RentalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Cancel modal state
  const [cancellingRequest, setCancellingRequest] = useState<RentalRequest | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // History timeline modal state
  const [historyReq, setHistoryReq] = useState<RentalRequest | null>(null)
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

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
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách yêu cầu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  // S2-09: Khách tự hủy yêu cầu
  async function confirmCancel() {
    if (!cancellingRequest) return

    setIsCancelling(true)
    try {
      const res = await fetch(`${API}/api/rental-requests/${cancellingRequest.id}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const text = await res.text()
        let msg = 'Không thể huỷ yêu cầu.'
        try {
          const data = JSON.parse(text)
          msg = data.message || msg
        } catch {}
        throw new Error(msg)
      }

      setSuccessMsg(`Đã huỷ thành công yêu cầu ${cancellingRequest.code}.`)
      setCancellingRequest(null)
      await loadRequests()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể huỷ yêu cầu.')
    } finally {
      setIsCancelling(false)
    }
  }

  // S2-08/S2-09: Xem lịch sử xử lý của yêu cầu
  async function openHistory(req: RentalRequest) {
    setHistoryReq(req)
    setLoadingHistory(true)
    setHistoryList([])

    try {
      const res = await fetch(`${API}/api/tenant/requests/${req.id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Không thể tải lịch sử')
      const data: HistoryItem[] = await res.json()
      setHistoryList(data)
    } catch {
      setHistoryList([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const canCancel = (status: RequestStatus) => status === 'OPEN' || status === 'SCHEDULED'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '30px 24px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
            marginBottom: 26,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ color: '#64748b', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              TroRoom / Khách thuê
            </div>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800 }}>
              Yêu cầu thuê phòng của tôi
            </h1>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
              Theo dõi tiến độ, lịch hẹn xem phòng và kết quả duyệt từ các chủ nhà.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => {
                window.location.href = '/search-rooms'
              }}
              style={{
                border: '1.5px solid #bfdbfe',
                background: '#eff6ff',
                color: '#1d4ed8',
                borderRadius: 10,
                padding: '10px 18px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13.5,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🔍</span> Tìm phòng khác
            </button>

            <button
              onClick={() => {
                window.location.href = '/dashboard'
              }}
              style={{
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#334155',
                borderRadius: 10,
                padding: '10px 18px',
                cursor: 'pointer',
                fontWeight: 650,
                fontSize: 13.5,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🏠</span> Về Tổng quan
            </button>
          </div>
        </div>

        {/* FEEDBACK MESSAGES */}
        {successMsg && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#047857',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 20,
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>✓ {successMsg}</div>
            <button
              onClick={() => setSuccessMsg('')}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#047857', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 20,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* TABLE */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
          }}
        >
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#64748b', fontSize: 15 }}>
              Đang tải danh sách yêu cầu của bạn...
            </div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '70px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div style={{ color: '#0f172a', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
                Bạn chưa gửi yêu cầu thuê phòng nào
              </div>
              <div style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
                Hãy khám phá các phòng trọ đang cho thuê trên hệ thống và gửi yêu cầu xem phòng!
              </div>
              <button
                onClick={() => {
                  window.location.href = '/search-rooms'
                }}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
                }}
              >
                🔍 Khám phá phòng trọ ngay
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1050 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                    {[
                      'Mã yêu cầu',
                      'Phòng & Tòa nhà',
                      'Loại',
                      'Ngày mong muốn',
                      'Trạng thái',
                      'Lịch hẹn xem phòng',
                      'Lý do / Phản hồi',
                      'Thao tác',
                    ].map((header) => (
                      <th
                        key={header}
                        style={{
                          textAlign: 'left',
                          padding: '16px 18px',
                          color: '#475569',
                          fontSize: 13,
                          fontWeight: 750,
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
                    const status = statusColor[request.status] || statusColor.CANCELLED

                    return (
                      <tr key={request.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* Mã yêu cầu */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{request.code}</div>
                          <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                            {formatDateTime(request.createdAt)}
                          </div>
                        </td>

                        {/* Phòng & Tòa */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                          <div style={{ color: '#0f172a', fontWeight: 800, fontSize: 14 }}>
                            Phòng {request.roomCode}
                          </div>
                          <div style={{ color: '#64748b', fontSize: 12.5, marginTop: 2 }}>
                            🏢 {request.buildingName}
                          </div>
                        </td>

                        {/* Loại */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 12.5,
                              color: request.type === 'RENT_NOW' ? '#b45309' : '#4338ca',
                              background: request.type === 'RENT_NOW' ? '#fef3c7' : '#e0e7ff',
                              padding: '4px 10px',
                              borderRadius: 8,
                              display: 'inline-block',
                            }}
                          >
                            {typeLabel[request.type] || request.type}
                          </span>
                        </td>

                        {/* Ngày mong muốn */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle', fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                          {formatDate(request.desiredDate)}
                          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{request.peopleCount} người ở</div>
                        </td>

                        {/* Trạng thái */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              borderRadius: 999,
                              padding: '5px 12px',
                              background: status.bg,
                              color: status.color,
                              border: `1px solid ${status.border}`,
                              fontWeight: 800,
                              fontSize: 12,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {statusLabel[request.status] || request.status}
                          </span>
                        </td>

                        {/* Lịch hẹn */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                          {request.appointmentAt ? (
                            <div
                              style={{
                                background: '#fef3c7',
                                color: '#92400e',
                                padding: '5px 10px',
                                borderRadius: 8,
                                fontWeight: 700,
                                fontSize: 12.5,
                                display: 'inline-block',
                              }}
                            >
                              📅 {formatDateTime(request.appointmentAt)}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Chưa có lịch hẹn</span>
                          )}
                        </td>

                        {/* Lý do từ chối / Phản hồi */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle', maxWidth: 220 }}>
                          {request.status === 'REJECTED' ? (
                            <div style={{ color: '#b91c1c', fontSize: 13, background: '#fef2f2', padding: '6px 10px', borderRadius: 8, border: '1px solid #fecaca' }}>
                              <strong>Lý do:</strong> {request.rejectReason || 'Không phù hợp'}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>

                        {/* Thao tác (S2-09) */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: 7, flexWrap: 'nowrap' }}>
                            <button
                              onClick={() => {
                                window.location.href = `/listing/${request.listingId}`
                              }}
                              style={{
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                color: '#2563eb',
                                borderRadius: 8,
                                padding: '7px 11px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: 12.5,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Xem tin
                            </button>

                            <button
                              onClick={() => openHistory(request)}
                              style={{
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                color: '#475569',
                                borderRadius: 8,
                                padding: '7px 11px',
                                cursor: 'pointer',
                                fontWeight: 650,
                                fontSize: 12.5,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              📜 Lịch sử
                            </button>

                            {canCancel(request.status) && (
                              <button
                                onClick={() => setCancellingRequest(request)}
                                style={{
                                  border: '1px solid #fecaca',
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  borderRadius: 8,
                                  padding: '7px 11px',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  fontSize: 12.5,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Huỷ
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

      {/* MODAL XÁC NHẬN HỦY YÊU CẦU (S2-09) */}
      {cancellingRequest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              background: '#fff',
              borderRadius: 16,
              padding: 26,
              textAlign: 'center',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px', fontSize: 19, fontWeight: 800, color: '#0f172a' }}>
              Xác nhận huỷ yêu cầu?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
              Bạn có chắc chắn muốn huỷ yêu cầu <strong>{cancellingRequest.code}</strong> (Phòng {cancellingRequest.roomCode})? Thao tác này <strong>không thể khôi phục</strong>.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setCancellingRequest(null)}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  borderRadius: 9,
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Giữ lại
              </button>
              <button
                onClick={confirmCancel}
                disabled={isCancelling}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  borderRadius: 9,
                  fontWeight: 700,
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(220,38,38,0.25)',
                }}
              >
                {isCancelling ? 'Đang huỷ...' : 'Xác nhận huỷ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LỊCH SỬ XỬ LÝ (S2-08 / S2-09) */}
      {historyReq && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  📜 Tiến trình xử lý yêu cầu {historyReq.code}
                </h3>
                <div style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>
                  Phòng {historyReq.roomCode} · {historyReq.buildingName}
                </div>
              </div>
              <button
                onClick={() => setHistoryReq(null)}
                style={{ border: 'none', background: '#e2e8f0', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Đang tải lịch sử...</div>
              ) : historyList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Chưa có bản ghi lịch sử nào.</div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  {/* Vertical Line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      bottom: 10,
                      left: 7,
                      width: 2,
                      background: '#cbd5e1',
                    }}
                  />

                  {historyList.map((item, index) => (
                    <div key={item.id || index} style={{ position: 'relative', marginBottom: 22 }}>
                      {/* Dot */}
                      <div
                        style={{
                          position: 'absolute',
                          left: -24,
                          top: 4,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: index === historyList.length - 1 ? '#2563eb' : '#94a3b8',
                          border: '3px solid #fff',
                          boxShadow: '0 0 0 1px #cbd5e1',
                        }}
                      />

                      <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                            {item.toStatus ? statusLabel[item.toStatus] || item.toStatus : 'Cập nhật'}
                          </span>
                          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                            {formatDateTime(item.changedAt)}
                          </span>
                        </div>

                        <div style={{ fontSize: 13, color: '#475569' }}>
                          Bởi: <strong>{item.actorName || 'Hệ thống'}</strong>
                        </div>

                        {(item.note || item.reason) && (
                          <div
                            style={{
                              marginTop: 8,
                              padding: '8px 12px',
                              background: '#fff',
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                              fontSize: 13,
                              color: '#334155',
                            }}
                          >
                            {item.reason && <div>Lý do: <strong>{item.reason}</strong></div>}
                            {item.note && <div style={{ marginTop: item.reason ? 3 : 0 }}>Ghi chú: {item.note}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                onClick={() => setHistoryReq(null)}
                style={{
                  padding: '9px 20px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyRequests
