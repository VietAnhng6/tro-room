import { useEffect, useState } from 'react'

type Building = {
  id: number
  name: string
  address?: string
}

type Readiness = {
  buildingId: number
  period: string
  total: number
  recorded: number
  remaining: number
}

type Item = {
  label: string
  type: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
  previousReading: number | null
  currentReading: number | null
}

type Invoice = {
  id: number
  invoiceCode: string
  contractId: number | null
  contractCode: string | null
  roomId: number | null
  roomCode: string | null
  tenantName: string | null
  period: string
  rentAmount: number
  totalAmount: number
  status: string
  issueDate: string
  dueDate: string
  items?: Item[]
}

type SkippedRoom = {
  contractId: number
  roomId: number
  roomCode: string
  reason: string
}

type GenerateResult = {
  buildingId: number
  period: string
  totalRooms: number
  created: number
  skippedRooms: SkippedRoom[]
}

const API = 'http://localhost:8080'

const getToken = () => localStorage.getItem('accessToken')

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ'
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Nháp',
  ISSUED: 'Đã phát hành',
  CANCELLED: 'Đã huỷ',
}

function Invoices() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [buildingId, setBuildingId] = useState<string>('')
  const [period, setPeriod] = useState<string>(currentPeriod())

  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [result, setResult] = useState<GenerateResult | null>(null)

  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const [detail, setDetail] = useState<Invoice | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/buildings`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Building[]) => {
        setBuildings(data)
        if (data.length > 0) {
          setBuildingId(String(data[0].id))
        }
      })
      .catch(() => setError('Không thể tải danh sách toà nhà'))
  }, [])

  useEffect(() => {
    if (!buildingId) return

    setLoading(true)
    setError('')
    setResult(null)

    Promise.all([
      fetch(
        `${API}/api/manager/meter-readings?buildingId=${buildingId}&period=${period}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      ).then((res) => (res.ok ? res.json() : null)),
      fetch(`${API}/api/invoices?buildingId=${buildingId}&period=${period}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([readinessData, invoicesData]) => {
        setReadiness(readinessData as Readiness | null)
        setInvoices(invoicesData as Invoice[])
      })
      .catch(() => setError('Không thể tải dữ liệu hoá đơn'))
      .finally(() => setLoading(false))
  }, [buildingId, period])

  const generate = async () => {
    if (!buildingId) return

    setGenerating(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(`${API}/api/invoices/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ buildingId: Number(buildingId), period }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Không thể phát hành hoá đơn')
      }

      setResult(data as GenerateResult)

      const invoicesRes = await fetch(
        `${API}/api/invoices?buildingId=${buildingId}&period=${period}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      )
      if (invoicesRes.ok) {
        setInvoices((await invoicesRes.json()) as Invoice[])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setGenerating(false)
    }
  }

  const openDetail = async (id: number) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await fetch(`${API}/api/invoices/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Không thể tải chi tiết hoá đơn')
      }
      setDetail(data as Invoice)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 27, fontWeight: 800, color: '#0f172a' }}>
            Phát hành hoá đơn tháng
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Phát hành hoá đơn cho cả toà chỉ bằng một thao tác. Phòng chưa chốt chỉ
            số điện nước sẽ bị bỏ qua và liệt kê rõ.
          </p>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 30 }}>
        <div style={cardStyle}>
          <div style={{ padding: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="Toà nhà">
              <select
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                style={inputStyle}
              >
                {buildings.length === 0 && <option value="">Chưa có toà nhà</option>}
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kỳ hoá đơn (tháng)">
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <button onClick={generate} disabled={generating || !buildingId} style={primaryButtonStyle}>
              {generating ? 'Đang phát hành...' : 'Phát hành hoá đơn cả toà'}
            </button>
          </div>

          {readiness && (
            <div style={summaryBarStyle}>
              <span>
                <strong>{readiness.total}</strong> phòng đang thuê
              </span>
              <span>
                <strong style={{ color: '#16a34a' }}>{readiness.recorded}</strong> đã chốt chỉ số
              </span>
              <span>
                <strong style={{ color: readiness.remaining > 0 ? '#dc2626' : '#16a34a' }}>
                  {readiness.remaining}
                </strong>{' '}
                chưa chốt chỉ số
              </span>
            </div>
          )}
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {result && (
          <div style={resultStyle}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>
              Kết quả: đã phát hành {result.created}/{result.totalRooms} hoá đơn
            </div>

            {result.skippedRooms.length === 0 ? (
              <div style={{ color: '#16a34a' }}>Tất cả phòng đã được phát hành hoá đơn.</div>
            ) : (
              <div>
                <div style={{ color: '#b45309', marginBottom: 8 }}>
                  Các phòng bị bỏ qua ({result.skippedRooms.length}):
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {result.skippedRooms.map((r) => (
                      <tr key={r.contractId} style={{ borderBottom: '1px solid #fef3c7' }}>
                        <td style={{ padding: '6px 0', fontWeight: 700, width: 120 }}>
                          {r.roomCode}
                        </td>
                        <td style={{ padding: '6px 0', color: '#92400e' }}>{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <h2 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', margin: '26px 0 14px' }}>
          Hoá đơn trong kỳ {period}
        </h2>

        <div style={cardStyle}>
          {loading ? (
            <div style={emptyStyle}>Đang tải dữ liệu...</div>
          ) : invoices.length === 0 ? (
            <div style={emptyStyle}>Chưa có hoá đơn nào trong kỳ này.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={thStyle}>Mã hoá đơn</th>
                    <th style={thStyle}>Phòng</th>
                    <th style={thStyle}>Người đứng tên</th>
                    <th style={thStyle}>Tổng tiền</th>
                    <th style={thStyle}>Trạng thái</th>
                    <th style={thStyle}>Hạn thanh toán</th>
                    <th style={thStyle}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={tdStyle}>{inv.invoiceCode}</td>
                      <td style={tdStyle}>{inv.roomCode}</td>
                      <td style={tdStyle}>{inv.tenantName || '—'}</td>
                      <td style={tdStyle}>
                        <strong>{formatMoney(inv.totalAmount)}</strong>
                      </td>
                      <td style={tdStyle}>{statusLabel[inv.status] || inv.status}</td>
                      <td style={tdStyle}>{formatDate(inv.dueDate)}</td>
                      <td style={tdStyle}>
                        <button onClick={() => openDetail(inv.id)} style={editButtonStyle}>
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {(detail || detailLoading) && (
        <DetailModal
          loading={detailLoading}
          invoice={detail}
          onClose={() => {
            setDetail(null)
            setDetailLoading(false)
          }}
        />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#475569' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function DetailModal({
  loading,
  invoice,
  onClose,
}: {
  loading: boolean
  invoice: Invoice | null
  onClose: () => void
}) {
  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>
            {invoice ? `Hoá đơn ${invoice.invoiceCode}` : 'Chi tiết hoá đơn'}
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>
            ×
          </button>
        </div>

        {loading || !invoice ? (
          <div style={emptyStyle}>Đang tải...</div>
        ) : (
          <div>
            <div style={{ fontSize: 14, color: '#475569', marginBottom: 16, lineHeight: 1.7 }}>
              <div>
                Phòng <strong>{invoice.roomCode}</strong> · {invoice.tenantName || '—'}
              </div>
              <div>
                Kỳ {invoice.period} · Ngày phát hành {formatDate(invoice.issueDate)} · Hạn{' '}
                {formatDate(invoice.dueDate)} · {statusLabel[invoice.status] || invoice.status}
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={thStyle}>Khoản mục</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Số lượng</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 650 }}>{item.label}</div>
                      {(item.previousReading !== null || item.currentReading !== null) && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Chỉ số {item.previousReading} → {item.currentReading}
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {item.quantity} {item.unit}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {formatMoney(item.unitPrice)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>
                      {formatMoney(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', marginTop: 16, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
              Tổng cộng: {formatMoney(invoice.totalAmount)}
            </div>
          </div>
        )}
      </div>
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
  padding: '20px 32px',
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  overflow: 'hidden',
}

const summaryBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 28,
  flexWrap: 'wrap',
  padding: '14px 20px',
  background: '#f8fafc',
  borderTop: '1px solid #e2e8f0',
  fontSize: 14,
  color: '#475569',
}

const inputStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 9,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
  minWidth: 200,
}

const primaryButtonStyle: React.CSSProperties = {
  border: 0,
  background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
  color: '#fff',
  borderRadius: 9,
  padding: '11px 18px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 14,
}

const errorStyle: React.CSSProperties = {
  background: '#fef2f2',
  color: '#b91c1c',
  padding: 14,
  borderRadius: 12,
  marginTop: 16,
  fontSize: 14,
}

const resultStyle: React.CSSProperties = {
  background: '#fffbeb',
  border: '1px solid #fde68a',
  color: '#0f172a',
  padding: 18,
  borderRadius: 14,
  marginTop: 16,
  fontSize: 14,
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '13px 16px',
  borderBottom: '1px solid #e2e8f0',
  color: '#475569',
  fontSize: 13,
}

const tdStyle: React.CSSProperties = {
  padding: '13px 16px',
  borderBottom: '1px solid #e2e8f0',
  verticalAlign: 'middle',
  fontSize: 14,
  color: '#0f172a',
}

const emptyStyle: React.CSSProperties = {
  padding: 50,
  textAlign: 'center',
  color: '#64748b',
}

const editButtonStyle: React.CSSProperties = {
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#2563eb',
  borderRadius: 8,
  padding: '8px 13px',
  cursor: 'pointer',
  fontWeight: 650,
  whiteSpace: 'nowrap',
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  zIndex: 1000,
}

const modalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 640,
  maxHeight: '90vh',
  overflowY: 'auto',
  background: '#fff',
  borderRadius: 18,
  padding: 26,
  boxShadow: '0 25px 70px rgba(15,23,42,.25)',
}

const closeButtonStyle: React.CSSProperties = {
  border: 0,
  background: '#f1f5f9',
  color: '#334155',
  width: 34,
  height: 34,
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 18,
}

export default Invoices
