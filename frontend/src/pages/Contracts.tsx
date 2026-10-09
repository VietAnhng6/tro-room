
import { useEffect, useState } from 'react'

type Contract = {
  id: number
  contractCode?: string
  tenant?: { fullName?: string; name?: string; phone?: string }
  room?: { code?: string; name?: string; building?: { name?: string } }
  rent?: number
  deposit?: number
  startDate?: string
  endDate?: string
}

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('accessToken')

    fetch('http://localhost:8080/api/landlord/requests/contracts', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Không tải được danh sách hợp đồng (${res.status})`)
        return res.json()
      })
      .then((data) => setContracts(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Có lỗi xảy ra'))
      .finally(() => setLoading(false))
  }, [])

  const money = (value?: number) =>
    value == null ? '—' : `${value.toLocaleString('vi-VN')} đ`

  return (
    <div style={{ padding: 24 }}>
      <h1>Quản lý hợp đồng</h1>
      <p>Theo dõi các hợp đồng thuê phòng của bạn.</p>

      {loading && <p>Đang tải hợp đồng...</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {!loading && !error && (
        contracts.length === 0 ? (
          <p>Chưa có hợp đồng nào.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Mã hợp đồng', 'Người thuê', 'Phòng', 'Tiền thuê', 'Tiền cọc', 'Ngày bắt đầu', 'Ngày kết thúc'].map((label) => (
                    <th key={label} style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #ddd' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id}>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{c.contractCode || `#${c.id}`}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{c.tenant?.fullName || c.tenant?.name || '—'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{c.room?.code || c.room?.name || '—'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{money(c.rent)}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{money(c.deposit)}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{c.startDate || '—'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{c.endDate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}