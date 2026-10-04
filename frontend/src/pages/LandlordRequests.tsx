import { useCallback, useEffect, useState } from 'react'

export type RequestItem = {
  id: number
  requestCode: string
  tenantName: string
  tenantPhone: string
  roomId: number
  roomCode: string
  buildingId: number
  buildingName: string
  type: 'VIEWING' | 'RENT_NOW' | string
  desiredDate: string
  expectedPeople: number
  message: string
  status: 'OPEN' | 'SCHEDULED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | string
  scheduledAt: string | null
  createdAt: string
  overdue: boolean
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

type Building = {
  id: number
  name: string
}

const API = 'http://localhost:8080'

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Mới',
  SCHEDULED: 'Đã hẹn lịch',
  ACCEPTED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã huỷ',
  COMPLETED: 'Hoàn tất',
}

const STATUS_COLOR: Record<string, { bg: string; fg: string; border: string }> = {
  OPEN: { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' },
  SCHEDULED: { bg: '#fef3c7', fg: '#92400e', border: '#fde68a' },
  ACCEPTED: { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0' },
  REJECTED: { bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca' },
  CANCELLED: { bg: '#f1f5f9', fg: '#64748b', border: '#cbd5e1' },
  COMPLETED: { bg: '#e0e7ff', fg: '#4338ca', border: '#c7d2fe' },
}

const TYPE_LABEL: Record<string, string> = {
  VIEWING: '👁️ Xem phòng',
  RENT_NOW: '⚡ Thuê ngay',
}

const REJECT_REASONS = [
  { value: 'ALREADY_RENTED', label: 'Đã có khách thuê' },
  { value: 'PEOPLE_MISMATCH', label: 'Không phù hợp số người' },
  { value: 'UNREACHABLE', label: 'Khách không liên lạc được' },
  { value: 'OTHER', label: 'Lý do khác' },
]

function formatDate(value: string | null) {
  if (!value) return '—'
  if (value.includes('T')) value = value.split('T')[0]
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function LandlordRequests() {
  const [items, setItems] = useState<RequestItem[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [status, setStatus] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Modals state
  const [schedulingReq, setSchedulingReq] = useState<RequestItem | null>(null)
  const [appointmentTime, setAppointmentTime] = useState('')
  const [scheduleForce, setScheduleForce] = useState(false)
  const [scheduleConflictMsg, setScheduleConflictMsg] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)

  const [rejectingReq, setRejectingReq] = useState<RequestItem | null>(null)
  const [rejectReason, setRejectReason] = useState('ALREADY_RENTED')
  const [rejectNote, setRejectNote] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  const [historyReq, setHistoryReq] = useState<RequestItem | null>(null)
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [approvingReq, setApprovingReq] = useState<RequestItem | null>(null)
  const [isApproving, setIsApproving] = useState(false)

  const token = localStorage.getItem('accessToken')

  // Load buildings for filter
  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/buildings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Building[]) => setBuildings(data))
      .catch(() => setBuildings([]))
  }, [token])

  const load = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError('')

    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (buildingId) params.set('buildingId', buildingId)
    params.set('sort', sort)

    try {
      const res = await fetch(`${API}/api/landlord/requests?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.message || 'Không thể tải danh sách yêu cầu')
        setItems([])
        return
      }

      setItems(await res.json())
    } catch {
      setError('Không thể kết nối tới máy chủ')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, status, buildingId, sort])

  useEffect(() => {
    load()
  }, [load])

  // S2-08: Hẹn lịch xem phòng
  const handleOpenSchedule = (req: RequestItem) => {
    setSchedulingReq(req)
    setAppointmentTime(req.scheduledAt ? req.scheduledAt.substring(0, 16) : '')
    setScheduleForce(false)
    setScheduleConflictMsg('')
  }

  const handleConfirmSchedule = async () => {
    if (!schedulingReq || !appointmentTime) {
      alert('Vui lòng chọn ngày giờ hẹn cụ thể!')
      return
    }

    setIsScheduling(true)
    setScheduleConflictMsg('')

    try {
      const res = await fetch(`${API}/api/landlord/requests/${schedulingReq.id}/schedule`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledAt: appointmentTime,
          force: scheduleForce,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (data.code === 'SCHEDULE_CONFLICT') {
          setScheduleConflictMsg(data.message || 'Cảnh báo: Đã có lịch hẹn xem phòng khác cùng phòng trong khoảng 30 phút.')
          return
        }
        throw new Error(data.message || 'Không thể lưu lịch hẹn')
      }

      setSuccessMsg(`Đã xác nhận lịch hẹn cho yêu cầu ${schedulingReq.requestCode}!`)
      setSchedulingReq(null)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi khi đặt lịch')
    } finally {
      setIsScheduling(false)
    }
  }

  // S2-08: Duyệt yêu cầu Thuê ngay
  const handleApprove = async () => {
    if (!approvingReq) return
    setIsApproving(true)
    try {
      const res = await fetch(`${API}/api/landlord/requests/${approvingReq.id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || 'Không thể duyệt yêu cầu thuê.')
      }

      setSuccessMsg(`Đã duyệt yêu cầu ${approvingReq.requestCode}! Phòng đã chuyển sang trạng thái "Đã đặt cọc".`)
      setApprovingReq(null)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi duyệt yêu cầu')
    } finally {
      setIsApproving(false)
    }
  }

  // S2-08: Từ chối yêu cầu
  const handleOpenReject = (req: RequestItem) => {
    setRejectingReq(req)
    setRejectReason('ALREADY_RENTED')
    setRejectNote('')
  }

  const handleConfirmReject = async () => {
    if (!rejectingReq) return
    if (rejectReason === 'OTHER' && !rejectNote.trim()) {
      alert('Vui lòng nhập ghi chú lý do từ chối cụ thể.')
      return
    }

    setIsRejecting(true)
    try {
      const res = await fetch(`${API}/api/landlord/requests/${rejectingReq.id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: rejectReason,
          note: rejectNote.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || 'Không thể từ chối yêu cầu.')
      }

      setSuccessMsg(`Đã từ chối yêu cầu ${rejectingReq.requestCode}.`)
      setRejectingReq(null)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi từ chối yêu cầu')
    } finally {
      setIsRejecting(false)
    }
  }

  // S2-08: Xem lịch sử đổi trạng thái
  const handleOpenHistory = async (req: RequestItem) => {
    setHistoryReq(req)
    setLoadingHistory(true)
    setHistoryList([])

    try {
      const res = await fetch(`${API}/api/landlord/requests/${req.id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Không thể tải lịch sử.')
      const data: HistoryItem[] = await res.json()
      setHistoryList(data)
    } catch {
      setHistoryList([])
    } finally {
      setLoadingHistory(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '30px 24px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4, fontWeight: 600 }}>
              TroRoom / Quản lý yêu cầu
            </div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
              Quản lý yêu cầu thuê & xem phòng
            </h1>
            <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
              Theo dõi, xác nhận lịch hẹn, duyệt thuê ngay và xử lý các yêu cầu từ khách thuê.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => {
                window.location.href = '/rooms'
              }}
              style={{
                height: 42,
                padding: '0 16px',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                background: '#fff',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 650,
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🚪</span> Quản lý phòng
            </button>

            <button
              onClick={() => {
                window.location.href = '/dashboard'
              }}
              style={{
                height: 42,
                padding: '0 18px',
                border: 'none',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
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
              padding: '14px 18px',
              borderRadius: 12,
              marginBottom: 20,
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
              color: '#dc2626',
              padding: '14px 18px',
              borderRadius: 12,
              marginBottom: 20,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* FILTERS */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 22,
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(15,23,42,0.03)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Trạng thái</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                height: 40,
                padding: '0 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                background: '#fff',
                fontSize: 13.5,
                color: '#1e293b',
                minWidth: 160,
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="OPEN">Mới (Chưa xử lý)</option>
              <option value="SCHEDULED">Đã hẹn lịch</option>
              <option value="ACCEPTED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
              <option value="CANCELLED">Đã huỷ</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Tòa nhà</label>
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              style={{
                height: 40,
                padding: '0 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                background: '#fff',
                fontSize: 13.5,
                color: '#1e293b',
                minWidth: 180,
              }}
            >
              <option value="">Tất cả toà nhà</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Sắp xếp</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{
                height: 40,
                padding: '0 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                background: '#fff',
                fontSize: 13.5,
                color: '#1e293b',
                minWidth: 150,
              }}
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', color: '#64748b', fontSize: 13.5, fontWeight: 600 }}>
            {loading ? 'Đang tải dữ liệu...' : `Tổng số: ${items.length} yêu cầu`}
          </div>
        </div>

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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left' }}>
                  {[
                    'Mã yêu cầu',
                    'Khách thuê',
                    'Phòng & Tòa nhà',
                    'Loại yêu cầu',
                    'Ngày mong muốn',
                    'Trạng thái',
                    'Gửi lúc',
                    'Thao tác',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '16px 18px',
                        fontSize: 13,
                        fontWeight: 750,
                        color: '#475569',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {!loading && items.length === 0 && !error && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#334155' }}>Không có yêu cầu nào phù hợp</div>
                      <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Hãy thử thay đổi bộ lọc tìm kiếm.</div>
                    </td>
                  </tr>
                )}

                {items.map((r) => {
                  const color = STATUS_COLOR[r.status] || STATUS_COLOR.CANCELLED
                  const isNew = r.status === 'OPEN'
                  const isScheduled = r.status === 'SCHEDULED'

                  return (
                    <tr
                      key={r.id}
                      style={{
                        background: r.overdue ? '#fff8f8' : '#ffffff',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Mã yêu cầu */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{r.requestCode}</div>
                        {r.overdue && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: '#fee2e2',
                              color: '#dc2626',
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: 6,
                              marginTop: 6,
                            }}
                          >
                            ⏰ Quá 24h chưa xử lý
                          </div>
                        )}
                      </td>

                      {/* Khách thuê */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{r.tenantName}</div>
                        <div style={{ color: '#2563eb', fontSize: 13, marginTop: 2, fontWeight: 600 }}>📞 {r.tenantPhone}</div>
                        <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{r.expectedPeople} người ở</div>
                      </td>

                      {/* Phòng & Tòa nhà */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>Phòng {r.roomCode}</div>
                        <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>🏢 {r.buildingName}</div>
                      </td>

                      {/* Loại yêu cầu */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: r.type === 'RENT_NOW' ? '#b45309' : '#4338ca',
                            background: r.type === 'RENT_NOW' ? '#fef3c7' : '#e0e7ff',
                            padding: '4px 10px',
                            borderRadius: 8,
                            display: 'inline-block',
                          }}
                        >
                          {TYPE_LABEL[r.type] || r.type}
                        </span>
                        {r.message && (
                          <div
                            style={{
                              color: '#475569',
                              fontSize: 12,
                              marginTop: 6,
                              maxWidth: 180,
                              lineHeight: 1.4,
                              fontStyle: 'italic',
                            }}
                          >
                            "{r.message}"
                          </div>
                        )}
                      </td>

                      {/* Ngày mong muốn */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle', fontSize: 13.5, color: '#334155', fontWeight: 600 }}>
                        {formatDate(r.desiredDate)}
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            background: color.bg,
                            color: color.fg,
                            border: `1px solid ${color.border}`,
                            padding: '5px 12px',
                            borderRadius: 999,
                            fontSize: 12.5,
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                          }}
                        >
                          {STATUS_LABEL[r.status] || r.status}
                        </span>

                        {r.scheduledAt && (
                          <div
                            style={{
                              color: '#92400e',
                              fontSize: 12,
                              fontWeight: 700,
                              marginTop: 6,
                              background: '#fef3c7',
                              padding: '3px 8px',
                              borderRadius: 6,
                              display: 'inline-block',
                            }}
                          >
                            📅 Hẹn: {formatDateTime(r.scheduledAt)}
                          </div>
                        )}
                      </td>

                      {/* Gửi lúc */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle', fontSize: 13, color: '#64748b' }}>
                        {formatDateTime(r.createdAt)}
                      </td>

                      {/* Thao tác (S2-08) */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(isNew || isScheduled) && (
                            <button
                              onClick={() => handleOpenSchedule(r)}
                              style={{
                                padding: '6px 11px',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                borderRadius: 7,
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              📅 {isScheduled ? 'Đổi lịch' : 'Hẹn lịch'}
                            </button>
                          )}

                          {(isNew || isScheduled) && (
                            <button
                              onClick={() => setApprovingReq(r)}
                              style={{
                                padding: '6px 11px',
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                color: '#047857',
                                borderRadius: 7,
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ✓ Duyệt thuê
                            </button>
                          )}

                          {(isNew || isScheduled) && (
                            <button
                              onClick={() => handleOpenReject(r)}
                              style={{
                                padding: '6px 11px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                borderRadius: 7,
                                fontSize: 12.5,
                                fontWeight: 650,
                                cursor: 'pointer',
                              }}
                            >
                              ✕ Từ chối
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenHistory(r)}
                            style={{
                              padding: '6px 11px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#475569',
                              borderRadius: 7,
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            📜 Lịch sử
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL HẸN LỊCH / ĐỔI LỊCH (S2-08) */}
      {schedulingReq && (
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
              maxWidth: 480,
              background: '#fff',
              borderRadius: 16,
              padding: 26,
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0f172a' }}>
                📅 {schedulingReq.status === 'SCHEDULED' ? 'Đổi lịch hẹn xem phòng' : 'Xác nhận lịch hẹn xem phòng'}
              </h3>
              <button
                onClick={() => setSchedulingReq(null)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, marginBottom: 18, fontSize: 13.5 }}>
              <div>Yêu cầu: <strong>{schedulingReq.requestCode}</strong></div>
              <div style={{ marginTop: 4 }}>Khách thuê: <strong>{schedulingReq.tenantName}</strong> ({schedulingReq.tenantPhone})</div>
              <div style={{ marginTop: 4 }}>Phòng: <strong>{schedulingReq.roomCode}</strong> · Tòa: <strong>{schedulingReq.buildingName}</strong></div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Chọn ngày và giờ hẹn *
              </label>
              <input
                type="datetime-local"
                value={appointmentTime}
                onChange={(e) => {
                  setAppointmentTime(e.target.value)
                  setScheduleConflictMsg('')
                }}
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 12px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 9,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {scheduleConflictMsg && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  padding: '12px 14px',
                  borderRadius: 9,
                  marginBottom: 16,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <div>⚠️ {scheduleConflictMsg}</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={scheduleForce}
                    onChange={(e) => setScheduleForce(e.target.checked)}
                  />
                  <span>Vẫn tiếp tục đặt lịch vào khung giờ này</span>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSchedulingReq(null)}
                style={{
                  padding: '10px 18px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  borderRadius: 9,
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmSchedule}
                disabled={isScheduling}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  borderRadius: 9,
                  fontWeight: 700,
                  cursor: isScheduling ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                }}
              >
                {isScheduling ? 'Đang lưu...' : 'Xác nhận lịch hẹn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TỪ CHỐI YÊU CẦU (S2-08) */}
      {rejectingReq && (
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
              maxWidth: 480,
              background: '#fff',
              borderRadius: 16,
              padding: 26,
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#dc2626' }}>
                ✕ Từ chối yêu cầu thuê
              </h3>
              <button
                onClick={() => setRejectingReq(null)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#fef2f2', padding: 14, borderRadius: 10, marginBottom: 18, fontSize: 13.5 }}>
              <div>Từ chối yêu cầu <strong>{rejectingReq.requestCode}</strong> của khách <strong>{rejectingReq.tenantName}</strong>.</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13.5, fontWeight: 750, color: '#334155', marginBottom: 6 }}>
                Lý do từ chối *
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 12px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 9,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              >
                {REJECT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13.5, fontWeight: 750, color: '#334155', marginBottom: 6 }}>
                Ghi chú thêm {rejectReason === 'OTHER' && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                placeholder={rejectReason === 'OTHER' ? 'Nhập chi tiết lý do từ chối...' : 'Nhập lời nhắn gửi đến khách thuê (không bắt buộc)...'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 9,
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRejectingReq(null)}
                style={{
                  padding: '10px 18px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  borderRadius: 9,
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isRejecting}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  borderRadius: 9,
                  fontWeight: 700,
                  cursor: isRejecting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(220,38,38,0.25)',
                }}
              >
                {isRejecting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DUYỆT THUÊ NGAY (S2-08) */}
      {approvingReq && (
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
              maxWidth: 460,
              background: '#fff',
              borderRadius: 16,
              padding: 26,
              textAlign: 'center',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
            <h3 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              Xác nhận duyệt yêu cầu thuê?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
              Khi duyệt yêu cầu <strong>{approvingReq.requestCode}</strong> của khách <strong>{approvingReq.tenantName}</strong>, phòng <strong>{approvingReq.roomCode}</strong> sẽ tự động chuyển sang trạng thái <strong>"Đã đặt cọc"</strong> để bạn tiến hành lập hợp đồng thuê.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setApprovingReq(null)}
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
                Hủy bỏ
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproving}
                style={{
                  flex: 1,
                  padding: '11px 20px',
                  border: 'none',
                  background: '#059669',
                  color: '#fff',
                  borderRadius: 9,
                  fontWeight: 700,
                  cursor: isApproving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(5,150,105,0.25)',
                }}
              >
                {isApproving ? 'Đang duyệt...' : 'Xác nhận duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM LỊCH SỬ XỬ LÝ (S2-08) */}
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
              maxWidth: 580,
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
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  📜 Lịch sử xử lý yêu cầu {historyReq.requestCode}
                </h3>
                <div style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>
                  Khách thuê: {historyReq.tenantName} · Phòng: {historyReq.roomCode}
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
                    <div key={item.id || index} style={{ position: 'relative', marginBottom: 24 }}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                            {item.toStatus ? STATUS_LABEL[item.toStatus] || item.toStatus : 'Cập nhật'}
                          </span>
                          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                            {formatDateTime(item.changedAt)}
                          </span>
                        </div>

                        <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
                          Thực hiện bởi: <strong>{item.actorName || 'Hệ thống'}</strong> {item.actorRole && `(${item.actorRole})`}
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

export default LandlordRequests