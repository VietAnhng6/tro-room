import React, { useCallback, useEffect, useState } from 'react'

const API = 'http://localhost:8080/api'

interface PaymentReport {
  id: number
  invoiceId: number
  invoiceCode: string
  amount: number
  paymentDate: string
  paymentMethod: string
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | string
  hasProofImage: boolean
  createdAt: string
}

export default function LandlordPaymentReports() {
  const [reports, setReports] = useState<PaymentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const accessToken = localStorage.getItem('accessToken')
      const response = await fetch(`${API}/payment-reports/landlord`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? 'Tài khoản không có quyền xem báo cáo thanh toán.'
            : `Không tải được báo cáo (${response.status}).`,
        )
      }

      setReports(await response.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đã xảy ra lỗi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  const performAction = async (
    report: PaymentReport,
    action: 'confirm' | 'reject',
  ) => {
    const actionLabel = action === 'confirm' ? 'xác nhận' : 'từ chối'

    if (!window.confirm(`Bạn có chắc muốn ${actionLabel} báo cáo ${report.invoiceCode}?`)) {
      return
    }

    setBusyId(report.id)
    setError('')
    setMessage('')

    try {
      const accessToken = localStorage.getItem('accessToken')
      const response = await fetch(
        `${API}/payment-reports/${report.id}/${action}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      )

      if (!response.ok) {
        const body = await response.text()
        throw new Error(body || `Thao tác thất bại (${response.status}).`)
      }

      setMessage(
        action === 'confirm'
          ? `Đã xác nhận báo cáo ${report.invoiceCode}.`
          : `Đã từ chối báo cáo ${report.invoiceCode}.`,
      )
      await loadReports()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể xử lý báo cáo.')
    } finally {
      setBusyId(null)
    }
  }

  const viewProof = async (report: PaymentReport) => {
    if (!report.hasProofImage) {
      setError('Báo cáo này chưa có ảnh minh chứng.')
      return
    }

    setBusyId(report.id)
    setError('')
    setMessage('')

    try {
      const accessToken = localStorage.getItem('accessToken')
      const response = await fetch(
        `${API}/payment-reports/${report.id}/proof-link`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      )

      if (!response.ok) {
        throw new Error(`Không tạo được link xem ảnh (${response.status}).`)
      }

      const proofToken = (await response.text()).trim()
      const imageResponse = await fetch(
        `${API}/payment-reports/proof/${encodeURIComponent(proofToken)}`,
      )

      if (!imageResponse.ok) {
        throw new Error(`Không tải được ảnh (${imageResponse.status}).`)
      }

      const blob = await imageResponse.blob()
      if (!blob.type.startsWith('image/')) {
        throw new Error('Dữ liệu trả về không phải ảnh.')
      }

      const objectUrl = URL.createObjectURL(blob)
      const opened = window.open(objectUrl, '_blank')

      if (!opened) {
        const link = document.createElement('a')
        link.href = objectUrl
        link.target = '_blank'
        link.rel = 'noopener'
        link.click()
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể xem ảnh minh chứng.')
    } finally {
      setBusyId(null)
    }
  }

  const money = (amount: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount)

  const statusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Chờ xác nhận'
      case 'CONFIRMED': return 'Đã xác nhận'
      case 'REJECTED': return 'Đã từ chối'
      case 'CANCELLED': return 'Đã hủy'
      default: return status
    }
  }

  const visibleReports = reports.filter(
    (report) => statusFilter === 'ALL' || report.status === statusFilter,
  )

  const pendingCount = reports.filter((r) => r.status === 'PENDING').length

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20,
      }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, color: '#0f172a' }}>
            Báo cáo thanh toán
          </h2>
          <p style={{ margin: 0, color: '#64748b' }}>
            Kiểm tra minh chứng và xử lý báo cáo thanh toán của khách thuê.
          </p>
        </div>
        <button onClick={() => void loadReports()} style={buttonStyle}>
          Làm mới
        </button>
      </div>

      <div style={{
        padding: 16, marginBottom: 18, background: '#fff',
        border: '1px solid #e2e8f0', borderRadius: 12,
      }}>
        <strong>Đang chờ xử lý: {pendingCount}</strong>
        <div style={{ marginTop: 12 }}>
          <label htmlFor="payment-report-status">Lọc trạng thái: </label>
          <select
            id="payment-report-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }}
          >
            <option value="ALL">Tất cả</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="REJECTED">Đã từ chối</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" style={{
          padding: 12, marginBottom: 12, borderRadius: 8,
          background: '#fef2f2', color: '#b91c1c',
        }}>{error}</div>
      )}

      {message && (
        <div role="status" style={{
          padding: 12, marginBottom: 12, borderRadius: 8,
          background: '#f0fdf4', color: '#166534',
        }}>{message}</div>
      )}

      {loading ? (
        <p>Đang tải báo cáo thanh toán...</p>
      ) : visibleReports.length === 0 ? (
        <div style={{
          padding: 32, background: '#fff', borderRadius: 12,
          border: '1px solid #e2e8f0', color: '#64748b', textAlign: 'center',
        }}>
          Không có báo cáo thanh toán nào trong mục này.
        </div>
      ) : (
        <div style={{
          overflowX: 'auto', background: '#fff',
          border: '1px solid #e2e8f0', borderRadius: 12,
        }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            minWidth: 950, fontSize: 14,
          }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                {['Mã báo cáo', 'Mã hóa đơn', 'Số tiền', 'Ngày thanh toán',
                  'Phương thức', 'Trạng thái', 'Minh chứng', 'Thao tác'].map((title) => (
                  <th key={title} style={{
                    padding: 12, borderBottom: '1px solid #e2e8f0',
                    color: '#475569', whiteSpace: 'nowrap',
                  }}>{title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleReports.map((report) => (
                <tr key={report.id}>
                  <td style={cellStyle}>#{report.id}</td>
                  <td style={cellStyle}>{report.invoiceCode}</td>
                  <td style={{ ...cellStyle, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {money(report.amount)}
                  </td>
                  <td style={cellStyle}>{report.paymentDate}</td>
                  <td style={cellStyle}>{report.paymentMethod}</td>
                  <td style={cellStyle}>
                    <span style={{
                      display: 'inline-block', padding: '4px 8px',
                      borderRadius: 6, background: report.status === 'PENDING'
                        ? '#fef3c7'
                        : report.status === 'CONFIRMED'
                          ? '#dcfce7'
                          : '#f1f5f9',
                      color: report.status === 'PENDING'
                        ? '#92400e'
                        : report.status === 'CONFIRMED'
                          ? '#166534'
                          : '#475569',
                      whiteSpace: 'nowrap',
                    }}>
                      {statusText(report.status)}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    {report.hasProofImage ? (
                      <button
                        disabled={busyId === report.id}
                        onClick={() => void viewProof(report)}
                        style={buttonStyle}
                      >
                        {busyId === report.id ? 'Đang xử lý...' : 'Xem ảnh'}
                      </button>
                    ) : 'Chưa có ảnh'}
                  </td>
                  <td style={cellStyle}>
                    {report.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          disabled={busyId === report.id}
                          onClick={() => void performAction(report, 'confirm')}
                          style={{ ...buttonStyle, background: '#16a34a', color: '#fff' }}
                        >
                          Xác nhận
                        </button>
                        <button
                          disabled={busyId === report.id}
                          onClick={() => void performAction(report, 'reject')}
                          style={{ ...buttonStyle, background: '#dc2626', color: '#fff' }}
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const cellStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #f1f5f9',
  color: '#334155',
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#fff',
  color: '#334155',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}