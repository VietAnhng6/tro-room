import { useEffect, useMemo, useState } from 'react'

type RoomStatus = 'EMPTY' | 'DEPOSITED' | 'RENTED' | 'STOPPED'

type Building = {
  id: number
  name: string
  active: boolean
  roomCount?: number
}

type Room = {
  id: number
  code: string
  floor: number
  area: number
  rent: number
  maxPeople: number
  status: RoomStatus
  buildingId: number
  buildingName: string
}

const API = 'http://localhost:8080'

const statusLabel: Record<RoomStatus, string> = {
  EMPTY: 'Trống',
  DEPOSITED: 'Đã cọc',
  RENTED: 'Đang thuê',
  STOPPED: 'Đã ngưng',
}

const statusColor: Record<RoomStatus, { bg: string; color: string }> = {
  EMPTY: { bg: '#dcfce7', color: '#166534' },
  DEPOSITED: { bg: '#fef3c7', color: '#92400e' },
  RENTED: { bg: '#dbeafe', color: '#1d4ed8' },
  STOPPED: { bg: '#f1f5f9', color: '#475569' },
}

function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])

  const [buildingId, setBuildingId] = useState(
  new URLSearchParams(window.location.search).get('buildingId') || ''
  )
  const [floor, setFloor] = useState('')
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  const [form, setForm] = useState({
    code: '',
    floor: '',
    area: '',
    rent: '',
    maxPeople: '',
    buildingId: '',
  })

  const token = localStorage.getItem('accessToken')

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  async function loadBuildings() {
    try {
      const res = await fetch(`${API}/api/buildings`, {
        headers,
      })

      if (!res.ok) return

      const data = await res.json()
      setBuildings(data)
    } catch {
      // Không chặn trang nếu chưa tải được danh sách tòa
    }
  }

  async function loadRooms() {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()

      if (buildingId) params.append('buildingId', buildingId)
      if (floor) params.append('floor', floor)

      const query = params.toString()
      const url = `${API}/api/rooms${query ? `?${query}` : ''}`

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.status === 401) {
        window.location.href = '/'
        return
      }

      if (res.status === 403) {
        setError('Bạn không có quyền quản lý phòng.')
        setRooms([])
        return
      }

      if (!res.ok) {
        throw new Error('Không thể tải danh sách phòng.')
      }

      const data = await res.json()
      setRooms(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách phòng.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBuildings()
  }, [])

  useEffect(() => {
    loadRooms()
  }, [buildingId, floor])

  function openCreate() {
    setEditingRoom(null)

    setForm({
      code: '',
      floor: '',
      area: '',
      rent: '',
      maxPeople: '',
      buildingId: buildingId || '',
    })

    setShowForm(true)
  }

  function openEdit(room: Room) {
    setEditingRoom(room)

    setForm({
      code: room.code,
      floor: String(room.floor),
      area: String(room.area),
      rent: String(room.rent),
      maxPeople: String(room.maxPeople),
      buildingId: String(room.buildingId),
    })

    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingRoom(null)
  }

  async function saveRoom() {
    if (
      !form.code.trim() ||
      !form.floor ||
      !form.area ||
      !form.rent ||
      !form.maxPeople ||
      !form.buildingId
    ) {
      alert('Vui lòng nhập đầy đủ thông tin phòng.')
      return
    }

    const payload = {
      code: form.code.trim(),
      floor: Number(form.floor),
      area: Number(form.area),
      rent: Number(form.rent),
      maxPeople: Number(form.maxPeople),
      buildingId: Number(form.buildingId),
    }

    try {
      const url = editingRoom
        ? `${API}/api/rooms/${editingRoom.id}`
        : `${API}/api/rooms`

      const method = editingRoom ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        window.location.href = '/'
        return
      }

      if (res.status === 403) {
        alert('Bạn không có quyền thực hiện thao tác này.')
        return
      }

      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || 'Không thể lưu phòng.')
      }

      closeForm()
      await loadRooms()
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Không thể lưu phòng.'
      )
    }
  }

  async function changeStatus(room: Room, status: RoomStatus) {
    if (status === room.status) return

    try {
      const res = await fetch(
        `${API}/api/rooms/${room.id}/status`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status }),
        }
      )

      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || 'Không thể cập nhật trạng thái.')
      }

      await loadRooms()
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật trạng thái.'
      )
    }
  }

  const filteredRooms = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    if (!keyword) return rooms

    return rooms.filter((room) =>
      room.code.toLowerCase().includes(keyword)
    )
  }, [rooms, search])
  const emptyBuildings = useMemo(() => {
  return buildings.filter((building) => {
    if ((building.roomCount || 0) > 0) return false

    if (buildingId && String(building.id) !== buildingId) {
      return false
    }

    return true
  })
}, [buildings, buildingId])
  const stats = useMemo(() => {
    return {
      total: filteredRooms.length,
      empty: filteredRooms.filter((r) => r.status === 'EMPTY').length,
      deposited: filteredRooms.filter((r) => r.status === 'DEPOSITED').length,
      rented: filteredRooms.filter((r) => r.status === 'RENTED').length,
    }
  }, [filteredRooms])

  function formatMoney(value: number) {
    return new Intl.NumberFormat('vi-VN').format(value) + ' đ'
  }

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
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
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
              TroRoom / Quản lý
            </div>

            <h1
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: 30,
                fontWeight: 800,
              }}
            >
              Quản lý phòng
            </h1>

            <p
              style={{
                margin: '7px 0 0',
                color: '#64748b',
              }}
            >
              Theo dõi phòng, giá thuê và trạng thái phòng.
            </p>
          </div>

          <button
            onClick={openCreate}
            style={{
              border: 0,
              borderRadius: 12,
              padding: '13px 20px',
              background:
                'linear-gradient(135deg, #2563eb, #4f46e5)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(37,99,235,.2)',
            }}
          >
            + Thêm phòng
          </button>
        </div>

        {/* STATS */}
