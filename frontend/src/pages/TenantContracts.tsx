import { useCallback, useEffect, useMemo, useState } from 'react'

type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'NOT_STARTED' | string

type ContractListItem = {
  id: number
  contractCode: string
  roomCode: string
  buildingName: string
  rent: number
  deposit: number
  startDate: string
  endDate: string
  daysRemaining: number
  expiringSoon: boolean
  status: ContractStatus
}

type ContractPerson = {
  role: string
  fullName: string
  phone: string
  citizenId?: string | null
  startDate: string
  endDate?: string | null
}

type ContractService = {
  id: number
  name: string
  calculationMethod: string
  unit: string
  price: number
  active: boolean
}

type ContractDetail = ContractListItem & {
  roomArea: number
  maxPeople: number
  buildingAddress: string
  tenantName: string
  termMonths: number
  billingCutoffDay: number
  initialElectricity?: number | null
  initialWater?: number | null
  createdAt?: string
  people: ContractPerson[]
  services: ContractService[]
}

const API = 'http://localhost:8080/api/tenant/contracts'

const money = (amount?: number | null) =>
  amount == null ? '—' : `${Number(amount).toLocaleString('vi-VN')} đ`

function formatDate(value?: string | null) {
  if (!value) return '—'
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

function statusLabel(status: ContractStatus) {
  switch (status) {
    case 'ACTIVE': return 'Đang hiệu lực'
    case 'EXPIRED': return 'Đã hết hạn'
    case 'NOT_STARTED': return 'Chưa bắt đầu'
    default: return status || 'Không xác định'
  }
}

function serviceMethodLabel(method: string) {
  switch (method) {
    case 'BY_METER': return 'Theo chỉ số'
    case 'BY_PERSON': return 'Theo đầu người'
    case 'FIXED_ROOM': return 'Cố định phòng'
    default: return method || '—'
  }
}

async function responseError(response: Response): Promise<string> {
  const body = await response.text()
  if (!body) {
    if (response.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (response.status === 403) return 'Tài khoản này không có quyền xem hợp đồng.'
    return `Yêu cầu thất bại (HTTP ${response.status}).`
  }
  try {
    const parsed = JSON.parse(body) as { message?: string; detail?: string; error?: string }
    return parsed.message || parsed.detail || parsed.error || body
  } catch {
    return body
  }
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function TenantContracts() {
  const [contracts, setContracts] = useState<ContractListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ContractDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const loadContracts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(API, { headers: authHeaders() })
      if (!response.ok) throw new Error(await responseError(response))
      const data: unknown = await response.json()
      setContracts(Array.isArray(data) ? data as ContractListItem[] : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách hợp đồng.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadContracts()
  }, [loadContracts])

  const visibleContracts = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN')
    if (!keyword) return contracts
    return contracts.filter((contract) =>
      [contract.contractCode, contract.roomCode, contract.buildingName, statusLabel(contract.status)]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase('vi-VN').includes(keyword)),
    )
  }, [contracts, search])

  const openDetails = async (id: number) => {
    setSelectedId(id)
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      const response = await fetch(`${API}/${id}`, { headers: authHeaders() })
      if (!response.ok) throw new Error(await responseError(response))
      setDetail(await response.json() as ContractDetail)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Không tải được chi tiết hợp đồng.')
    } finally {
      setDetailLoading(false)
    }
  }

  const downloadPdf = async () => {
    if (!detail || downloading) return
    setDownloading(true)
    setDetailError('')
    try {
      const response = await fetch(`${API}/${detail.id}/pdf`, { headers: authHeaders() })
      if (!response.ok) throw new Error(await responseError(response))
      const blob = await response.blob()
      if (blob.type && !blob.type.toLowerCase().includes('pdf')) {
        throw new Error('Máy chủ không trả về tệp PDF hợp lệ.')
      }
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `hop-dong-${(detail.contractCode || String(detail.id)).replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Không tải được PDF hợp đồng.')
    } finally {
      setDownloading(false)
    }
  }

  const downloadSettlementPdf = async () => {
    if (!detail || downloading) return
    setDownloading(true)
    setDetailError('')
    try {
      const response = await fetch(`http://localhost:8080/api/checkout/${detail.id}/pdf`, { headers: authHeaders() })
      if (!response.ok) throw new Error(await responseError(response))
      const blob = await response.blob()
      if (blob.type && !blob.type.toLowerCase().includes('pdf')) {
        throw new Error('Máy chủ không trả về tệp PDF hợp lệ.')
      }
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `tat-toan-${(detail.contractCode || String(detail.id)).replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Không tải được bảng tất toán (hợp đồng có thể chưa được tất toán).')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <main className="tenant-contracts-page">
      <style>{`
        .tenant-contracts-page{padding:24px;color:#0f172a;max-width:1440px;margin:0 auto}
        .tc-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px}
        .tc-header h1{font-size:26px;line-height:1.25;margin:0 0 8px;font-weight:800}
        .tc-subtitle{color:#64748b;margin:0;line-height:1.55}
        .tc-search{box-sizing:border-box;width:min(100%,360px);padding:11px 12px;border:1px solid #cbd5e1;border-radius:10px;font:inherit;background:#fff}
        .tc-layout{display:grid;grid-template-columns:minmax(280px,0.9fr) minmax(0,1.35fr);gap:18px;align-items:start}
        .tc-panel{background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 2px 8px rgba(15,23,42,.035);overflow:hidden;min-width:0}
        .tc-panel-heading{padding:16px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:10px}
        .tc-panel-heading h2{font-size:16px;margin:0;font-weight:750}
        .tc-contract-list{display:flex;flex-direction:column}
        .tc-contract-option{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #edf2f7;padding:16px 18px;background:#fff;cursor:pointer;color:inherit}
        .tc-contract-option:last-child{border-bottom:0}
        .tc-contract-option:hover{background:#f8fafc}
        .tc-contract-option.is-selected{background:#eff6ff;box-shadow:inset 3px 0 #2563eb}
        .tc-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        .tc-code{font-weight:800;color:#1d4ed8;overflow-wrap:anywhere}
        .tc-muted{color:#64748b;font-size:13px;line-height:1.5}
        .tc-amount{font-weight:750;white-space:nowrap}
        .tc-status{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 9px;font-size:12px;font-weight:750;white-space:nowrap;background:#f1f5f9;color:#475569}
        .tc-status-active{background:#dcfce7;color:#166534}.tc-status-expired{background:#fee2e2;color:#991b1b}.tc-status-not-started{background:#dbeafe;color:#1d4ed8}
        .tc-warning{padding:12px 14px;border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;border-radius:10px;line-height:1.5;margin:14px 0}
        .tc-error{padding:12px 14px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:10px;line-height:1.5;margin:12px 0}
        .tc-empty{padding:24px;text-align:center;color:#64748b;line-height:1.6}
        .tc-detail-body{padding:18px}
        .tc-section{margin-top:22px}.tc-section:first-child{margin-top:0}
        .tc-section h3{margin:0 0 12px;font-size:14px;font-weight:800;color:#334155}
        .tc-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .tc-metric{padding:12px;border:1px solid #e2e8f0;border-radius:10px;min-width:0}
        .tc-metric-label{font-size:12px;color:#64748b;margin-bottom:5px}
        .tc-metric-value{font-weight:750;overflow-wrap:anywhere}
        .tc-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px}
        .tc-info-label{font-size:12px;color:#64748b;margin-bottom:3px}.tc-info-value{font-weight:650;overflow-wrap:anywhere}
        .tc-table-wrap{width:100%;overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px}
        .tc-table{width:100%;border-collapse:collapse;font-size:13px;min-width:500px}
        .tc-table th,.tc-table td{padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}
        .tc-table th{background:#f8fafc;color:#475569;font-weight:750;white-space:nowrap}
        .tc-table tr:last-child td{border-bottom:0}
        .tc-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border:1px solid #2563eb;border-radius:9px;background:#2563eb;color:#fff;font-size:14px;font-weight:750;cursor:pointer;text-decoration:none}
        .tc-button:disabled{opacity:.55;cursor:not-allowed}.tc-button-secondary{border-color:#cbd5e1;color:#334155;background:#fff}
        @media(max-width:900px){.tc-layout{grid-template-columns:1fr}.tenant-contracts-page{padding:16px}.tc-contract-list{max-height:390px;overflow-y:auto}}
        @media(max-width:520px){.tc-header h1{font-size:22px}.tc-metrics,.tc-info-grid{grid-template-columns:1fr}.tc-detail-body{padding:14px}.tc-panel-heading{padding:14px}.tc-contract-option{padding:14px}}
      `}</style>

      <header className="tc-header">
        <div>
          <h1>Hợp đồng của tôi</h1>
          <p className="tc-subtitle">Xem thông tin hợp đồng thuê phòng, người ở cùng, dịch vụ và tải bản PDF.</p>
        </div>
        <input
          className="tc-search"
          aria-label="Tìm hợp đồng"
          placeholder="Tìm theo mã hợp đồng, phòng, tòa nhà..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </header>

      {error && <p className="tc-error" role="alert">{error}</p>}

      <div className="tc-layout">
        <section className="tc-panel" aria-labelledby="tc-list-title">
          <div className="tc-panel-heading">
            <h2 id="tc-list-title">Danh sách hợp đồng</h2>
            <span className="tc-muted">{contracts.length} hợp đồng</span>
          </div>
          {loading ? (
            <div className="tc-empty" role="status">Đang tải danh sách hợp đồng...</div>
          ) : visibleContracts.length === 0 ? (
            <div className="tc-empty">
              {contracts.length === 0 ? 'Bạn chưa có hợp đồng được liên kết với tài khoản này.' : 'Không tìm thấy hợp đồng phù hợp.'}
            </div>
          ) : (
            <div className="tc-contract-list">
              {visibleContracts.map((contract) => (
                <button
                  type="button"
                  key={contract.id}
                  className={`tc-contract-option${selectedId === contract.id ? ' is-selected' : ''}`}
                  onClick={() => void openDetails(contract.id)}
                  aria-pressed={selectedId === contract.id}
                >
                  <div className="tc-row">
                    <span className="tc-code">{contract.contractCode || `Hợp đồng #${contract.id}`}</span>
                    <span className={`tc-status ${contract.status === 'ACTIVE' ? 'tc-status-active' : contract.status === 'EXPIRED' ? 'tc-status-expired' : contract.status === 'NOT_STARTED' ? 'tc-status-not-started' : ''}`}>
                      {statusLabel(contract.status)}
                    </span>
                  </div>
                  <div style={{ marginTop: 7, fontWeight: 650 }}>{contract.buildingName || 'Tòa nhà'} · Phòng {contract.roomCode || '—'}</div>
                  <div className="tc-row" style={{ marginTop: 8 }}>
                    <span className="tc-muted">{formatDate(contract.startDate)} – {formatDate(contract.endDate)}</span>
                    <span className="tc-amount">{money(contract.rent)}/tháng</span>
                  </div>
                  {contract.expiringSoon && contract.status === 'ACTIVE' && (
                    <div className="tc-warning" style={{ marginBottom: 0, marginTop: 10, padding: '8px 10px', fontSize: 12 }}>
                      Sắp hết hạn: còn {contract.daysRemaining} ngày.
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="tc-panel" aria-labelledby="tc-detail-title" aria-live="polite">
          <div className="tc-panel-heading">
            <h2 id="tc-detail-title">Chi tiết hợp đồng</h2>
            {detail && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="tc-button tc-button-secondary" onClick={() => void downloadSettlementPdf()} disabled={downloading}>
                  {downloading ? 'Đang tạo PDF...' : 'Bảng tất toán'}
                </button>
                <button type="button" className="tc-button" onClick={() => void downloadPdf()} disabled={downloading}>
                  {downloading ? 'Đang tạo PDF...' : 'Tải bản PDF'}
                </button>
              </div>
            )}
          </div>

          {detailLoading ? (
            <div className="tc-empty" role="status">Đang tải chi tiết hợp đồng...</div>
          ) : detailError && !detail ? (
            <div className="tc-detail-body"><p className="tc-error" role="alert">{detailError}</p></div>
          ) : !detail ? (
            <div className="tc-empty">Chọn một hợp đồng ở danh sách để xem thông tin chi tiết và tải PDF.</div>
          ) : (
            <div className="tc-detail-body">
              {detailError && <p className="tc-error" role="alert">{detailError}</p>}
              {detail.expiringSoon && detail.status === 'ACTIVE' && (
                <div className="tc-warning" role="status">
                  <strong>Hợp đồng sắp hết hạn.</strong> Còn {detail.daysRemaining} ngày đến ngày {formatDate(detail.endDate)}. Vui lòng liên hệ chủ nhà để trao đổi gia hạn.
                </div>
              )}
              {detail.status === 'EXPIRED' && (
                <div className="tc-error" role="status">Hợp đồng đã hết hạn vào ngày {formatDate(detail.endDate)}.</div>
              )}

              <section className="tc-section">
                <h3>Thông tin hợp đồng</h3>
                <div className="tc-info-grid">
                  <div><div className="tc-info-label">Mã hợp đồng</div><div className="tc-info-value">{detail.contractCode || `#${detail.id}`}</div></div>
                  <div><div className="tc-info-label">Người đứng tên</div><div className="tc-info-value">{detail.tenantName || '—'}</div></div>
                  <div><div className="tc-info-label">Tòa nhà / phòng</div><div className="tc-info-value">{detail.buildingName || '—'} · {detail.roomCode || '—'}</div></div>
                  <div><div className="tc-info-label">Địa chỉ</div><div className="tc-info-value">{detail.buildingAddress || '—'}</div></div>
                  <div><div className="tc-info-label">Ngày bắt đầu</div><div className="tc-info-value">{formatDate(detail.startDate)}</div></div>
                  <div><div className="tc-info-label">Ngày kết thúc</div><div className="tc-info-value">{formatDate(detail.endDate)}</div></div>
                  <div><div className="tc-info-label">Kỳ hạn</div><div className="tc-info-value">{detail.termMonths} tháng</div></div>
                  <div><div className="tc-info-label">Ngày chốt hóa đơn</div><div className="tc-info-value">Ngày {detail.billingCutoffDay} hằng tháng</div></div>
                  <div><div className="tc-info-label">Chỉ số điện đầu kỳ</div><div className="tc-info-value">{detail.initialElectricity ?? '—'}</div></div>
                  <div><div className="tc-info-label">Chỉ số nước đầu kỳ</div><div className="tc-info-value">{detail.initialWater ?? '—'}</div></div>
                </div>
                <div className="tc-metrics" style={{ marginTop: 14 }}>
                  <div className="tc-metric"><div className="tc-metric-label">Giá thuê</div><div className="tc-metric-value">{money(detail.rent)} / tháng</div></div>
                  <div className="tc-metric"><div className="tc-metric-label">Tiền cọc</div><div className="tc-metric-value">{money(detail.deposit)}</div></div>
                  <div className="tc-metric"><div className="tc-metric-label">Diện tích phòng</div><div className="tc-metric-value">{detail.roomArea} m²</div></div>
                  <div className="tc-metric"><div className="tc-metric-label">Sức chứa tối đa</div><div className="tc-metric-value">{detail.maxPeople} người</div></div>
                </div>
              </section>

              <section className="tc-section">
                <h3>Người ở trong thời hạn hợp đồng</h3>
                {!detail.people?.length ? <p className="tc-muted">Chưa có dữ liệu người ở.</p> : (
                  <div className="tc-table-wrap">
                    <table className="tc-table">
                      <thead><tr><th>Vai trò</th><th>Họ tên</th><th>Số điện thoại</th><th>Bắt đầu ở</th><th>Chuyển đi</th></tr></thead>
                      <tbody>{detail.people.map((person, index) => (
                        <tr key={`${person.role}-${person.phone}-${person.startDate}-${index}`}>
                          <td>{person.role}</td><td>{person.fullName}</td><td>{person.phone || '—'}</td><td>{formatDate(person.startDate)}</td><td>{formatDate(person.endDate)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="tc-section">
                <h3>Dịch vụ và đơn giá</h3>
                {!detail.services?.length ? <p className="tc-muted">Chưa có dịch vụ gắn với phòng.</p> : (
                  <div className="tc-table-wrap">
                    <table className="tc-table">
                      <thead><tr><th>Dịch vụ</th><th>Cách tính</th><th>Đơn vị</th><th>Đơn giá</th></tr></thead>
                      <tbody>{detail.services.map((service) => (
                        <tr key={service.id}>
                          <td>{service.name}{service.active === false ? ' (ngừng áp dụng)' : ''}</td><td>{serviceMethodLabel(service.calculationMethod)}</td><td>{service.unit || '—'}</td><td>{money(service.price)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
                <p className="tc-muted" style={{ marginTop: 8 }}>Đơn giá hiển thị theo cấu hình dịch vụ hiện đang lưu cho phòng.</p>
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
