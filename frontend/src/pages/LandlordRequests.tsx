import { useCallback, useEffect, useState } from 'react'

type RequestItem = {
  id: number
  requestCode: string
  tenantName: string
  tenantPhone: string
  roomId: number
  roomCode: string
  buildingId: number
  buildingName: string
  type: string
  desiredDate: string
  expectedPeople: number
  message: string
  status: string
  scheduledAt: string | null
  createdAt: string
  overdue: boolean
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

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  OPEN: { bg: '#eff6ff', fg: '#2563eb' },
  SCHEDULED: { bg: '#fef9c3', fg: '#a16207' },
  ACCEPTED: { bg: '#dcfce7', fg: '#15803d' },
  REJECTED: { bg: '#fee2e2', fg: '#b91c1c' },
  CANCELLED: { bg: '#f1f5f9', fg: '#64748b' },
  COMPLETED: { bg: '#f1f5f9', fg: '#64748b' },
}

const TYPE_LABEL: Record<string, string> = {
  VIEWING: 'Xem phòng',
  RENT_NOW: 'Thuê ngay',
}

const FILTER_STATUSES = ['OPEN', 'SCHEDULED', 'ACCEPTED', 'REJECTED', 'CANCELLED']

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN')
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('vi-VN')
}

function LandlordRequests() {
  const [items, setItems] = useState<RequestItem[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [status, setStatus] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contractRequest, setContractRequest] = useState<RequestItem | null>(null)
  const [contractForm, setContractForm] = useState({
  deposit: '',
  startDate: '',
  termMonths: '12',
  billingCutoffDay: '1',
  initialElectricity: '',
  initialWater: '',
  })
  const [contractLoading, setContractLoading] = useState(false)
  const token = localStorage.getItem('accessToken')

  // Danh sách toà nhà cho bộ lọc
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
    async function approveRequest(id: number) {
    if (!window.confirm('Bạn có chắc muốn đồng ý yêu cầu này?')) return

    try {
      const res = await fetch(`${API}/api/landlord/requests/${id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        alert(data?.message || 'Không thể duyệt yêu cầu')
        return
      }

      await load()
    } catch {
      alert('Không thể kết nối tới máy chủ')
    }
  }

  async function rejectRequest(id: number) {
    const reason = window.prompt(
      'Nhập lý do từ chối (ví dụ: ROOM_UNAVAILABLE, OTHER):',
      'OTHER'
    )

    if (!reason) return

    let note = ''

    if (reason.toUpperCase() === 'OTHER') {
      note = window.prompt('Nhập lý do chi tiết:') || ''

      if (!note.trim()) {
        alert('Vui lòng nhập lý do chi tiết.')
        return
      }
    }

    try {
      const res = await fetch(`${API}/api/landlord/requests/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: reason.toUpperCase(),
          note,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        alert(data?.message || 'Không thể từ chối yêu cầu')
        return
      }

      await load()
    } catch {
      alert('Không thể kết nối tới máy chủ')
    }
  }
    async function createContract() {
    if (!contractRequest) return

    if (
      !contractForm.startDate ||
      contractForm.deposit === '' ||
      !contractForm.termMonths ||
      !contractForm.billingCutoffDay ||
      contractForm.initialElectricity === '' ||
      contractForm.initialWater === ''
    ) {
      alert('Vui lòng nhập đầy đủ thông tin hợp đồng.')
      return
    }

    setContractLoading(true)

    try {
      const res = await fetch(
        `${API}/api/landlord/requests/${contractRequest.id}/contract`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            requestId: contractRequest.id,
            deposit: Number(contractForm.deposit),
            startDate: contractForm.startDate,
            termMonths: Number(contractForm.termMonths),
            billingCutoffDay: Number(contractForm.billingCutoffDay),
            initialElectricity: Number(contractForm.initialElectricity),
            initialWater: Number(contractForm.initialWater),
          }),
        }
      )

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        alert(data?.message || 'Không thể tạo hợp đồng')
        return
      }

      alert(`Tạo hợp đồng thành công: ${data.contractCode}`)
      setContractRequest(null)
      await load()
    } catch {
      alert('Không thể kết nối tới máy chủ')
    } finally {
      setContractLoading(false)
    }
  }
  const selectStyle = {
    height: 38,
    padding: '0 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    background: '#fff',
    fontSize: 13,
  }

  const cellStyle = {
    padding: '12px 14px',
    fontSize: 13,
    borderBottom: '1px solid #e2e8f0',
    verticalAlign: 'top' as const,
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        color: '#0f172a',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        padding: 28,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Yêu cầu thuê</h1>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Yêu cầu xem phòng và thuê ngay của các toà nhà bạn quản lý
          </div>
        </div>

        <button
          onClick={() => {
            window.location.href = '/dashboard'
          }}
          style={{
            height: 38,
            padding: '0 16px',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            background: '#fff',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          ← Về Tổng quan
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="">Tất cả trạng thái</option>
          {FILTER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <select
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          style={selectStyle}
        >
          <option value="">Tất cả toà nhà</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={selectStyle}
        >
          <option value="newest">Mới nhất trước</option>
          <option value="oldest">Cũ nhất trước</option>
        </select>

        <div style={{ alignSelf: 'center', color: '#64748b', fontSize: 13 }}>
          {loading ? 'Đang tải...' : `${items.length} yêu cầu`}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
              {['Mã yêu cầu', 'Khách thuê', 'Phòng', 'Loại', 'Ngày mong muốn', 'Trạng thái', 'Gửi lúc', 'Thao tác'].map(
                (h) => (
                  <th key={h} style={{ ...cellStyle, fontWeight: 700, color: '#475569' }}>
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {!loading && items.length === 0 && !error && (
              <tr>
                <td
                  colSpan={8}
                  style={{ ...cellStyle, textAlign: 'center', color: '#64748b', padding: 32 }}
                >
                  Không có yêu cầu nào
                </td>
              </tr>
            )}

            {items.map((r) => {
              const color = STATUS_COLOR[r.status] || STATUS_COLOR.CANCELLED

              return (
                <tr key={r.id} style={{ background: r.overdue ? '#fef2f2' : '#fff' }}>
                  <td style={{ ...cellStyle, fontWeight: 600 }}>
                    {r.requestCode}
                    {r.overdue && (
                      <div style={{ color: '#b91c1c', fontSize: 11, fontWeight: 700, marginTop: 4 }}>
                        Quá 24 giờ chưa xử lý
                      </div>
                    )}
                  </td>

                  <td style={cellStyle}>
                    <div style={{ fontWeight: 600 }}>{r.tenantName}</div>
                    <div style={{ color: '#64748b' }}>{r.tenantPhone}</div>
                  </td>

                  <td style={cellStyle}>
                    <div style={{ fontWeight: 600 }}>{r.roomCode}</div>
                    <div style={{ color: '#64748b' }}>{r.buildingName}</div>
                  </td>

                  <td style={cellStyle}>{TYPE_LABEL[r.type] || r.type}</td>

                  <td style={cellStyle}>{formatDate(r.desiredDate)}</td>

                  <td style={cellStyle}>
                    <span
                      style={{
                        background: color.bg,
                        color: color.fg,
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                    {r.scheduledAt && (
                      <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                        Hẹn: {formatDateTime(r.scheduledAt)}
                      </div>
                    )}
                  </td>

                  <td style={cellStyle}>{formatDateTime(r.createdAt)}</td>
                  <td style={cellStyle}>
                    {r.status === 'ACCEPTED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setContractRequest(r)
                        setContractForm({
                          deposit: '',
                          startDate: new Date().toISOString().split('T')[0],
                          termMonths: '12',
                          billingCutoffDay: '1',
                          initialElectricity: '',
                          initialWater: '',
                        })
                      }}
                      style={{
                        border: 'none',
                        background: '#2563eb',
                        color: '#fff',
                        padding: '7px 12px',
                        borderRadius: 7,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                       Lập hợp đồng
                    </button>
                  )}
                    {(r.status === 'OPEN' || r.status === 'SCHEDULED') && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => approveRequest(r.id)}
                          style={{
                            border: 'none',
                            background: '#16a34a',
                            color: '#fff',
                            padding: '7px 12px',
                            borderRadius: 7,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          ✓ Đồng ý
                        </button>

                        <button
                          type="button"
                          onClick={() => rejectRequest(r.id)}
                          style={{
                            border: 'none',
                            background: '#dc2626',
                            color: '#fff',
                            padding: '7px 12px',
                            borderRadius: 7,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          ✕ Từ chối
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                
              )
            })}
          </tbody>
        </table>
      </div>

      {contractRequest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
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
              maxWidth: 520,
              background: '#fff',
              borderRadius: 14,
              padding: 24,
              boxSizing: 'border-box',
            }}
          >
            <h2 style={{ margin: '0 0 6px' }}>
              Lập hợp đồng thuê
            </h2>

            <div
              style={{
                color: '#64748b',
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {contractRequest.requestCode} · Phòng {contractRequest.roomCode}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
              }}
            >
              <label>
                <div style={{ fontSize: 13, marginBottom: 5 }}>
                  Tiền cọc
                </div>
                <input
                  type="number"
                  min="0"
                  value={contractForm.deposit}
                  onChange={(e) =>
                    setContractForm({
                      ...contractForm,
                      deposit: e.target.value,
                    })
                  }
                  placeholder="VNĐ"
                  style={{
                    ...selectStyle,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </label>

              <label>
                <div style={{ fontSize: 13, marginBottom: 5 }}>
                  Ngày bắt đầu
                </div>
                <input
                  type="date"
                  value={contractForm.startDate}
                  onChange={(e) =>
                    setContractForm({
                      ...contractForm,
                      startDate: e.target.value,
                    })
                  }
                  style={{
                    ...selectStyle,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </label>

              <label>
                <div style={{ fontSize: 13, marginBottom: 5 }}>
                  Thời hạn (tháng)
                </div>
                <input
                  type="number"
                  min="1"
                  value={contractForm.termMonths}
                  onChange={(e) =>
                    setContractForm({
                      ...contractForm,
                      termMonths: e.target.value,
                    })
                  }
                  style={{
                    ...selectStyle,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </label>

              <label>
                <div style={{ fontSize: 13, marginBottom: 5 }}>
                  Ngày chốt hóa đơn
                </div>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={contractForm.billingCutoffDay}
                  onChange={(e) =>
                    setContractForm({
                      ...contractForm,
                      billingCutoffDay: e.target.value,
                    })
                  }
                  style={{
                    ...selectStyle,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </label>

              <label>
                <div style={{ fontSize: 13, marginBottom: 5 }}>
                  Điện đầu kỳ
                </div>
                <input
                  type="number"
                  min="0"
                  value={contractForm.initialElectricity}
                  onChange={(e) =>
                    setContractForm({
                      ...contractForm,
                      initialElectricity: e.target.value,
                    })
                  }
                  style={{
                    ...selectStyle,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </label>

              <label>
                <div style={{ fontSize: 13, marginBottom: 5 }}>
                  Nước đầu kỳ
                </div>
                <input
                  type="number"
                  min="0"
                  value={contractForm.initialWater}
                  onChange={(e) =>
                    setContractForm({
                      ...contractForm,
                      initialWater: e.target.value,
                    })
                  }
                  style={{
                    ...selectStyle,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 22,
              }}
            >
              <button
                type="button"
                onClick={() => setContractRequest(null)}
                disabled={contractLoading}
                style={{
                  padding: '9px 16px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                Huỷ
              </button>

              <button
                type="button"
                onClick={createContract}
                disabled={contractLoading}
                style={{
                  padding: '9px 16px',
                  border: 'none',
                  borderRadius: 8,
                  background: '#2563eb',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {contractLoading ? 'Đang tạo...' : 'Tạo hợp đồng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LandlordRequests
