import { useEffect, useState } from 'react'

type Invoice = {
  id: number
  invoiceCode: string
  contractId: number
  contractCode: string
  roomId: number
  roomCode: string
  tenantName: string
  period: string
  rentAmount: number
  totalAmount: number
  status: string
  issueDate: string | null
  dueDate: string | null
}

const API = 'http://localhost:8080'

const statusLabel: Record<string, string> = {
  DRAFT: 'Bản nháp',
  ISSUED: 'Đã phát hành',
  CANCELLED: 'Đã huỷ',
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#f1f5f9', color: '#475569' },
  ISSUED: { bg: '#dcfce7', color: '#166534' },
  CANCELLED: { bg: '#fee2e2', color: '#991b1b' },
}

function formatMoney(value: number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString('vi-VN')} đ`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'

  const parts = value.split('T')[0].split('-')
  if (parts.length !== 3) return value

  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function formatPeriod(value: string | null | undefined): string {
  if (!value) return '—'

  const parts = value.split('-')
  if (parts.length !== 2) return value

  return `Tháng ${parts[1]}/${parts[0]}`
}

export default function TenantInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const token = localStorage.getItem('accessToken')

  async function loadInvoices() {
    setLoading(true)
    setError('')

    try {
      if (!token) {
        window.location.href = '/'
        return
      }

      const res = await fetch(`${API}/api/tenant/invoices`, {
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
        throw new Error('Bạn không có quyền xem danh sách hóa đơn này.')
      }

      if (!res.ok) {
        throw new Error(
          `Không thể tải hóa đơn (HTTP ${res.status}). Có thể backend chưa có API /api/tenant/invoices.`,
        )
      }

      const data = await res.json()

      if (!Array.isArray(data)) {
        throw new Error('Dữ liệu hóa đơn trả về không đúng định dạng.')
      }

      setInvoices(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi tải hóa đơn.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [])

  const filteredInvoices = invoices.filter((invoice) => {
    const keyword = search.trim().toLowerCase()

    return (
      !keyword ||
      (invoice.invoiceCode ?? '').toLowerCase().includes(keyword) ||
      (invoice.roomCode ?? '').toLowerCase().includes(keyword) ||
      (invoice.contractCode ?? '').toLowerCase().includes(keyword) ||
      (invoice.period ?? '').toLowerCase().includes(keyword)
    )
  })

  const totalIssued = invoices
    .filter((invoice) => invoice.status === 'ISSUED')
    .reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, color: '#0f172a' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
            Hóa đơn của tôi
          </h1>
          <p style={{ color: '#64748b', marginTop: 8 }}>
            Theo dõi hóa đơn tiền phòng hàng tháng của bạn.
          </p>
        </div>

        <button
          onClick={loadInvoices}
          disabled={loading}
          style={{
            border: '1px solid #cbd5e1',
            background: '#fff',
            borderRadius: 10,
            padding: '10px 16px',
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          {loading ? 'Đang tải...' : '↻ Làm mới'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ padding: 20, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14 }}>
          <div style={{ color: '#1d4ed8', fontSize: 14 }}>Tổng số hóa đơn</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{invoices.length}</div>
        </div>

        <div style={{ padding: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14 }}>
          <div style={{ color: '#166534', fontSize: 14 }}>Tổng tiền hóa đơn đã phát hành</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{formatMoney(totalIssued)}</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 19 }}>Danh sách hóa đơn</h2>

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm mã hóa đơn, phòng, kỳ..."
            style={{
              width: '100%',
              maxWidth: 320,
              boxSizing: 'border-box',
              padding: '10px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 9,
            }}
          />
        </div>

        {loading ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>
            Đang tải danh sách hóa đơn...
          </div>
        ) : error ? (
          <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#b91c1c' }}>
            <p>{error}</p>
            <button onClick={loadInvoices}>Thử lại</button>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontWeight: 700, color: '#334155' }}>
              {search ? 'Không tìm thấy hóa đơn phù hợp.' : 'Bạn chưa có hóa đơn nào.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 700 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  {['Mã hóa đơn', 'Kỳ hóa đơn', 'Phòng', 'Ngày phát hành', 'Hạn thanh toán', 'Tổng tiền', 'Trạng thái'].map((heading) => (
                    <th key={heading} style={{ padding: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const style = statusStyle[invoice.status] ?? statusStyle.DRAFT

                  return (
                    <tr key={invoice.id}>
                      <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>
                        {invoice.invoiceCode || `HD-${invoice.id}`}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                        {formatPeriod(invoice.period)}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                        {invoice.roomCode || '—'}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {formatMoney(invoice.totalAmount)}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '5px 9px',
                            borderRadius: 999,
                            background: style.bg,
                            color: style.color,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {statusLabel[invoice.status] ?? invoice.status}
                        </span>
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
  )
}
