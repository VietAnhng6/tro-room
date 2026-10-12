
import { useEffect, useState } from 'react'

const API = 'http://localhost:8080'

const getToken = () => localStorage.getItem('accessToken')

type Building = {
  id: number
  name: string
  address: string
  managerName: string
}

type Room = {
  contractId: number
  roomId: number
  roomCode: string
  floor: number
  tenantName: string
  prevElectricity: number
  prevWater: number
  electricity: number | null
  water: number | null
  recorded: boolean
  locked: boolean
}

type BuildingProgress = {
  building: Building
  total: number
  recorded: number
  remaining: number
}

type ReadingResponse = {
  buildingId: number
  period: string
  total: number
  recorded: number
  remaining: number
  rooms: Room[]
}

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function MeterReadings() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [buildingId, setBuildingId] = useState('')
  const [period, setPeriod] = useState(currentPeriod())
  const [data, setData] = useState<ReadingResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState<BuildingProgress[]>([])
  const [onlyMissing, setOnlyMissing] = useState(false)

  const headers = () => ({
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  })

  const loadBuildings = async () => {
    try {
      setError('')
      const response = await fetch(
        `${API}/api/manager/meter-readings/buildings`,
        { headers: headers() }
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Không thể tải danh sách tòa nhà')
      }

      const list: Building[] = result
      setBuildings(list)

      if (list.length > 0) {
        setBuildingId((old) =>
          old && list.some((b) => String(b.id) === old)
            ? old
            : String(list[0].id)
        )
      } else {
        setBuildingId('')
        setData(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  const loadReadings = async () => {
    if (!buildingId || !period) {
      setData(null)
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      const response = await fetch(
        `${API}/api/manager/meter-readings?buildingId=${buildingId}&period=${period}`,
        { headers: headers() }
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Không thể tải chỉ số điện nước')
      }

      setData(result as ReadingResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBuildings()
  }, [])

  useEffect(() => {
    void loadReadings()
  }, [buildingId, period])

  useEffect(() => {
    if (!buildings.length || !period) {
      setProgress([])
      return
    }
    let cancelled = false
    const loadProgress = async () => {
      const results = await Promise.all(buildings.map(async (building) => {
        try {
          const response = await fetch(`${API}/api/manager/meter-readings?buildingId=${building.id}&period=${period}`, { headers: headers() })
          if (!response.ok) return { building, total: 0, recorded: 0, remaining: 0 }
          const summary = await response.json() as ReadingResponse
          return { building, total: summary.total, recorded: summary.recorded, remaining: summary.remaining }
        } catch {
          return { building, total: 0, recorded: 0, remaining: 0 }
        }
      }))
      if (!cancelled) setProgress(results)
    }
    void loadProgress()
    return () => { cancelled = true }
  }, [buildings, period])

  const updateRoom = (
    contractId: number,
    field: 'electricity' | 'water',
    value: string
  ) => {
    if (!data) return

    setData({
      ...data,
      rooms: data.rooms.map((room) =>
        room.contractId === contractId
          ? { ...room, [field]: value === '' ? null : Number(value) }
          : room
      ),
    })
  }

  const saveRoom = async (room: Room, confirm = false) => {
    if (room.electricity === null || room.water === null) {
      alert('Vui lòng nhập đủ chỉ số điện và nước.')
      return
    }

    if (
      !Number.isInteger(room.electricity) ||
      !Number.isInteger(room.water) ||
      room.electricity < room.prevElectricity ||
      room.water < room.prevWater
    ) {
      alert('Chỉ số mới phải là số nguyên và không được thấp hơn chỉ số kỳ trước.')
      return
    }

    try {
      setSavingId(room.contractId)
      setError('')
      setMessage('')

      const response = await fetch(
        `${API}/api/manager/meter-readings`,
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            contractId: room.contractId,
            period,
            electricity: room.electricity,
            water: room.water,
            confirm,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        // Chỉ hỏi xác nhận với cảnh báo tiêu thụ bất thường.
        // Các lỗi 409 khác (kỳ đã khóa, có kỳ sau, hợp đồng hết hiệu lực)
        // hiển thị thẳng thông báo lỗi.
        const warning =
          result.message || 'Chỉ số có dấu hiệu tiêu thụ bất thường.'

        const isConsumptionWarning =
          response.status === 409 && result.code === 'CONSUMPTION_WARNING'

        if (!confirm && isConsumptionWarning) {
          const accepted = window.confirm(
            `${warning}\n\nBạn có muốn xác nhận và lưu chỉ số này không?`
          )

          if (accepted) {
            await saveRoom(room, true)
          }
          return
        }

        throw new Error(warning)
      }

      await loadReadings()
      setMessage(`Đã lưu chỉ số phòng ${room.roomCode}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu chỉ số')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={headerInner}>
          <div>
            <button
              onClick={() => {
                window.location.href = '/dashboard'
              }}
              style={backStyle}
            >
              ← Tổng quan
            </button>
            <h1 style={titleStyle}>Nhập chỉ số điện nước</h1>
            <p style={subtitleStyle}>
              Ghi nhận chỉ số đồng hồ theo từng phòng trước khi lập hóa đơn.
            </p>
          </div>
        </div>
      </header>

      <main style={mainStyle}>
        <section style={filterCardStyle}>
          <div style={filtersStyle}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={labelStyle}>Tòa nhà</label>
              <select
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                style={inputStyle}
              >
                {buildings.length === 0 && (
                  <option value="">Không có tòa nhà</option>
                )}
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ width: 190, maxWidth: '100%' }}>
              <label style={labelStyle}>Kỳ ghi chỉ số</label>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={inputStyle}
              />
            </div>

            <button onClick={() => void loadReadings()} style={primaryButtonStyle}>
              Tải dữ liệu
            </button>
          </div>
        </section>

        {error && <div style={errorStyle}>{error}</div>}
        {message && <div style={successStyle}>{message}</div>}

        <section style={tableCardStyle}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>Tiến độ chốt chỉ số theo tòa · {period}</h2>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 13 }}>Bấm vào số phòng còn thiếu để xem danh sách chi tiết.</p>
          </div>
          {progress.length === 0 ? <div style={emptyStyle}>Chưa có dữ liệu tòa nhà.</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...tableStyle, minWidth: 760 }}>
                <thead><tr><th style={thStyle}>Tòa nhà</th><th style={thStyle}>Người quản lý</th><th style={thStyle}>Đang thuê</th><th style={thStyle}>Đã chốt</th><th style={thStyle}>Còn thiếu</th><th style={thStyle}>Tiến độ</th></tr></thead>
                <tbody>{progress.map((item) => <tr key={item.building.id}>
                  <td style={tdStyle}><strong>{item.building.name}</strong><div style={mutedStyle}>{item.building.address}</div></td>
                  <td style={tdStyle}>{item.building.managerName || 'Chưa phân công'}</td>
                  <td style={tdStyle}>{item.total}</td><td style={tdStyle}>{item.recorded}</td>
                  <td style={tdStyle}><button onClick={() => { setBuildingId(String(item.building.id)); setOnlyMissing(true) }} style={{ border: 0, background: 'transparent', color: item.remaining ? '#b45309' : '#15803d', fontWeight: 800, cursor: 'pointer', textDecoration: item.remaining ? 'underline' : 'none' }}>{item.remaining}</button></td>
                  <td style={tdStyle}><div style={{ minWidth: 100, background: '#e2e8f0', borderRadius: 20, height: 8, overflow: 'hidden' }}><div style={{ width: `${item.total ? item.recorded / item.total * 100 : 0}%`, background: '#16a34a', height: '100%' }} /></div><div style={mutedStyle}>{item.total ? Math.round(item.recorded / item.total * 100) : 0}%</div></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </section>

        {onlyMissing && <div style={{ ...successStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          Đang lọc các phòng chưa chốt chỉ số.
          <button onClick={() => setOnlyMissing(false)} style={{ border: 0, background: 'transparent', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>Hiện tất cả phòng</button>
        </div>}

        {data && (
          <section style={statsGridStyle}>
            <Stat label="Tổng số phòng" value={data.total} />
            <Stat label="Đã chốt" value={data.recorded} />
            <Stat label="Chưa chốt" value={data.remaining} />
          </section>
        )}

        <section style={tableCardStyle}>
          {loading ? (
            <div style={emptyStyle}>Đang tải dữ liệu...</div>
          ) : !data ? (
            <div style={emptyStyle}>
              Chọn tòa nhà và kỳ ghi chỉ số để xem dữ liệu.
            </div>
          ) : data.rooms.filter((room) => !onlyMissing || !room.recorded).length === 0 ? (
            <div style={emptyStyle}>
              Không có phòng nào phù hợp trong kỳ này.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Phòng</th>
                    <th style={thStyle}>Người thuê</th>
                    <th style={thStyle}>Điện kỳ trước</th>
                    <th style={thStyle}>Điện hiện tại</th>
                    <th style={thStyle}>Nước kỳ trước</th>
                    <th style={thStyle}>Nước hiện tại</th>
                    <th style={thStyle}>Trạng thái</th>
                    <th style={thStyle}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rooms.filter((room) => !onlyMissing || !room.recorded).map((room) => (
                    <tr key={room.contractId}>
                      <td style={tdStyle}>
                        <strong>{room.roomCode}</strong>
                        <div style={mutedStyle}>Tầng {room.floor}</div>
                      </td>
                      <td style={tdStyle}>{room.tenantName || '—'}</td>
                      <td style={tdStyle}>{room.prevElectricity}</td>
                      <td style={tdStyle}>
                        <input
                          type="number"
                          disabled={room.locked}
                          min={room.prevElectricity}
                          step="1"
                          value={room.electricity ?? ''}
                          onChange={(e) =>
                            updateRoom(room.contractId, 'electricity', e.target.value)
                          }
                          style={numberInputStyle}
                          aria-label={`Chỉ số điện phòng ${room.roomCode}`}
                        />
                      </td>
                      <td style={tdStyle}>{room.prevWater}</td>
                      <td style={tdStyle}>
                        <input
                          type="number"
                          disabled={room.locked}
                          min={room.prevWater}
                          step="1"
                          value={room.water ?? ''}
                          onChange={(e) =>
                            updateRoom(room.contractId, 'water', e.target.value)
                          }
                          style={numberInputStyle}
                          aria-label={`Chỉ số nước phòng ${room.roomCode}`}
                        />
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={
                            room.recorded ? recordedBadgeStyle : pendingBadgeStyle
                          }
                        >
                          {room.locked ? 'Đã khóa kỳ' : room.recorded ? 'Đã chốt' : 'Chưa chốt'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <button
                          disabled={savingId === room.contractId || room.locked}
                          onClick={() => void saveRoom(room)}
                          style={{
                            ...saveButtonStyle,
                            opacity: savingId === room.contractId ? 0.6 : 1,
                          }}
                        >
                          {room.locked ? 'Kỳ đã khóa' : savingId === room.contractId
                            ? 'Đang lưu...'
                            : room.recorded
                              ? 'Cập nhật'
                              : 'Lưu chỉ số'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p style={hintStyle}>
          Lưu ý: Chỉ số mới không được thấp hơn kỳ trước. Nếu mức tiêu thụ bất
          thường, hệ thống có thể yêu cầu xác nhận trước khi lưu.
        </p>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={statCardStyle}>
      <div style={statLabelStyle}>{label}</div>
      <div style={statValueStyle}>{value}</div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  color: '#0f172a',
}
const headerStyle: React.CSSProperties = {
  background: '#fff',
  borderBottom: '1px solid #e2e8f0',
  padding: '22px 30px',
}
const headerInner: React.CSSProperties = {
  maxWidth: 1300,
  margin: '0 auto',
}
const mainStyle: React.CSSProperties = {
  maxWidth: 1300,
  margin: '0 auto',
  padding: 28,
}
const titleStyle: React.CSSProperties = {
  margin: '8px 0',
  fontSize: 27,
  fontWeight: 800,
}
const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: '#64748b',
  fontSize: 14,
}
const backStyle: React.CSSProperties = {
  border: 0,
  background: 'transparent',
  color: '#2563eb',
  cursor: 'pointer',
  padding: 0,
  fontSize: 14,
}
const filterCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 20,
  marginBottom: 18,
}
const filtersStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  flexWrap: 'wrap',
  gap: 16,
}
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 700,
  fontSize: 13,
  marginBottom: 7,
  color: '#475569',
}
const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #cbd5e1',
  borderRadius: 9,
  padding: '10px 12px',
  fontSize: 14,
  background: '#fff',
  color: '#0f172a',
}
const primaryButtonStyle: React.CSSProperties = {
  border: 0,
  background: '#2563eb',
  color: '#fff',
  borderRadius: 9,
  padding: '11px 17px',
  cursor: 'pointer',
  fontWeight: 700,
}
const tableCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  overflow: 'hidden',
}
const tableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 1050,
  borderCollapse: 'collapse',
}
const thStyle: React.CSSProperties = {
  padding: '13px 14px',
  textAlign: 'left',
  background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  color: '#475569',
  fontSize: 12,
  whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = {
  padding: '13px 14px',
  borderBottom: '1px solid #e2e8f0',
  fontSize: 13,
  verticalAlign: 'middle',
}
const numberInputStyle: React.CSSProperties = {
  width: 95,
  boxSizing: 'border-box',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '8px',
  fontSize: 14,
}
const mutedStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  marginTop: 3,
}
const recordedBadgeStyle: React.CSSProperties = {
  background: '#dcfce7',
  color: '#166534',
  padding: '5px 8px',
  borderRadius: 7,
  fontSize: 12,
  whiteSpace: 'nowrap',
}
const pendingBadgeStyle: React.CSSProperties = {
  background: '#fef3c7',
  color: '#92400e',
  padding: '5px 8px',
  borderRadius: 7,
  fontSize: 12,
  whiteSpace: 'nowrap',
}
const saveButtonStyle: React.CSSProperties = {
  border: 0,
  background: '#2563eb',
  color: '#fff',
  borderRadius: 8,
  padding: '9px 12px',
  cursor: 'pointer',
  fontWeight: 700,
  whiteSpace: 'nowrap',
}
const statCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 18,
}
const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 14,
  marginBottom: 18,
}
const statLabelStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 13,
}
const statValueStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  marginTop: 6,
}
const emptyStyle: React.CSSProperties = {
  padding: 45,
  textAlign: 'center',
  color: '#64748b',
}
const hintStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.7,
  marginTop: 15,
}
const errorStyle: React.CSSProperties = {
  background: '#fef2f2',
  color: '#b91c1c',
  padding: 13,
  borderRadius: 10,
  marginBottom: 14,
}
const successStyle: React.CSSProperties = {
  background: '#f0fdf4',
  color: '#166534',
  padding: 13,
  borderRadius: 10,
  marginBottom: 14,
}

export default MeterReadings