<div
  style={{
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 16,
    marginBottom: 22,
  }}
>
  <div
    style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 4px 14px rgba(15,23,42,.04)',
    }}
  >
    <div
      style={{
        color: '#64748b',
        fontSize: 14,
        marginBottom: 9,
      }}
    >
      Tổng phòng
    </div>
    <div
      style={{
        color: '#2563eb',
        fontSize: 28,
        fontWeight: 800,
      }}
    >
      {stats.total}
    </div>
  </div>

  <div
    style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 4px 14px rgba(15,23,42,.04)',
    }}
  >
    <div
      style={{
        color: '#64748b',
        fontSize: 14,
        marginBottom: 9,
      }}
    >
      Phòng trống
    </div>
    <div
      style={{
        color: '#16a34a',
        fontSize: 28,
        fontWeight: 800,
      }}
    >
      {stats.empty}
    </div>
  </div>

  <div
    style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 4px 14px rgba(15,23,42,.04)',
    }}
  >
    <div
      style={{
        color: '#64748b',
        fontSize: 14,
        marginBottom: 9,
      }}
    >
      Đã cọc
    </div>
    <div
      style={{
        color: '#d97706',
        fontSize: 28,
        fontWeight: 800,
      }}
    >
      {stats.deposited}
    </div>
  </div>

  <div
    style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 4px 14px rgba(15,23,42,.04)',
    }}
  >
    <div
      style={{
        color: '#64748b',
        fontSize: 14,
        marginBottom: 9,
      }}
    >
      Đang thuê
    </div>
    <div
      style={{
        color: '#7c3aed',
        fontSize: 28,
        fontWeight: 800,
      }}
    >
      {stats.rented}
    </div>
  </div>
