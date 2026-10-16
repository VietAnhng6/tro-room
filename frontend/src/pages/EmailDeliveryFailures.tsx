
import { useEffect, useState } from 'react'

interface EmailDeliveryFailure {
  id: number
  recipientEmail: string
  attemptCount: number
  errorMessage: string | null
  createdAt: string
  resolved: boolean
  invoice?: {
    id: number
    invoiceCode?: string
  } | null
}

const API_BASE = 'http://localhost:8080'

export default function EmailDeliveryFailures() {
  const [items, setItems] = useState<EmailDeliveryFailure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadFailures = async () => {
      try {
        const token = localStorage.getItem('accessToken')

        const response = await fetch(
          `${API_BASE}/api/admin/email-delivery-failures`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Phiên đăng nhập hết hạn hoặc chưa đăng nhập.')
          }
          if (response.status === 403) {
            throw new Error('Chỉ Admin mới được xem lịch sử email lỗi.')
          }
          throw new Error('Không thể tải lịch sử email gửi thất bại.')
        }

        const data = await response.json()
        setItems(Array.isArray(data) ? data : [])
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Đã xảy ra lỗi khi tải dữ liệu.',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadFailures()
  }, [])

  const formatDate = (value: string) => {
    if (!value) return '—'

    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString('vi-VN')
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Lịch sử email gửi thất bại</h1>
      <p>Theo dõi các email hóa đơn không gửi được sau khi thử lại.</p>

      {loading && <p>Đang tải dữ liệu...</p>}

      {!loading && error && (
        <div
          role="alert"
          style={{
            padding: 12,
            margin: '16px 0',
            color: '#b91c1c',
            background: '#fef2f2',
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <p>Tổng số bản ghi: {items.length}</p>

          {items.length === 0 ? (
            <p>Chưa có email gửi thất bại.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginTop: 16,
                }}
              >
                <thead>
                  <tr>
                    {[
                      'STT',
                      'Email nhận',
                      'Mã hóa đơn',
                      'Số lần thử',
                      'Thời gian',
                      'Trạng thái',
                      'Lỗi',
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: 12,
                          textAlign: 'left',
                          borderBottom: '1px solid #ddd',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {item.recipientEmail}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {item.invoice?.invoiceCode ?? item.invoice?.id ?? '—'}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {item.attemptCount}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>
                        {formatDate(item.createdAt)}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                        {item.resolved ? 'Đã xử lý' : 'Chưa xử lý'}
                      </td>
                      <td
                        style={{
                          padding: 12,
                          borderBottom: '1px solid #eee',
                          minWidth: 220,
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {item.errorMessage || 'Không có thông tin lỗi'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
