import { useCallback, useEffect, useState } from 'react'

type NotificationItem = {
  id: number
  title?: string
  message?: string
  content?: string
  type?: string
  read?: boolean
  isRead?: boolean
  createdAt?: string
}

const API = 'http://localhost:8080/api/notifications'

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem('accessToken')

    if (!token) {
      setError('Vui lòng đăng nhập để xem thông báo.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await fetch(API, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? 'Phiên đăng nhập đã hết hạn.'
            : `Không tải được thông báo (${response.status}).`,
        )
      }

      const data = await response.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const markAsRead = async (item: NotificationItem) => {
    if (item.read === true || item.isRead === true) return

    const token = localStorage.getItem('accessToken')

    try {
      const response = await fetch(`${API}/${item.id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error(`Không thể đánh dấu đã đọc (${response.status}).`)
      }

      setItems((previous) =>
        previous.map((n) =>
          n.id === item.id ? { ...n, read: true, isRead: true } : n,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.')
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 28 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 22,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 25, color: '#0f172a' }}>
            Thông báo
          </h1>
          <p style={{ color: '#64748b', marginBottom: 0 }}>
            Cập nhật về yêu cầu thuê phòng và hóa đơn của bạn.
          </p>
        </div>

        <button
          onClick={() => void loadNotifications()}
          style={{
            padding: '9px 14px',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Làm mới
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: 14,
            marginBottom: 16,
            borderRadius: 8,
            background: '#fef2f2',
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#64748b' }}>Đang tải thông báo...</p>
      ) : items.length === 0 ? (
        <div
          style={{
            padding: 42,
            textAlign: 'center',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            color: '#64748b',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔔</div>
          <strong style={{ color: '#334155' }}>Chưa có thông báo</strong>
          <p>Thông báo mới sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {items.map((item) => {
            const isRead = item.read === true || item.isRead === true

            return (
              <button
                key={item.id}
                onClick={() => void markAsRead(item)}
                style={{
                  display: 'flex',
                  width: '100%',
                  gap: 14,
                  alignItems: 'flex-start',
                  padding: 20,
                  textAlign: 'left',
                  border: 0,
                  borderBottom: '1px solid #e2e8f0',
                  background: isRead ? '#fff' : '#eff6ff',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 22 }}>🔔</span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ color: '#0f172a', fontSize: 14 }}>
                    {item.title || item.type || 'Thông báo TroRoom'}
                  </strong>

                  <span
                    style={{
                      display: 'block',
                      marginTop: 6,
                      color: '#475569',
                      fontSize: 13,
                      lineHeight: 1.6,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {item.message || item.content || 'Bạn có thông báo mới.'}
                  </span>

                  {item.createdAt && (
                    <span
                      style={{
                        display: 'block',
                        marginTop: 8,
                        color: '#94a3b8',
                        fontSize: 12,
                      }}
                    >
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </span>
                  )}
                </span>

                <span
                  style={{
                    fontSize: 12,
                    color: isRead ? '#64748b' : '#2563eb',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isRead ? 'Đã đọc' : 'Chưa đọc'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}