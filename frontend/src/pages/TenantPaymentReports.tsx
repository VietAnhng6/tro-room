
import React, { useEffect, useRef, useState } from 'react'

const API = '/api'

type PaymentMethod = 'CASH' | 'TRANSFER'
type ReportStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED'

interface PaymentReport {
  id: number
  invoiceId: number
  invoiceCode: string
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  status: ReportStatus
  hasProofImage: boolean
  createdAt: string
}

interface Invoice {
  id: number
  invoiceCode: string
  totalAmount: number
  status: string
  dueDate?: string
}

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value)

const statusText: Record<ReportStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  REJECTED: 'Bị từ chối',
}

const statusColor: Record<ReportStatus, string> = {
  PENDING: '#b7791f',
  CONFIRMED: '#16803c',
  CANCELLED: '#64748b',
  REJECTED: '#dc2626',
}

export default function TenantPaymentReports() {
  const [reports, setReports] = useState<PaymentReport[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(
    new Date().toLocaleDateString('en-CA'),
  )
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('TRANSFER')
  const [proofFiles, setProofFiles] = useState<Record<number, File | null>>({})
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  // State xem ảnh minh chứng
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null)

  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const token = () => localStorage.getItem('accessToken')

  const request = async (url: string, init: RequestInit = {}) => {
    const accessToken = token()

    if (!accessToken) {
      window.location.href = '/'
      throw new Error('Phiên đăng nhập đã hết hạn.')
    }

    const response = await fetch(`${API}${url}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    })

    if (response.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/'
      throw new Error('Phiên đăng nhập đã hết hạn.')
    }

    if (!response.ok) {
      const body = await response.text()
      let detail = body

      try {
        const parsed = JSON.parse(body)
        detail = parsed.message || parsed.error || body
      } catch {
        // Phản hồi có thể là văn bản thuần.
      }

      throw new Error(detail || `Yêu cầu thất bại (${response.status})`)
    }

    return response
  }

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [reportResponse, invoiceResponse] = await Promise.all([
        request('/payment-reports/mine'),
        request('/invoices/tenant'),
      ])

      const reportData: PaymentReport[] = await reportResponse.json()
      const invoiceData: Invoice[] = await invoiceResponse.json()

      setReports(reportData)
      setInvoices(invoiceData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  // Thu hồi URL ảnh tạm khi đóng modal hoặc rời trang.
  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage)
      }
    }
  }, [previewImage])

  const issuedInvoices = invoices.filter(
    (invoice) => invoice.status?.toUpperCase() === 'ISSUED',
  )

  const createReport = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const invoiceId = Number(selectedInvoice)
    const parsedAmount = Number(amount)

    if (!invoiceId) {
      setError('Vui lòng chọn hóa đơn.')
      return
    }

    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      setError('Số tiền phải là số nguyên lớn hơn 0.')
      return
    }

    if (!paymentDate) {
      setError('Vui lòng chọn ngày thanh toán.')
      return
    }

    setSubmitting(true)

    try {
      const response = await request(
        `/payment-reports/invoices/${invoiceId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parsedAmount,
            paymentDate,
            paymentMethod,
          }),
        },
      )

      const created: PaymentReport = await response.json()
      setReports((previous) => [created, ...previous])
      setAmount('')
      setSelectedInvoice('')
      setMessage('Đã tạo báo cáo thanh toán. Hãy tải ảnh minh chứng nếu có.')
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tạo báo cáo.')
    } finally {
      setSubmitting(false)
    }
  }

  const uploadProof = async (reportId: number) => {
    const file = proofFiles[reportId]

    if (!file) {
      setError('Vui lòng chọn ảnh minh chứng trước.')
      return
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Chỉ chấp nhận ảnh JPG hoặc PNG.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh không được vượt quá 5 MB.')
      return
    }

    setError('')
    setMessage('')
    setUploadingId(reportId)

    try {
      const formData = new FormData()
      formData.append('image', file)

      await request(`/payment-reports/${reportId}/proof`, {
        method: 'POST',
        body: formData,
      })

      setProofFiles((previous) => ({ ...previous, [reportId]: null }))

      if (fileRefs.current[reportId]) {
        fileRefs.current[reportId]!.value = ''
      }

      setMessage('Tải ảnh minh chứng thành công.')
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải ảnh.')
    } finally {
      setUploadingId(null)
    }
  }

  
  const viewProof = async (report: PaymentReport) => {
    if (!report.hasProofImage) {
      setError('Báo cáo này chưa có ảnh minh chứng.')
      return
    }

    setError('')
    setMessage('')
    setPreviewLoadingId(report.id)

    try {
      // Xin token xem ảnh từ backend
      const tokenResponse = await request(
        `/payment-reports/${report.id}/proof-link`,
        { method: 'POST' },
      )

      const proofToken = (await tokenResponse.text()).trim()

      if (!proofToken) {
        throw new Error('Không nhận được link xem ảnh.')
      }

      // Dùng token để tải ảnh minh chứng
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

      setPreviewImage(URL.createObjectURL(blob))
    } catch (e) {
      setError(
        e instanceof Error
          ? `Không thể xem ảnh minh chứng: ${e.message}`
          : 'Không thể xem ảnh minh chứng.',
      )
    } finally {
      setPreviewLoadingId(null)
    }
  }


  const closePreview = () => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage)
    }
    setPreviewImage(null)
  }

  const cancelReport = async (reportId: number) => {
    if (!window.confirm('M muốn hủy báo cáo thanh toán này chứ?')) return

    setError('')
    setMessage('')
    setBusyId(reportId)

    try {
      await request(`/payment-reports/${reportId}/cancel`, {
        method: 'POST',
      })

      setMessage('Đã hủy báo cáo thanh toán.')
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể hủy báo cáo.')
    } finally {
      setBusyId(null)
    }
  }

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100%',
      padding: 24,
      background: '#f5f7fb',
      color: '#1e293b',
      fontFamily: 'Arial, sans-serif',
    },
    card: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
    },
    input: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '10px 12px',
      border: '1px solid #cbd5e1',
      borderRadius: 7,
      marginTop: 6,
      fontSize: 14,
      background: '#fff',
    },
    button: {
      border: 0,
      borderRadius: 7,
      padding: '10px 14px',
      background: '#2563eb',
      color: '#fff',
      cursor: 'pointer',
      fontWeight: 600,
    },
    secondary: {
      border: '1px solid #cbd5e1',
      borderRadius: 7,
      padding: '9px 12px',
      background: '#fff',
      color: '#334155',
      cursor: 'pointer',
    },
    label: {
      display: 'block',
      fontWeight: 600,
      fontSize: 14,
      marginTop: 12,
    },
  }

  return (
    <div style={styles.page}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 26 }}>
          Báo cáo thanh toán
        </h1>
        <div style={{ color: '#64748b', fontSize: 14 }}>
          Tạo báo cáo khi đã thanh toán hóa đơn và theo dõi trạng thái xác nhận.
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            ...styles.card,
            color: '#b91c1c',
            background: '#fef2f2',
            borderColor: '#fecaca',
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          style={{
            ...styles.card,
            color: '#166534',
            background: '#f0fdf4',
            borderColor: '#bbf7d0',
            marginBottom: 14,
          }}
        >
          {message}
        </div>
      )}

      <section style={styles.card}>
        <h2 style={{ margin: '0 0 8px', fontSize: 19 }}>
          Tạo báo cáo thanh toán
        </h2>

        <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>
          Chỉ khai báo số tiền thực tế đã thanh toán. Báo cáo sẽ chờ chủ nhà xác nhận.
        </p>

        <form onSubmit={createReport}>
          <label style={styles.label} htmlFor="invoice">
            Hóa đơn
          </label>

          <select
            id="invoice"
            value={selectedInvoice}
            onChange={(e) => setSelectedInvoice(e.target.value)}
            style={styles.input}
            required
          >
            <option value="">-- Chọn hóa đơn đã phát hành --</option>
            {issuedInvoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoiceCode} — Tổng tiền: {money(invoice.totalAmount)}
              </option>
            ))}
          </select>

          {issuedInvoices.length === 0 && !loading && (
            <p style={{ color: '#64748b', fontSize: 13 }}>
              Không có hóa đơn đã phát hành để báo cáo thanh toán.
            </p>
          )}

          <label style={styles.label} htmlFor="amount">
            Số tiền đã thanh toán (VNĐ)
          </label>

          <input
            id="amount"
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ví dụ: 500000"
            style={styles.input}
            required
          />

          <label style={styles.label} htmlFor="paymentDate">
            Ngày thanh toán
          </label>

          <input
            id="paymentDate"
            type="date"
            value={paymentDate}
            max={new Date().toLocaleDateString('en-CA')}
            onChange={(e) => setPaymentDate(e.target.value)}
            style={styles.input}
            required
          />

          <label style={styles.label} htmlFor="paymentMethod">
            Phương thức thanh toán
          </label>

          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value as PaymentMethod)
            }
            style={styles.input}
          >
            <option value="TRANSFER">Chuyển khoản</option>
            <option value="CASH">Tiền mặt</option>
          </select>

          <button
            type="submit"
            disabled={submitting || issuedInvoices.length === 0}
            style={{
              ...styles.button,
              marginTop: 18,
              opacity: submitting || issuedInvoices.length === 0 ? 0.6 : 1,
            }}
          >
            {submitting ? 'Đang tạo...' : 'Tạo báo cáo'}
          </button>
        </form>
      </section>

      <section style={styles.card}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 19 }}>Lịch sử báo cáo</h2>

          <button
            type="button"
            onClick={() => void loadData()}
            style={styles.secondary}
            disabled={loading}
          >
            Làm mới
          </button>
        </div>

        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : reports.length === 0 ? (
          <p style={{ color: '#64748b' }}>M chưa có báo cáo thanh toán nào.</p>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {reports.map((report) => (
              <article
                key={report.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {report.invoiceCode || `Hóa đơn #${report.invoiceId}`}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: '#64748b',
                        marginTop: 5,
                      }}
                    >
                      Mã báo cáo: #{report.id}
                    </div>
                  </div>

                  <span
                    style={{
                      alignSelf: 'flex-start',
                      borderRadius: 20,
                      padding: '5px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: statusColor[report.status] || '#334155',
                      background:
                        report.status === 'CONFIRMED'
                          ? '#dcfce7'
                          : report.status === 'REJECTED'
                            ? '#fee2e2'
                            : report.status === 'PENDING'
                              ? '#fef3c7'
                              : '#f1f5f9',
                    }}
                  >
                    {statusText[report.status] || report.status}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  <div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      Số tiền
                    </div>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        marginTop: 4,
                      }}
                    >
                      {money(report.amount)}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      Ngày thanh toán
                    </div>
                    <div style={{ marginTop: 4 }}>{report.paymentDate}</div>
                  </div>

                  <div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      Phương thức
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {report.paymentMethod === 'TRANSFER'
                        ? 'Chuyển khoản'
                        : 'Tiền mặt'}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      Ảnh minh chứng
                    </div>

                    <div style={{ marginTop: 4 }}>
                      {report.hasProofImage ? 'Đã tải ảnh' : 'Chưa có ảnh'}
                    </div>

                    {report.hasProofImage && (
                      <button
                        type="button"
                        disabled={previewLoadingId !== null}
                        onClick={() => void viewProof(report)}
                        style={{
                          ...styles.secondary,
                          marginTop: 8,
                          opacity: previewLoadingId !== null ? 0.6 : 1,
                        }}
                      >
                        {previewLoadingId === report.id
                          ? 'Đang tải ảnh...'
                          : 'Xem ảnh'}
                      </button>
                    )}
                  </div>
                </div>

                {report.status === 'PENDING' && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      alignItems: 'center',
                      marginTop: 16,
                      paddingTop: 14,
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    {!report.hasProofImage && (
                      <>
                        <input
                          ref={(el) => {
                            fileRefs.current[report.id] = el
                          }}
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={(e) =>
                            setProofFiles((previous) => ({
                              ...previous,
                              [report.id]: e.target.files?.[0] || null,
                            }))
                          }
                          style={{ maxWidth: '100%' }}
                        />

                        <button
                          type="button"
                          disabled={
                            uploadingId === report.id ||
                            !proofFiles[report.id]
                          }
                          onClick={() => void uploadProof(report.id)}
                          style={{
                            ...styles.button,
                            opacity:
                              uploadingId === report.id ||
                              !proofFiles[report.id]
                                ? 0.6
                                : 1,
                          }}
                        >
                          {uploadingId === report.id
                            ? 'Đang tải...'
                            : 'Tải ảnh minh chứng'}
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() => void cancelReport(report.id)}
                      style={{
                        ...styles.secondary,
                        color: '#b91c1c',
                        borderColor: '#fecaca',
                      }}
                    >
                      {busyId === report.id ? 'Đang hủy...' : 'Hủy báo cáo'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Modal xem ảnh minh chứng */}
      {previewImage && (
        <div
          role="presentation"
          onClick={closePreview}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closePreview()
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Ảnh minh chứng thanh toán"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 16,
              maxWidth: 900,
              maxHeight: '90vh',
              width: '100%',
              boxSizing: 'border-box',
              overflow: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>Ảnh minh chứng thanh toán</h3>

              <button
                type="button"
                onClick={closePreview}
                style={styles.secondary}
              >
                Đóng
              </button>
            </div>

            <img
              src={previewImage}
              alt="Ảnh minh chứng thanh toán"
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '70vh',
                margin: '0 auto',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
