
import { useEffect, useState } from 'react'

type MaintenanceReport = {
  id: number
  reportCode: string
  deviceType: string
  description: string
  urgency: string
  status: string
  managerResponse: string | null
  createdAt: string
  roomId: number | null
  roomCode: string | null
  buildingId: number | null
  buildingName: string | null
  repairCost: number | null
  costPayer: string | null
  tenantInvoicePending: boolean
  invoiceCode: string | null
  invoiceStatus: string | null
  urgentOverdue: boolean
}

const API = 'http://localhost:8080/api/manager/maintenance-reports'

const statusLabels: Record<string, string> = {
  NEW: 'Mới',
  IN_PROGRESS: 'Đang xử lý',
  COMPLETED: 'Đã hoàn tất',
  REJECTED: 'Từ chối',
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function responseMessage(response: Response) {
  const body = await response.text()
  if (!body) return `Yêu cầu thất bại (HTTP ${response.status}).`

  try {
    const parsed = JSON.parse(body) as {
      message?: string
      detail?: string
      error?: string
    }
    return parsed.message || parsed.detail || parsed.error || body
  } catch {
    return body
  }
}

export default function ManagerMaintenanceReports() {
  const [reports, setReports] = useState<MaintenanceReport[]>([])
  const [buildingId, setBuildingId] = useState('')
  const [status, setStatus] = useState('')
  const [urgency, setUrgency] = useState('')
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [costs, setCosts] = useState<Record<number, string>>({})
  const [payers, setPayers] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadReports() {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (buildingId) params.set('buildingId', buildingId)
      if (status) params.set('status', status)
      if (urgency) params.set('urgency', urgency)

      const query = params.toString()
      const response = await fetch(`${API}${query ? `?${query}` : ''}`, {
        headers: authHeaders(),
      })

      if (!response.ok) throw new Error(await responseMessage(response))

      const data = await response.json()
      if (!Array.isArray(data)) {
        throw new Error('Dữ liệu báo hỏng trả về không đúng định dạng.')
      }

      setReports(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải báo hỏng.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReports()
  }, [])

  async function updateStatus(report: MaintenanceReport, nextStatus: string) {
    const note = (notes[report.id] || '').trim()

    if (!note) {
      setError(`Vui lòng nhập ghi chú cho báo hỏng ${report.reportCode}.`)
      return
    }

    setSavingId(report.id)
    setError('')
    setSuccess('')

    try {
      const params = new URLSearchParams({ status: nextStatus, note })
      const response = await fetch(`${API}/${report.id}/status?${params}`, {
        method: 'PATCH',
        headers: authHeaders(),
      })

      if (!response.ok) throw new Error(await responseMessage(response))

      setSuccess(`Đã cập nhật trạng thái ${report.reportCode}.`)
      setNotes((previous) => ({ ...previous, [report.id]: '' }))
      await loadReports()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.')
    } finally {
      setSavingId(null)
    }
  }

  async function updateCost(report: MaintenanceReport) {
    const rawCost = costs[report.id]
    const cost = Number(rawCost)
    const payer = payers[report.id] || report.costPayer || 'LANDLORD'

    if (rawCost === undefined || rawCost.trim() === '' ||
        !Number.isSafeInteger(cost) || cost < 0) {
      setError(`Chi phí của ${report.reportCode} phải là số nguyên không âm.`)
      return
    }

    setSavingId(report.id)
    setError('')
    setSuccess('')

    try {
      const params = new URLSearchParams({
        repairCost: String(cost),
        costPayer: payer,
      })

      const response = await fetch(`${API}/${report.id}/cost?${params}`, {
        method: 'PATCH',
        headers: authHeaders(),
      })

      if (!response.ok) throw new Error(await responseMessage(response))

      setSuccess(`Đã cập nhật chi phí ${report.reportCode}.`)
      await loadReports()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật chi phí.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <main className="manager-maintenance">
      <style>{`
        .manager-maintenance{max-width:1200px;margin:auto;padding:24px;color:#172033}
        .mm-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:18px}
        .mm-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
        .mm-field{display:flex;flex-direction:column;gap:6px}
        .mm-field label{font-weight:650;font-size:14px}
        .mm-field input,.mm-field select{box-sizing:border-box;width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:white}
        .mm-report{border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-top:14px}
        .mm-muted{color:#64748b;font-size:13px}

            .mm-top{
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:12px;
            flex-wrap:wrap;
            }
            .mm-top > .mm-actions{
            margin-top:0;
            align-items:center;
            justify-content:flex-end;
            gap:8px;
            }
            .mm-pill{
            display:inline-flex;
            align-items:center;
            justify-content:center;
            padding:6px 10px;
            border-radius:8px;
            background:#f1f5f9;
            font-size:12px;
            font-weight:700;
            line-height:1.4;
            white-space:nowrap;
            }
            .mm-urgent{
            background:#fee2e2;
            color:#991b1b;
            }

        .mm-overdue{border:2px solid #dc2626;background:#fff7f7}
        .mm-alert{padding:11px 13px;border-radius:8px;margin:12px 0}
        .mm-error{background:#fef2f2;color:#991b1b}
        .mm-success{background:#f0fdf4;color:#166534}
        .mm-button{padding:10px 14px;border:0;border-radius:8px;background:#2563eb;color:white;font-weight:650;cursor:pointer}
        .mm-button:disabled{opacity:.55;cursor:not-allowed}
        .mm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
        .mm-section{border-top:1px solid #e2e8f0;margin-top:16px;padding-top:14px}
        .mm-section h4{margin:0 0 10px}
        .mm-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media(max-width:650px){.manager-maintenance{padding:12px}.mm-card{padding:14px}.mm-filters,.mm-grid{grid-template-columns:1fr}}
      `}</style>

      <header className="mm-card">
        <h1>Quản lý báo hỏng & bảo trì</h1>
        <p className="mm-muted">
          Theo dõi sự cố tại các tòa nhà được phân công, xử lý trạng thái
          và ghi nhận chi phí sửa chữa.
        </p>
      </header>

      <section className="mm-card">
        <h2>Bộ lọc</h2>
        <div className="mm-filters">
          <div className="mm-field">
            <label htmlFor="mm-building">ID tòa nhà</label>
            <input
              id="mm-building"
              type="number"
              min="1"
              value={buildingId}
              onChange={(event) => setBuildingId(event.target.value)}
              placeholder="Để trống để xem tất cả"
            />
          </div>

          <div className="mm-field">
            <label htmlFor="mm-status">Trạng thái</label>
            <select id="mm-status" value={status}
              onChange={(event) => setStatus(event.target.value)}>
              <option value="">Tất cả</option>
              <option value="NEW">Mới</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="COMPLETED">Đã hoàn tất</option>
              <option value="REJECTED">Từ chối</option>
            </select>
          </div>

          <div className="mm-field">
            <label htmlFor="mm-urgency">Mức độ khẩn</label>
            <select id="mm-urgency" value={urgency}
              onChange={(event) => setUrgency(event.target.value)}>
              <option value="">Tất cả</option>
              <option value="URGENT">Gấp</option>
              <option value="NORMAL">Thường</option>
            </select>
          </div>
        </div>

        <div className="mm-actions">
          <button className="mm-button" onClick={() => void loadReports()}
            disabled={loading}>
            {loading ? 'Đang tải…' : 'Áp dụng bộ lọc'}
          </button>
          <button className="mm-button" onClick={() => {
            setBuildingId('')
            setStatus('')
            setUrgency('')
          }}>
            Xóa bộ lọc
          </button>
        </div>
      </section>

      <section className="mm-card">
        <h2>Danh sách báo hỏng ({reports.length})</h2>

        {error && <div className="mm-alert mm-error" role="alert">{error}</div>}
        {success && <div className="mm-alert mm-success" role="status">{success}</div>}

        {loading ? <p>Đang tải danh sách…</p> :
          reports.length === 0 ? <p>Không có báo hỏng phù hợp.</p> :
          reports.map((report) => (
            <article key={report.id}
              className={`mm-report ${report.urgentOverdue ? 'mm-overdue' : ''}`}>
              <div className="mm-top">
                <div>
                  <h3>{report.reportCode} · {report.deviceType}</h3>
                  <div className="mm-muted">
                    Tòa nhà: {report.buildingName || '—'}
                    {' · '}Phòng: {report.roomCode || '—'}
                  </div>
                  <div className="mm-muted">
                    Tạo lúc: {new Date(report.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="mm-actions">
                  <span className={`mm-pill ${report.urgency === 'URGENT' ? 'mm-urgent' : ''}`}>
                    {report.urgency === 'URGENT' ? 'Gấp' : 'Thường'}
                  </span>
                  <span className="mm-pill">
                    {statusLabels[report.status] || report.status}
                  </span>
                </div>
              </div>

              {report.urgentOverdue && (
                <div className="mm-alert mm-error">
                  Cảnh báo: Báo hỏng khẩn cấp chưa được xử lý sau 24 giờ!
                </div>
              )}

              <p style={{ whiteSpace: 'pre-wrap' }}>{report.description}</p>

              <div className="mm-section">
                <h4>Cập nhật trạng thái</h4>
                <div className="mm-field">
                  <label htmlFor={`mm-note-${report.id}`}>Ghi chú bắt buộc</label>
                  <input
                    id={`mm-note-${report.id}`}
                    value={notes[report.id] || ''}
                    maxLength={3000}
                    onChange={(event) => setNotes((previous) => ({
                      ...previous, [report.id]: event.target.value,
                    }))}
                    placeholder="Nhập ghi chú xử lý hoặc lý do từ chối"
                  />
                </div>
                <div className="mm-actions">
                  {report.status === 'NEW' && (
                    <>
                      <button className="mm-button" disabled={savingId === report.id}
                        onClick={() => void updateStatus(report, 'IN_PROGRESS')}>
                        Tiếp nhận xử lý
                      </button>
                      <button className="mm-button" disabled={savingId === report.id}
                        onClick={() => void updateStatus(report, 'REJECTED')}>
                        Từ chối
                      </button>
                    </>
                  )}
                  {report.status === 'IN_PROGRESS' && (
                    <>
                      <button className="mm-button" disabled={savingId === report.id}
                        onClick={() => void updateStatus(report, 'COMPLETED')}>
                        Hoàn tất
                      </button>
                      <button className="mm-button" disabled={savingId === report.id}
                        onClick={() => void updateStatus(report, 'REJECTED')}>
                        Từ chối
                      </button>
                    </>
                  )}
                </div>
                {report.managerResponse && (
                  <p className="mm-muted">
                    Ghi chú gần nhất: {report.managerResponse}
                  </p>
                )}
              </div>

              <div className="mm-section">
                <h4>Chi phí sửa chữa</h4>
                <div className="mm-grid">
                  <div className="mm-field">
                    <label htmlFor={`mm-cost-${report.id}`}>Chi phí (VNĐ)</label>
                    <input
                      id={`mm-cost-${report.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={costs[report.id] ?? (report.repairCost == null ? '' : String(report.repairCost))}
                      onChange={(event) => setCosts((previous) => ({
                        ...previous, [report.id]: event.target.value,
                      }))}
                      placeholder="Nhập số tiền"
                    />
                  </div>
                  <div className="mm-field">
                    <label htmlFor={`mm-payer-${report.id}`}>Người chịu phí</label>
                    <select
                      id={`mm-payer-${report.id}`}
                      value={payers[report.id] || report.costPayer || 'LANDLORD'}
                      onChange={(event) => setPayers((previous) => ({
                        ...previous, [report.id]: event.target.value,
                      }))}
                    >
                      <option value="LANDLORD">Chủ nhà</option>
                      <option value="TENANT">Khách thuê</option>
                    </select>
                  </div>
                </div>
                {report.tenantInvoicePending && (
                  <p className="mm-muted">
                    Chi phí đang được đánh dấu chờ đưa vào hóa đơn khách thuê.
                  </p>
                )}
                {report.invoiceCode && (
                <p className="mm-muted">
                    Hóa đơn: {report.invoiceCode}
                    {' · '}Trạng thái: {report.invoiceStatus || 'Chưa xác định'}
                </p>
                )}
                <div className="mm-actions">
                  <button className="mm-button" disabled={savingId === report.id}
                    onClick={() => void updateCost(report)}>
                    {savingId === report.id ? 'Đang lưu…' : 'Lưu chi phí'}
                  </button>
                </div>
              </div>
            </article>
          ))}
      </section>
    </main>
  )
}