</div>

        {/* FILTER */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 18,
            marginBottom: 20,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã phòng..."
            style={{
              flex: '1 1 240px',
              minWidth: 220,
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: '11px 13px',
              outline: 'none',
              fontSize: 14,
            }}
          />

          <select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            style={{
              minWidth: 230,
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: '11px 13px',
              background: '#fff',
              fontSize: 14,
            }}
          >
            <option value="">Tất cả tòa nhà</option>

            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>

          <select
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            style={{
              minWidth: 150,
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: '11px 13px',
              background: '#fff',
              fontSize: 14,
            }}
          >
            <option value="">Tất cả tầng</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((f) => (
              <option key={f} value={f}>
                Tầng {f}
              </option>
            ))}
          </select>
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
              Đang tải danh sách phòng...
            </div>
          ) : filteredRooms.length === 0 && emptyBuildings.length === 0 ? (
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
      🏠
    </div>

    <div
      style={{
        color: '#0f172a',
        fontSize: 18,
        fontWeight: 700,
        marginBottom: 6,
      }}
    >
      Chưa có phòng
    </div>

    <div
      style={{
        color: '#64748b',
        fontSize: 14,
      }}
    >
      Hãy thêm phòng để bắt đầu quản lý.
    </div>
  </div>
) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 950,
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
                      'Mã phòng',
                      'Tòa nhà',
                      'Tầng',
                      'Diện tích',
                      'Giá thuê',
                      'Tối đa',
                      'Trạng thái',
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
                  {filteredRooms.map((room) => {
                    const status = statusColor[room.status]

                    return (
                      <tr
                        key={room.id}
                        style={{
                          borderBottom:
                            '1px solid #f1f5f9',
                        }}
                      >
                        <td
                          style={{
                            padding: '16px',
                            fontWeight: 800,
                            color: '#0f172a',
                          }}
                        >
                          {room.code}
                        </td>

                        <td
                          style={{
                            padding: '16px',
                            color: '#334155',
                          }}
                        >
                          {room.buildingName}
                        </td>

                        <td
                          style={{
                            padding: '16px',
                            color: '#334155',
                          }}
                        >
                          Tầng {room.floor}
                        </td>

                        <td
                          style={{
                            padding: '16px',
                            color: '#334155',
                          }}
                        >
                          {room.area} m²
                        </td>
                          
                        <td
                          style={{
                            padding: '16px',
                            color: '#0f172a',
                            fontWeight: 700,
                          }}
                        >
                          {formatMoney(room.rent)}
                        </td>
                        
                        <td
                          style={{
                            padding: '16px',
                            color: '#334155',
                          }}
                        >
                          {room.maxPeople} người
                        </td>

                        <td style={{ padding: '16px' }}>
                          <select
                          value={room.status}
                          disabled={
                            buildings.find(
                              (building) => building.id === room.buildingId
                            )?.active === false
                          }
                          onChange={(e) =>
                            changeStatus(
                              room,
                              e.target.value as RoomStatus
                            )
                          }
                          style={{
                            border: 0,
                            borderRadius: 999,
                            padding: '7px 11px',
                            background: status.bg,
                            color: status.color,
                            fontWeight: 700,
                            fontSize: 12,
                            cursor:
                              buildings.find(
                                (building) => building.id === room.buildingId
                              )?.active === false
                                ? 'not-allowed'
                                : 'pointer',
                            opacity:
                              buildings.find(
                                (building) => building.id === room.buildingId
                              )?.active === false
                                ? 0.6
                                : 1,
                          }}
                        >
                            {Object.entries(statusLabel).map(
                              ([value, label]) => (
                                <option
                                  key={value}
                                  value={value}
                                >
                                  {label}
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        <td style={{ padding: '16px' }}>
                          <button
                            onClick={() => openEdit(room)}
                            style={{
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              color: '#334155',
                              borderRadius: 9,
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Sửa
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {emptyBuildings.map((building) => (
  <tr
    key={`building-${building.id}`}
    style={{
      borderBottom: '1px solid #f1f5f9',
      background: '#fafafa',
    }}
  >
    <td
      colSpan={7}
      style={{
        padding: '18px 16px',
        color: '#334155',
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 5 }}>
        🏢 {building.name}
      </div>

      <div
        style={{
          color: '#94a3b8',
          fontSize: 13,
        }}
      >
        Chưa có phòng nào
      </div>
    </td>

    <td style={{ padding: '16px' }}>
      <button
        onClick={() => {
          setBuildingId(String(building.id))
          setForm({
            code: '',
            floor: '',
            area: '',
            rent: '',
            maxPeople: '',
            buildingId: String(building.id),
          })
          setEditingRoom(null)
          setShowForm(true)
        }}
        style={{
          border: 0,
          borderRadius: 9,
          padding: '8px 13px',
          background: '#eff6ff',
          color: '#2563eb',
          cursor: 'pointer',
          fontWeight: 700,
        }}
      >
        + Thêm phòng
      </button>
    </td>
  </tr>
))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#fff',
              borderRadius: 20,
              padding: 26,
              boxShadow: '0 25px 70px rgba(15,23,42,.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 22,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: '#0f172a',
                    fontSize: 22,
                  }}
                >
                  {editingRoom
                    ? 'Chỉnh sửa phòng'
                    : 'Thêm phòng mới'}
                </h2>

                <p
                  style={{
                    margin: '5px 0 0',
                    color: '#64748b',
                    fontSize: 14,
                  }}
                >
                  Nhập thông tin phòng bên dưới.
                </p>
              </div>

              <button
                onClick={closeForm}
                style={{
                  border: 0,
                  background: '#f1f5f9',
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 18,
                  color: '#475569',
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',
                gap: 15,
              }}
            >
              <label>
                <div style={labelStyle}>Mã phòng *</div>
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      code: e.target.value,
                    })
                  }
                  placeholder="VD: 101"
                  style={inputStyle}
                />
              </label>

              <label>
                <div style={labelStyle}>Tòa nhà *</div>
                <select
                  value={form.buildingId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      buildingId: e.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Chọn tòa nhà
                  </option>

                  {buildings.map((building) => (
                    <option
                      key={building.id}
                      value={building.id}
                    >
                      {building.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <div style={labelStyle}>Tầng *</div>
                <input
                  type="number"
                  min="1"
                  value={form.floor}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      floor: e.target.value,
                    })
                  }
                  placeholder="VD: 2"
                  style={inputStyle}
                />
              </label>

              <label>
                <div style={labelStyle}>
                  Diện tích (m²) *
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.area}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      area: e.target.value,
                    })
                  }
                  placeholder="VD: 25.5"
                  style={inputStyle}
                />
              </label>

              <label>
                <div style={labelStyle}>
                  Giá thuê (VNĐ) *
                </div>
                <input
                  type="number"
                  min="0"
                  value={form.rent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      rent: e.target.value,
                    })
                  }
                  placeholder="VD: 2500000"
                  style={inputStyle}
                />
              </label>

              <label>
                <div style={labelStyle}>
                  Số người tối đa *
                </div>
                <input
                  type="number"
                  min="1"
                  value={form.maxPeople}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      maxPeople: e.target.value,
                    })
                  }
                  placeholder="VD: 2"
                  style={inputStyle}
                />
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 25,
              }}
            >
              <button
                onClick={closeForm}
                style={{
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  borderRadius: 10,
                  padding: '11px 18px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Hủy
              </button>

              <button
                onClick={saveRoom}
                style={{
                  border: 0,
                  background:
                    'linear-gradient(135deg, #2563eb, #4f46e5)',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '11px 20px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {editingRoom
                  ? 'Lưu thay đổi'
                  : 'Thêm phòng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  color: '#334155',
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 7,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #cbd5e1',
  borderRadius: 10,
  padding: '11px 12px',
  outline: 'none',
  fontSize: 14,
  background: '#fff',
}

export default Rooms