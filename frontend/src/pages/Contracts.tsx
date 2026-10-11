
import { useCallback, useEffect, useState } from 'react'

type Contract = {
  id: number
  contractCode?: string
  tenant?: { fullName?: string; name?: string; phone?: string }
  room?: { code?: string; name?: string; building?: { name?: string } }
  rent?: number
  deposit?: number
  startDate?: string
  endDate?: string
  termMonths?: number
}

type Renewal = {
  id: number
  contractId: number
  startDate: string
  endDate: string
  termMonths: number
  rent: number
  renewedByName?: string
  createdAt?: string
}

const API = 'http://localhost:8080/api/landlord/requests'

const buttonStyle = {
  padding: '9px 14px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  cursor: 'pointer' as const,
  background: '#fff',
  color: '#111827',
}

const primaryButtonStyle = {
  ...buttonStyle,
  background: '#2563eb',
  color: '#fff',
  border: '1px solid #2563eb',
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: 10,
  border: '1px solid #d1d5db',
  borderRadius: 8,
  marginTop: 6,
}

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [selected, setSelected] = useState<Contract | null>(null)
  const [termMonths, setTermMonths] = useState('12')
  const [rent, setRent] = useState('')
  const [renewals, setRenewals] = useState<Renewal[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [saving, setSaving] = useState(false)

  const token = () => localStorage.getItem('accessToken')

  const requestHeaders = (): HeadersInit => ({
    Authorization: `Bearer ${token()}`,
  })

  const money = (value?: number) =>
    value == null ? '—' : `${value.toLocaleString('vi-VN')} đ`

  const formatDateTime = (value?: string) => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString('vi-VN')
  }

  const readError = async (response: Response) => {
    const body = await response.text()
    if (!body) return `Yêu cầu thất bại (${response.status})`

    try {
      const data = JSON.parse(body)
      return data.message || data.detail || data.error || body
    } catch {
      return body
    }
  }

  const loadContracts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API}/contracts`, {
        headers: requestHeaders(),
      })

      if (!response.ok) throw new Error(await readError(response))

      const data = await response.json()
      setContracts(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được hợp đồng')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadContracts()
  }, [loadContracts])

  const openRenewal = async (contract: Contract) => {
    setSelected(contract)
    setTermMonths('12')
    setRent(String(contract.rent ?? ''))
    setRenewals([])
    setHistoryError('')
    setNotice('')
    setHistoryLoading(true)

    try {
      const response = await fetch(
        `${API}/contracts/${contract.id}/renewals`,
        { headers: requestHeaders() },
      )

      if (!response.ok) throw new Error(await readError(response))

      const data: Renewal[] = await response.json()
      const history = Array.isArray(data) ? data : []

      setRenewals(history)

      // Dùng giá thuê của lần gia hạn gần nhất làm mặc định.
      const latestRenewal = [...history].sort((a, b) =>
        b.startDate.localeCompare(a.startDate),
      )[0]

      setRent(String(latestRenewal?.rent ?? contract.rent ?? ''))
    } catch (err) {
      setHistoryError(
        err instanceof Error
          ? err.message
          : 'Không tải được lịch sử gia hạn',
      )
    } finally {
      setHistoryLoading(false)
    }
  }

  const submitRenewal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected || saving) return

    const months = Number(termMonths)
    const rentValue = Number(rent)

    if (!Number.isInteger(months) || months < 1 || months > 120) {
      setNotice('Thời hạn gia hạn phải từ 1 đến 120 tháng.')
      return
    }

    if (!Number.isSafeInteger(rentValue) || rentValue <= 0) {
      setNotice('Giá thuê phải là số nguyên dương.')
      return
    }

    setSaving(true)
    setNotice('')

    try {
      const response = await fetch(
        `${API}/contracts/${selected.id}/renew`,
        {
          method: 'POST',
          headers: {
            ...requestHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            termMonths: months,
            rent: rentValue,
          }),
        },
      )

      if (!response.ok) throw new Error(await readError(response))

      setNotice('Gia hạn hợp đồng thành công.')
      await loadContracts()
      await openRenewal({
        ...selected,
        rent: selected.rent,
      })
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : 'Gia hạn hợp đồng thất bại',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 24, color: '#111827' }}>
      <h1>Quản lý hợp đồng</h1>
      <p>Theo dõi, gia hạn và xem lịch sử hợp đồng thuê phòng.</p>

      {notice && !selected && (
        <p role="status" style={{ color: '#15803d' }}>{notice}</p>
      )}

      {loading && <p>Đang tải hợp đồng...</p>}

      {error && (
        <p role="alert" style={{ color: '#dc2626' }}>{error}</p>
      )}

      {!loading && !error && (
        contracts.length === 0 ? (
          <p>Chưa có hợp đồng nào.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 950,
              }}
            >
              <thead>
                <tr>
                  {[
                    'Mã hợp đồng',
                    'Người thuê',
                    'Phòng',
                    'Tiền thuê',
                    'Tiền cọc',
                    'Ngày bắt đầu',
                    'Ngày kết thúc',
                    'Thao tác',
                  ].map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: 'left',
                        padding: 12,
                        borderBottom: '1px solid #ddd',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                      {contract.contractCode || `#${contract.id}`}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                      {contract.tenant?.fullName || contract.tenant?.name || '—'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                      {contract.room?.building?.name
                        ? `${contract.room.building.name} - `
                        : ''}
                      {contract.room?.code || contract.room?.name || '—'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                      {money(contract.rent)}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                      {money(contract.deposit)}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                      {contract.startDate || '—'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                      {contract.endDate || '—'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                      <button
                        type="button"
                        style={primaryButtonStyle}
                        onClick={() => void openRenewal(contract)}
                      >
                        Gia hạn
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {selected && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setSelected(null)
              setNotice('')
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
            zIndex: 1000,
            overflowY: 'auto',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="renewal-title"
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 760,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <h2 id="renewal-title" style={{ marginTop: 0 }}>
                Gia hạn hợp đồng {selected.contractCode || `#${selected.id}`}
              </h2>
              <button
                type="button"
                style={buttonStyle}
                disabled={saving}
                onClick={() => {
                  setSelected(null)
                  setNotice('')
                }}
              >
                Đóng
              </button>
            </div>

            <p>
              Phòng: {selected.room?.code || selected.room?.name || '—'}
              {' · '}
              Người thuê: {selected.tenant?.fullName || selected.tenant?.name || '—'}
            </p>
            <p>
              Ngày kết thúc hiện tại: <strong>{selected.endDate || '—'}</strong>
            </p>

            <form onSubmit={submitRenewal}>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="renewal-months">
                  Thời hạn gia hạn (tháng)
                </label>
                <input
                  id="renewal-months"
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  required
                  value={termMonths}
                  onChange={(event) => setTermMonths(event.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="renewal-rent">Giá thuê mỗi tháng (VNĐ)</label>
                <input
                  id="renewal-rent"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={rent}
                  onChange={(event) => setRent(event.target.value)}
                  style={inputStyle}
                />
                <small style={{ display: 'block', marginTop: 6, color: '#6b7280' }}>
                  Mặc định lấy giá thuê gần nhất. Có thể sửa nếu giá thuê thay đổi.
                </small>
              </div>

              {notice && (
                <p
                  role="status"
                  style={{
                    color: notice.includes('thành công') ? '#15803d' : '#dc2626',
                  }}
                >
                  {notice}
                </p>
              )}

              <button
                type="submit"
                style={primaryButtonStyle}
                disabled={saving || historyLoading}
              >
                {saving ? 'Đang xử lý...' : 'Xác nhận gia hạn'}
              </button>
            </form>

            <hr style={{ margin: '24px 0', border: 0, borderTop: '1px solid #e5e7eb' }} />

            <h3>Lịch sử gia hạn</h3>

            {historyLoading && <p>Đang tải lịch sử...</p>}

            {historyError && (
              <p role="alert" style={{ color: '#dc2626' }}>
                Không tải được lịch sử: {historyError}
              </p>
            )}

            {!historyLoading && !historyError && renewals.length === 0 && (
              <p>Hợp đồng chưa có lần gia hạn nào.</p>
            )}

            {renewals.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    minWidth: 560,
                  }}
                >
                  <thead>
                    <tr>
                      {['Ngày bắt đầu', 'Ngày kết thúc', 'Thời hạn', 'Giá thuê/tháng', 'Người thực hiện', 'Ngày ghi nhận'].map((label) => (
                        <th
                          key={label}
                          style={{
                            textAlign: 'left',
                            padding: 10,
                            borderBottom: '1px solid #ddd',
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...renewals]
                      .sort((a, b) => b.startDate.localeCompare(a.startDate))
                      .map((renewal) => (
                        <tr key={renewal.id}>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            {renewal.startDate}
                          </td>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            {renewal.endDate}
                          </td>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            {renewal.termMonths} tháng
                          </td>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            {money(renewal.rent)}
                          </td>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            {renewal.renewedByName || '—'}
                          </td>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            {formatDateTime(renewal.createdAt)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
