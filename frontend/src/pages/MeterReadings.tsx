import { useCallback, useEffect, useMemo, useState } from 'react'

const API = 'http://localhost:8080'

type BuildingItem = { id: number; name: string; address: string }

type RoomItem = {
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
}

type ListResponse = {
  buildingId: number
  period: string
  total: number
  recorded: number
  remaining: number
  rooms: RoomItem[]
}

type Warning = { field: string; message: string }

type Draft = { electricity: string; water: string }

type RowState = {
  saving?: boolean
  error?: string
  fieldErrors?: { electricity?: string; water?: string }
  warnings?: Warning[]
  savedNote?: string
}

function currentPeriod() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

export default function MeterReadings() {
  const token = localStorage.getItem('accessToken')
  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token]
  )

  const [buildings, setBuildings] = useState<BuildingItem[]>([])
  const [buildingId, setBuildingId] = useState<number | null>(null)
  const [period, setPeriod] = useState(currentPeriod())
  const [data, setData] = useState<ListResponse | null>(null)
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [rows, setRows] = useState<Record<number, RowState>>({})
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Tải danh sách toà nhà được phụ trách
  useEffect(() => {
    async function loadBuildings() {
      try {
        const res = await fetch(`${API}/api/manager/meter-readings/buildings`, { headers })
        if (!res.ok) throw new Error('Không thể tải danh sách toà nhà')
        const list: BuildingItem[] = await res.json()
        setBuildings(list)
        if (list.length > 0) setBuildingId(list[0].id)
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Có lỗi xảy ra')
      } finally {
        setLoading(false)
      }
    }
    loadBuildings()
  }, [headers])

  const loadRooms = useCallback(async () => {
    if (buildingId === null) return
    try {
      const res = await fetch(
        `${API}/api/manager/meter-readings?buildingId=${buildingId}&period=${period}`,
        { headers }
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.message || 'Không thể tải danh sách phòng')
      const list = body as ListResponse
      setLoadError('')
      setData(list)
      const next: Record<number, Draft> = {}
      list.rooms.forEach((r) => {
        next[r.contractId] = {
          electricity: r.electricity === null ? '' : String(r.electricity),
          water: r.water === null ? '' : String(r.water),
        }
      })
      setDrafts(next)
      setRows({})
    } catch (e) {
      setData(null)
      setLoadError(e instanceof Error ? e.message : 'Có lỗi xảy ra')
    }
  }, [buildingId, period, headers])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  function setDraft(contractId: number, field: 'electricity' | 'water', value: string) {
    // Chỉ cho nhập chữ số
    const digits = value.replace(/\D/g, '')
    setDrafts((prev) => ({
      ...prev,
      [contractId]: { ...prev[contractId], [field]: digits },
    }))
    setRows((prev) => ({
      ...prev,
      [contractId]: { ...prev[contractId], fieldErrors: undefined, error: undefined, warnings: undefined, savedNote: undefined },
    }))
  }

  function patchRow(contractId: number, patch: RowState) {
    setRows((prev) => ({ ...prev, [contractId]: { ...prev[contractId], ...patch } }))
  }

  async function save(room: RoomItem, confirm: boolean) {
    const draft = drafts[room.contractId]
    const eText = draft?.electricity ?? ''
    const wText = draft?.water ?? ''

    // Kiểm tra ngay tại dòng trước khi gọi API
    const fieldErrors: { electricity?: string; water?: string } = {}
    if (eText === '') fieldErrors.electricity = 'Vui lòng nhập chỉ số điện'
    else if (Number(eText) < room.prevElectricity)
      fieldErrors.electricity = `Chỉ số điện không được nhỏ hơn kỳ trước (${room.prevElectricity})`
    if (wText === '') fieldErrors.water = 'Vui lòng nhập chỉ số nước'
    else if (Number(wText) < room.prevWater)
      fieldErrors.water = `Chỉ số nước không được nhỏ hơn kỳ trước (${room.prevWater})`

    if (fieldErrors.electricity || fieldErrors.water) {
      patchRow(room.contractId, { fieldErrors, warnings: undefined, error: undefined })
      return
    }

    patchRow(room.contractId, { saving: true, error: undefined, fieldErrors: undefined })

    try {
      const res = await fetch(`${API}/api/manager/meter-readings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contractId: room.contractId,
          period,
          electricity: Number(eText),
          water: Number(wText),
          confirm,
        }),
      })
      const body = await res.json().catch(() => ({}))

      if (res.ok) {
        const updated: RoomItem = body.room
        setData((prev) =>
          prev
            ? {
                ...prev,
                total: body.total,
                recorded: body.recorded,
                remaining: body.remaining,
                rooms: prev.rooms.map((r) => (r.contractId === updated.contractId ? updated : r)),
              }
            : prev
        )
        patchRow(room.contractId, {
          saving: false,
          warnings: undefined,
          savedNote: 'Đã lưu',
        })
        return
      }

      if (res.status === 409 && body.code === 'CONSUMPTION_WARNING') {
        patchRow(room.contractId, { saving: false, warnings: body.warnings as Warning[] })
        return
      }

      if (res.status === 400 && body.fields) {
        patchRow(room.contractId, { saving: false, fieldErrors: body.fields })
        return
      }

      patchRow(room.contractId, {
        saving: false,
        error: body.message || 'Không thể lưu chỉ số',
      })
    } catch {
      patchRow(room.contractId, { saving: false, error: 'Không kết nối được máy chủ' })
    }
  }

  const visibleRooms = useMemo(() => {
    if (!data) return []
    return onlyMissing ? data.rooms.filter((r) => !r.recorded) : data.rooms
  }, [data, onlyMissing])

  const percent = data && data.total > 0 ? Math.round((data.recorded / data.total) * 100) : 0

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>

  return (
    <div className="mr-page">
      <h1 className="mr-title">Ghi chỉ số điện nước</h1>

      {buildings.length === 0 ? (
        <div className="mr-empty">Bạn chưa được giao phụ trách toà nhà nào.</div>
      ) : (
        <>
          <div className="mr-filters">
            <label>
              Toà nhà
              <select
                value={buildingId ?? ''}
                onChange={(e) => setBuildingId(Number(e.target.value))}
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kỳ ghi
              <input
                type="month"
                value={period}
                onChange={(e) => e.target.value && setPeriod(e.target.value)}
              />
            </label>
          </div>

          {loadError && <div className="mr-error">{loadError}</div>}

          {data && (
            <>
              <div className="mr-progress">
                <div className="mr-progress-text">
                  <strong>Còn {data.remaining}</strong> / {data.total} phòng chưa nhập
                </div>
                <div className="mr-bar">
                  <div className="mr-bar-fill" style={{ width: `${percent}%` }} />
                </div>
                <label className="mr-toggle">
                  <input
                    type="checkbox"
                    checked={onlyMissing}
                    onChange={(e) => setOnlyMissing(e.target.checked)}
                  />
                  Chỉ hiện phòng chưa nhập
                </label>
              </div>

              {visibleRooms.length === 0 && (
                <div className="mr-empty">
                  {data.total === 0
                    ? 'Toà này chưa có phòng đang thuê trong kỳ này.'
                    : 'Đã nhập đủ chỉ số cho tất cả các phòng.'}
                </div>
              )}

              {visibleRooms.map((room) => {
                const draft = drafts[room.contractId] ?? { electricity: '', water: '' }
                const st = rows[room.contractId] ?? {}
                return (
                  <div
                    key={room.contractId}
                    className={`mr-card ${room.recorded ? 'mr-done' : ''}`}
                  >
                    <div className="mr-card-head">
                      <div>
                        <div className="mr-room">Phòng {room.roomCode}</div>
                        <div className="mr-sub">
                          Tầng {room.floor} · {room.tenantName}
                        </div>
                      </div>
                      <span className={`mr-badge ${room.recorded ? 'ok' : 'todo'}`}>
                        {room.recorded ? 'Đã chốt' : 'Chưa chốt'}
                      </span>
                    </div>

                    <div className="mr-inputs">
                      <label>
                        Điện (kỳ trước: {room.prevElectricity})
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={draft.electricity}
                          onChange={(e) => setDraft(room.contractId, 'electricity', e.target.value)}
                          className={st.fieldErrors?.electricity ? 'invalid' : ''}
                          placeholder="Chỉ số mới"
                        />
                        {st.fieldErrors?.electricity && (
                          <span className="mr-field-error">{st.fieldErrors.electricity}</span>
                        )}
                      </label>
                      <label>
                        Nước (kỳ trước: {room.prevWater})
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={draft.water}
                          onChange={(e) => setDraft(room.contractId, 'water', e.target.value)}
                          className={st.fieldErrors?.water ? 'invalid' : ''}
                          placeholder="Chỉ số mới"
                        />
                        {st.fieldErrors?.water && (
                          <span className="mr-field-error">{st.fieldErrors.water}</span>
                        )}
                      </label>
                    </div>

                    {st.warnings && st.warnings.length > 0 && (
                      <div className="mr-warning">
                        {st.warnings.map((w) => (
                          <div key={w.field}>⚠ {w.message}</div>
                        ))}
                        <div className="mr-warning-actions">
                          <button
                            type="button"
                            className="mr-btn-confirm"
                            disabled={st.saving}
                            onClick={() => save(room, true)}
                          >
                            Xác nhận và lưu
                          </button>
                          <button
                            type="button"
                            className="mr-btn-cancel"
                            onClick={() => patchRow(room.contractId, { warnings: undefined })}
                          >
                            Sửa lại
                          </button>
                        </div>
                      </div>
                    )}

                    {st.error && <div className="mr-error">{st.error}</div>}
                    {st.savedNote && <div className="mr-saved">✓ {st.savedNote}</div>}

                    {!(st.warnings && st.warnings.length > 0) && (
                      <button
                        type="button"
                        className="mr-btn-save"
                        disabled={st.saving}
                        onClick={() => save(room, false)}
                      >
                        {st.saving ? 'Đang lưu...' : room.recorded ? 'Cập nhật' : 'Lưu phòng này'}
                      </button>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </>
      )}

      <style>{`
        .mr-page { max-width: 720px; margin: 0 auto; padding: 16px; box-sizing: border-box; }
        .mr-title { font-size: 22px; margin: 0 0 14px; }
        .mr-filters { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        .mr-filters label, .mr-inputs label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #475569; font-weight: 600; }
        .mr-filters select, .mr-filters input, .mr-inputs input { height: 46px; padding: 0 12px; font-size: 16px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; box-sizing: border-box; width: 100%; }
        .mr-inputs input.invalid { border-color: #dc2626; background: #fef2f2; }
        .mr-progress { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-bottom: 14px; }
        .mr-progress-text { font-size: 15px; margin-bottom: 8px; }
        .mr-bar { height: 8px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
        .mr-bar-fill { height: 100%; background: linear-gradient(90deg,#2563eb,#4f46e5); transition: width .3s; }
        .mr-toggle { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 14px; }
        .mr-toggle input { width: 18px; height: 18px; }
        .mr-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 12px; }
        .mr-card.mr-done { border-color: #86efac; }
        .mr-card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .mr-room { font-size: 18px; font-weight: 800; }
        .mr-sub { font-size: 13px; color: #64748b; margin-top: 2px; }
        .mr-badge { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 99px; white-space: nowrap; }
        .mr-badge.ok { background: #dcfce7; color: #166534; }
        .mr-badge.todo { background: #fef3c7; color: #92400e; }
        .mr-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .mr-field-error { color: #dc2626; font-size: 12px; font-weight: 500; }
        .mr-warning { margin-top: 12px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 10px; font-size: 14px; color: #92400e; }
        .mr-warning-actions { display: flex; gap: 8px; margin-top: 10px; }
        .mr-btn-save, .mr-btn-confirm, .mr-btn-cancel { min-height: 46px; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; }
        .mr-btn-save { width: 100%; margin-top: 12px; background: linear-gradient(135deg,#2563eb,#4f46e5); color: #fff; }
        .mr-btn-confirm { flex: 1; background: #d97706; color: #fff; }
        .mr-btn-cancel { flex: 1; background: #e2e8f0; color: #334155; }
        .mr-btn-save:disabled, .mr-btn-confirm:disabled { opacity: .6; cursor: default; }
        .mr-error { margin-top: 10px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 8px 10px; font-size: 14px; }
        .mr-saved { margin-top: 10px; color: #166534; font-size: 14px; font-weight: 600; }
        .mr-empty { background: #fff; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; color: #64748b; }
        @media (max-width: 400px) {
          .mr-page { padding: 10px; }
          .mr-filters { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
