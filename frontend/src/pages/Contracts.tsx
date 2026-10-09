import { useEffect, useMemo, useState } from 'react'

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
  status: 'ACTIVE' | 'EXPIRED' | 'NOT_STARTED' | string
}

type ContractPerson = {
  role: string
  fullName: string
  phone: string
  citizenId: string | null
  startDate: string
  endDate: string | null
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
  initialElectricity: number | null
  initialWater: number | null
  createdAt: string
  people: ContractPerson[]
  services: ContractService[]
}

const API = 'http://localhost:8080'

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`
}

function formatDate(value: string | null) {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('vi-VN')
}

function statusLabel(status: ContractListItem['status']) {
  if (status === 'ACTIVE') return 'Đang hiệu lực'
  if (status === 'EXPIRED') return 'Đã hết hạn'
  if (status === 'NOT_STARTED') return 'Chưa bắt đầu'
  return status
}

function calculationLabel(method: string) {
  if (method === 'BY_METER') return 'Theo chỉ số'
  if (method === 'BY_PERSON') return 'Theo đầu người'
  if (method === 'FIXED_ROOM') return 'Cố định phòng'
  return method
}

function Contracts() {
  const [contracts, setContracts] = useState<ContractListItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState(false)

  const token = localStorage.getItem('accessToken')

  async function loadContracts() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/tenant/contracts`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401) {
        localStorage.clear()
        window.location.href = '/login'
        return
      }
      if (res.status === 403) {
        window.location.href = '/403'
        return
      }
      if (!res.ok) throw new Error('Không thể tải danh sách hợp đồng.')

      const data: ContractListItem[] = await res.json()
      setContracts(data)
      if (data.length && selectedId === null) {
        setSelectedId(data[0].id)
      }
      if (!data.length) {
        setSelectedId(null)
        setDetail(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách hợp đồng.')
    } finally {
      setLoading(false)
    }
  }

  async function loadDetail(id: number) {
    setSelectedId(id)
    setDetailLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/tenant/contracts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        localStorage.clear()
        window.location.href = '/login'
        return
      }
      if (res.status === 403) {
        window.location.href = '/403'
        return
      }
      if (!res.ok) throw new Error('Không thể tải chi tiết hợp đồng.')
      const data: ContractDetail = await res.json()
      setDetail(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết hợp đồng.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function downloadPdf() {
    if (!selectedId) return
    setDownloading(true)
    try {
      const res = await fetch(`${API}/api/tenant/contracts/${selectedId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        localStorage.clear()
        window.location.href = '/login'
        return
      }
      if (res.status === 403) {
        window.location.href = '/403'
        return
      }
      if (!res.ok) throw new Error('Không thể tải PDF hợp đồng.')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `hop-dong-${detail?.contractCode || selectedId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể tải PDF hợp đồng.')
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    loadContracts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedId !== null) loadDetail(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const filteredContracts = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return contracts
    return contracts.filter((item) =>
      `${item.contractCode} ${item.roomCode} ${item.buildingName}`
        .toLowerCase()
        .includes(keyword),
    )
  }, [contracts, search])

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>TroRoom / Khách thuê</div>
            <h1 style={titleStyle}>Hợp đồng của tôi</h1>
            <p style={subtitleStyle}>
              Xem lại điều khoản hợp đồng và tải bản PDF để lưu hoặc đối chiếu.
            </p>
          </div>
          {detail && (
            <button style={primaryButtonStyle} onClick={downloadPdf} disabled={downloading}>
              {downloading ? 'Đang tạo PDF...' : 'Tải bản PDF'}
            </button>
          )}
        </div>

        {error && <div style={errorBoxStyle}>{error}</div>}

        <div style={gridStyle}>
          <section style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <div style={sectionTitleStyle}>Danh sách hợp đồng</div>
                <div style={sectionHintStyle}>{contracts.length} hợp đồng</div>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã, phòng, tòa nhà..."
                style={searchStyle}
              />
            </div>

            {loading ? (
              <div style={emptyStyle}>Đang tải hợp đồng...</div>
            ) : filteredContracts.length === 0 ? (
              <div style={emptyStyle}>
                {contracts.length ? 'Không có hợp đồng phù hợp.' : 'Bạn chưa có hợp đồng nào.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {filteredContracts.map((item) => {
                  const selected = item.id === selectedId
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      style={{
                        ...contractItemStyle,
                        borderColor: selected ? '#2563eb' : '#e2e8f0',
                        background: selected ? '#eff6ff' : '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.contractCode}</div>
                          <div style={{ marginTop: 4, color: '#475569', fontSize: 13 }}>
                            Phòng {item.roomCode} · {item.buildingName}
                          </div>
                        </div>
                        <span style={statusPill(item)}>{statusLabel(item.status)}</span>
                      </div>
                      <div style={metaGridStyle}>
                        <span>Giá thuê: <b>{formatMoney(item.rent)}</b></span>
                        <span>Tiền cọc: <b>{formatMoney(item.deposit)}</b></span>
                        <span>{formatDate(item.startDate)} → {formatDate(item.endDate)}</span>
                        {item.expiringSoon && (
                          <span style={{ color: '#b45309', fontWeight: 700 }}>
                            Còn {item.daysRemaining} ngày
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section style={cardStyle}>
            {detailLoading || (selectedId !== null && !detail) ? (
              <div style={emptyStyle}>Đang tải chi tiết...</div>
            ) : detail ? (
              <>
                <div style={sectionHeaderStyle}>
                  <div>
                    <div style={eyebrowStyle}>Chi tiết</div>
                    <div style={sectionTitleStyle}>{detail.contractCode}</div>
                    <div style={sectionHintStyle}>
                      Phòng {detail.roomCode} · {detail.buildingName}
                    </div>
                  </div>
                  {detail.expiringSoon && (
                    <div style={warningStyle}>
                      Còn {detail.daysRemaining} ngày sẽ hết hạn
                    </div>
                  )}
                </div>

                <div style={infoGridStyle}>
                  <Info label="Giá thuê" value={formatMoney(detail.rent)} />
                  <Info label="Tiền cọc" value={formatMoney(detail.deposit)} />
                  <Info label="Ngày bắt đầu" value={formatDate(detail.startDate)} />
                  <Info label="Ngày kết thúc" value={formatDate(detail.endDate)} />
                  <Info label="Kỳ hạn" value={`${detail.termMonths} tháng`} />
                  <Info label="Ngày chốt hóa đơn" value={`Ngày ${detail.billingCutoffDay}`} />
                  <Info label="Diện tích" value={`${detail.roomArea} m²`} />
                  <Info label="Sức chứa" value={`${detail.maxPeople} người`} />
                  <Info label="Chỉ số điện đầu kỳ" value={detail.initialElectricity === null ? '-' : String(detail.initialElectricity)} />
                  <Info label="Chỉ số nước đầu kỳ" value={detail.initialWater === null ? '-' : String(detail.initialWater)} />
                </div>

                <div style={sectionBlockStyle}>
                  <div style={blockTitleStyle}>Người tham gia hợp đồng</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {detail.people.map((person) => (
                      <div key={`${person.role}-${person.fullName}-${person.phone}`} style={personStyle}>
                        <div>
                          <div style={{ fontWeight: 800 }}>{person.fullName}</div>
                          <div style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>
                            {person.role} · {person.phone}
                          </div>
                        </div>
                        <div style={{ color: '#64748b', fontSize: 12, textAlign: 'right' }}>
                          {formatDate(person.startDate)}
                          {' → '}
                          {formatDate(person.endDate)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={sectionBlockStyle}>
                  <div style={blockTitleStyle}>Dịch vụ và đơn giá áp dụng</div>
                  {detail.services.length === 0 ? (
                    <div style={emptyStyle}>Phòng chưa được gán dịch vụ.</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={tableStyle}>
                        <thead>
                          <tr>
                            <th style={thStyle}>Dịch vụ</th>
                            <th style={thStyle}>Cách tính</th>
                            <th style={thStyle}>Đơn vị</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Đơn giá</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.services.map((service) => (
                            <tr key={service.id}>
                              <td style={tdStyle}>{service.name}</td>
                              <td style={tdStyle}>{calculationLabel(service.calculationMethod)}</td>
                              <td style={tdStyle}>{service.unit}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>
                                {formatMoney(service.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={emptyStyle}>Chọn một hợp đồng để xem chi tiết.</div>
            )}
          </section>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .contract-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoBoxStyle}>
      <div style={infoLabelStyle}>{label}</div>
      <div style={infoValueStyle}>{value}</div>
    </div>
  )
}

function statusPill(item: ContractListItem) {
  if (item.expiringSoon) {
    return {
      ...pillBase,
      background: '#fef3c7',
      color: '#92400e',
    }
  }
  if (item.status === 'EXPIRED') {
    return {
      ...pillBase,
      background: '#fee2e2',
      color: '#b91c1c',
    }
  }
  return {
    ...pillBase,
    background: '#dcfce7',
    color: '#166534',
  }
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  padding: 28,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  color: '#0f172a',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  gap: 20,
  marginBottom: 24,
}

const eyebrowStyle: React.CSSProperties = { color: '#64748b', fontSize: 13, marginBottom: 6 }
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 30, fontWeight: 800 }
const subtitleStyle: React.CSSProperties = { margin: '8px 0 0', color: '#64748b' }
const cardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(320px, .85fr) minmax(420px, 1.4fr)', gap: 18 }
const sectionHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 16 }
const sectionTitleStyle: React.CSSProperties = { fontSize: 18, fontWeight: 800 }
const sectionHintStyle: React.CSSProperties = { fontSize: 12, color: '#94a3b8', marginTop: 4 }
const searchStyle: React.CSSProperties = { width: 220, maxWidth: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', outline: 'none' }
const contractItemStyle: React.CSSProperties = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 13, padding: 14, textAlign: 'left', cursor: 'pointer' }
const metaGridStyle: React.CSSProperties = { display: 'grid', gap: 7, marginTop: 12, color: '#64748b', fontSize: 12 }
const pillBase: React.CSSProperties = { borderRadius: 999, padding: '5px 9px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }
const primaryButtonStyle: React.CSSProperties = { border: 'none', borderRadius: 11, padding: '11px 15px', background: '#2563eb', color: '#fff', fontWeight: 800, cursor: 'pointer' }
const emptyStyle: React.CSSProperties = { color: '#64748b', padding: '28px 12px', textAlign: 'center' }
const errorBoxStyle: React.CSSProperties = { marginBottom: 16, padding: '12px 14px', borderRadius: 11, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }
const warningStyle: React.CSSProperties = { color: '#92400e', background: '#fef3c7', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 800 }
const infoGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }
const infoBoxStyle: React.CSSProperties = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: 12 }
const infoLabelStyle: React.CSSProperties = { color: '#64748b', fontSize: 11, marginBottom: 5 }
const infoValueStyle: React.CSSProperties = { fontWeight: 800, fontSize: 13 }
const sectionBlockStyle: React.CSSProperties = { marginTop: 20 }
const blockTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 800, marginBottom: 10 }
const personStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, padding: 12, borderRadius: 11, border: '1px solid #e2e8f0' }
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 }
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #cbd5e1', color: '#64748b', fontWeight: 800 }
const tdStyle: React.CSSProperties = { padding: '10px 8px', borderBottom: '1px solid #e2e8f0', color: '#334155' }

export default Contracts
