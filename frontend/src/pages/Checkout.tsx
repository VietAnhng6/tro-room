import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

type Contract = {
  id: number
  contractCode?: string
  tenant?: { name?: string; phone?: string }
  room?: { code?: string; building?: { name?: string } }
  rent?: number
  deposit?: number
  startDate?: string
  endDate?: string
  terminated?: boolean
  status?: string
}

type Deduction = { name: string; type: string; amount: number }
type FinalLine = {
  label: string
  type: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
  previousReading?: number | null
  currentReading?: number | null
}

type Settlement = {
  contractId: number
  contractCode: string
  roomCode: string
  buildingName: string
  tenantName: string
  tenantPhone: string
  checkoutDate: string
  lastElectricity: number
  lastWater: number
  finalElectricity: number
  finalWater: number
  depositAmount: number
  deductions: Deduction[]
  totalDeductions: number
  previousDebt: number
  finalInvoiceCode: string | null
  finalInvoiceLines: FinalLine[]
  finalInvoiceAmount: number
  refundAmount: number
  payableAmount: number
  earlyTerminated: boolean
  terminationReason: string | null
  createdAt: string | null
}

const CONTRACTS_API = '/api/landlord/requests/contracts'
const CHECKOUT_API = '/api/checkout'

const money = (value?: number | null) =>
  value == null ? '—' : `${Number(value).toLocaleString('vi-VN')} đ`

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function readError(response: Response): Promise<string> {
  const body = await response.text()
  if (!body) return `Yêu cầu thất bại (HTTP ${response.status})`
  try {
    const data = JSON.parse(body) as { message?: string; detail?: string; error?: string }
    return data.message || data.detail || data.error || body
  } catch {
    return body
  }
}

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: 9,
  fontSize: 14,
  marginTop: 6,
}

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#334155',
}

export default function Checkout() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [tab, setTab] = useState<'ACTIVE' | 'SETTLED'>('ACTIVE')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [selected, setSelected] = useState<Contract | null>(null)
  const [checkoutDate, setCheckoutDate] = useState('')
  const [finalElectricity, setFinalElectricity] = useState('')
  const [finalWater, setFinalWater] = useState('')
  const [deductions, setDeductions] = useState<{ name: string; amount: string }[]>([])
  const [earlyTermination, setEarlyTermination] = useState(false)
  const [terminationReason, setTerminationReason] = useState('')
  const [depositPenalty, setDepositPenalty] = useState('0')

  const [preview, setPreview] = useState<Settlement | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const loadContracts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(CONTRACTS_API, { headers: authHeaders() })
      if (!response.ok) throw new Error(await readError(response))
      const data: unknown = await response.json()
      setContracts(Array.isArray(data) ? (data as Contract[]) : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách hợp đồng')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadContracts()
  }, [loadContracts])

  const activeContracts = contracts.filter(
    (c) => c.status !== 'ENDED' && !c.terminated,
  )
  const settledContracts = contracts.filter(
    (c) => c.status === 'ENDED' || Boolean(c.terminated),
  )

  const currentList = tab === 'ACTIVE' ? activeContracts : settledContracts
  const totalPages = Math.max(1, Math.ceil(currentList.length / pageSize))
  const paginatedContracts = currentList.slice((page - 1) * pageSize, page * pageSize)

  const openCheckout = (contract: Contract) => {
    setSelected(contract)
    setCheckoutDate(new Date().toISOString().slice(0, 10))
    setFinalElectricity('')
    setFinalWater('')
    setDeductions([])
    setEarlyTermination(false)
    setTerminationReason('')
    setDepositPenalty('0')
    setPreview(null)
    setNotice('')
  }

  const openSavedSettlement = async (contract: Contract) => {
    setSelected(contract)
    setPreview(null)
    setNotice('')
    setBusy(true)
    try {
      const response = await fetch(`${CHECKOUT_API}/${contract.id}`, {
        headers: authHeaders(),
      })
      if (!response.ok) throw new Error(await readError(response))
      setPreview((await response.json()) as Settlement)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không tải được bảng tất toán')
    } finally {
      setBusy(false)
    }
  }

  const downloadPdfForContract = async (contract: Contract) => {
    try {
      const response = await fetch(`${CHECKOUT_API}/${contract.id}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      })
      if (!response.ok) throw new Error(await readError(response))
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `tat-toan-${contract.contractCode || contract.id}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không tải được PDF')
    }
  }

  const closeCheckout = () => {
    setSelected(null)
    setPreview(null)
    setNotice('')
  }

  const buildBody = () => ({
    actualCheckoutDate: checkoutDate,
    finalElectricity: finalElectricity === '' ? null : Number(finalElectricity),
    finalWater: finalWater === '' ? null : Number(finalWater),
    deductions: deductions
      .filter((d) => d.name.trim() !== '' && Number(d.amount) > 0)
      .map((d) => ({ name: d.name.trim(), amount: Number(d.amount) })),
    earlyTermination,
    terminationReason: terminationReason.trim() || null,
    depositPenaltyAmount: Number(depositPenalty) || 0,
  })

  const runPreview = async () => {
    if (!selected) return
    setBusy(true)
    setNotice('')
    try {
      const response = await fetch(`${CHECKOUT_API}/${selected.id}/preview`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(buildBody()),
      })
      if (!response.ok) throw new Error(await readError(response))
      setPreview((await response.json()) as Settlement)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không xem trước được bảng tất toán')
    } finally {
      setBusy(false)
    }
  }

  const runSettle = async () => {
    if (!selected) return
    setBusy(true)
    setNotice('')
    try {
      const response = await fetch(`${CHECKOUT_API}/${selected.id}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(buildBody()),
      })
      if (!response.ok) throw new Error(await readError(response))
      setPreview((await response.json()) as Settlement)
      setNotice('Tất toán thành công. Hợp đồng đã chuyển sang Đã kết thúc.')
      await loadContracts()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Tất toán thất bại')
    } finally {
      setBusy(false)
    }
  }

  const downloadPdf = async () => {
    if (!selected) return
    try {
      const response = await fetch(`${CHECKOUT_API}/${selected.id}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      })
      if (!response.ok) throw new Error(await readError(response))
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `tat-toan-${selected.contractCode || selected.id}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không tải được PDF')
    }
  }

  const addDeduction = () =>
    setDeductions((prev) => [...prev, { name: '', amount: '' }])

  const updateDeduction = (index: number, field: 'name' | 'amount', value: string) => {
    setDeductions((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    )
  }

  const removeDeduction = (index: number) =>
    setDeductions((prev) => prev.filter((_, i) => i !== index))

  const selectedEndDate = selected?.endDate
  const isEarly = selectedEndDate && checkoutDate && checkoutDate < selectedEndDate

  return (
    <div style={{ padding: 24, color: '#0f172a', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, margin: '0 0 8px', fontWeight: 800 }}>Trả phòng &amp; tất toán tiền cọc</h1>
      <p style={{ color: '#64748b', margin: '0 0 20px', lineHeight: 1.55 }}>
        Xử lý trả phòng: nhập ngày trả thực tế, chỉ số điện nước cuối cùng, khấu trừ hư hỏng và phạt cọc để hai bên cùng nhìn một bảng số liệu.
      </p>

      {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}
      {loading && <p>Đang tải hợp đồng...</p>}

      {!loading && !error && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setTab('ACTIVE')}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: 'none',
                background: tab === 'ACTIVE' ? '#2563eb' : '#f1f5f9',
                color: tab === 'ACTIVE' ? '#fff' : '#475569',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Chờ trả phòng ({activeContracts.length})
            </button>
            <button
              type="button"
              onClick={() => { setTab('ACTIVE'); setPage(1); }}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: 'none',
                background: tab === 'ACTIVE' ? '#2563eb' : '#f1f5f9',
                color: tab === 'ACTIVE' ? '#fff' : '#475569',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Chờ trả phòng ({activeContracts.length})
            </button>
            <button
              type="button"
              onClick={() => { setTab('SETTLED'); setPage(1); }}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: 'none',
                background: tab === 'SETTLED' ? '#2563eb' : '#f1f5f9',
                color: tab === 'SETTLED' ? '#fff' : '#475569',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Đã trả phòng ({settledContracts.length})
            </button>
          </div>

          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  {['Mã hợp đồng', 'Người thuê', 'Phòng', 'Tiền cọc', 'Ngày kết thúc', tab === 'ACTIVE' ? 'Thao tác' : 'Trạng thái & Thao tác'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e2e8f0', fontSize: 13, color: '#475569' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedContracts.map((contract) => (
                  <tr key={contract.id}>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{contract.contractCode || `#${contract.id}`}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{contract.tenant?.name || '—'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                      {contract.room?.building?.name ? `${contract.room.building.name} · ` : ''}
                      {contract.room?.code || '—'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{money(contract.deposit)}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{contract.endDate || '—'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                      {tab === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={() => openCheckout(contract)}
                          style={{
                            padding: '8px 14px',
                            border: '1px solid #2563eb',
                            background: '#2563eb',
                            color: '#fff',
                            borderRadius: 8,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Trả phòng
                        </button>
                      ) : (
                        <>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '5px 10px',
                              background: '#dcfce7',
                              color: '#166534',
                              borderRadius: 6,
                              fontWeight: 700,
                              fontSize: 13,
                              marginRight: 8,
                            }}
                          >
                            Đã trả phòng
                          </span>
                          <button
                            type="button"
                            onClick={() => openSavedSettlement(contract)}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              color: '#0f172a',
                              borderRadius: 6,
                              fontWeight: 600,
                              cursor: 'pointer',
                              marginRight: 6,
                              fontSize: 13,
                            }}
                          >
                            Xem tất toán
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadPdfForContract(contract)}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              color: '#2563eb',
                              borderRadius: 6,
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            Tải PDF
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {currentList.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                      {tab === 'ACTIVE'
                        ? 'Không có hợp đồng đang hiệu lực để trả phòng.'
                        : 'Chưa có hợp đồng nào đã trả phòng.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {currentList.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 16,
                padding: '12px 16px',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                flexWrap: 'wrap',
                gap: 12,
                fontSize: 14,
              }}
            >
              <div style={{ color: '#475569' }}>
                Hiển thị <strong>{Math.min(currentList.length, (page - 1) * pageSize + 1)}</strong> -{' '}
                <strong>{Math.min(currentList.length, page * pageSize)}</strong> trên tổng số{' '}
                <strong>{currentList.length}</strong> hợp đồng
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 7,
                    background: page <= 1 ? '#f8fafc' : '#fff',
                    color: page <= 1 ? '#94a3b8' : '#1e293b',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  ← Trang trước
                </button>

                <span style={{ color: '#334155', fontWeight: 650, fontSize: 13, padding: '0 6px' }}>
                  Trang {page} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '6px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 7,
                    background: page >= totalPages ? '#f8fafc' : '#fff',
                    color: page >= totalPages ? '#94a3b8' : '#1e293b',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  Trang sau →
                </button>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 7,
                    background: '#fff',
                    fontSize: 13,
                    color: '#334155',
                    cursor: 'pointer',
                    marginLeft: 8,
                  }}
                >
                  <option value={5}>5 / trang</option>
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}

      {selected && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget && !busy) closeCheckout()
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: 24,
            zIndex: 1000,
            overflowY: 'auto',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: 24,
              width: '100%',
              maxWidth: 860,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>
                  {selected.status === 'ENDED' || selected.terminated ? 'Bảng tất toán ' : 'Trả phòng '}
                  {selected.contractCode || `#${selected.id}`}
                </h2>
                {(selected.status === 'ENDED' || selected.terminated) && (
                  <span style={{ padding: '3px 9px', background: '#dcfce7', color: '#166534', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                    Đã trả phòng
                  </span>
                )}
              </div>
              <button type="button" onClick={closeCheckout} disabled={busy} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
                Đóng
              </button>
            </div>

            <p style={{ color: '#64748b', margin: '0 0 16px' }}>
              {selected.room?.building?.name ? `${selected.room.building.name} · ` : ''}
              Phòng {selected.room?.code || '—'} · Người thuê {selected.tenant?.name || '—'} · Tiền cọc {money(selected.deposit)}
            </p>

            {selected.status !== 'ENDED' && !selected.terminated && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Ngày trả thực tế</label>
                    <input type="date" value={checkoutDate} onChange={(e) => setCheckoutDate(e.target.value)} style={inputStyle} />
                  </div>
                  <div />
                  <div>
                    <label style={labelStyle}>Chỉ số điện cuối cùng</label>
                    <input type="number" min="0" value={finalElectricity} onChange={(e) => setFinalElectricity(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Chỉ số nước cuối cùng</label>
                    <input type="number" min="0" value={finalWater} onChange={(e) => setFinalWater(e.target.value)} style={inputStyle} />
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      id="early-termination"
                      checked={earlyTermination || Boolean(isEarly)}
                      onChange={(e) => setEarlyTermination(e.target.checked)}
                    />
                    <label htmlFor="early-termination" style={{ ...labelStyle, marginTop: 0, fontSize: 14 }}>
                      Chấm dứt trước hạn (phải nhập lý do)
                    </label>
                  </div>
                  {(earlyTermination || isEarly) && (
                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={labelStyle}>Lý do chấm dứt</label>
                        <textarea
                          value={terminationReason}
                          onChange={(e) => setTerminationReason(e.target.value)}
                          rows={2}
                          style={{ ...inputStyle, resize: 'vertical' as const }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Mức phạt cọc (VNĐ, 0 nếu không phạt)</label>
                        <input type="number" min="0" value={depositPenalty} onChange={(e) => setDepositPenalty(e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={labelStyle}>Khoản khấu trừ hư hỏng</label>
                    <button type="button" onClick={addDeduction} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
                      + Thêm khoản khấu trừ
                    </button>
                  </div>
                  {deductions.map((d, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 40px', gap: 8, marginBottom: 8 }}>
                      <input
                        placeholder="Tên khoản (VD: Sửa cửa, thay bóng đèn...)"
                        value={d.name}
                        onChange={(e) => updateDeduction(index, 'name', e.target.value)}
                        style={inputStyle}
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Số tiền"
                        value={d.amount}
                        onChange={(e) => updateDeduction(index, 'amount', e.target.value)}
                        style={inputStyle}
                      />
                      <button type="button" onClick={() => removeDeduction(index)} style={{ border: '1px solid #fecaca', background: '#fff', borderRadius: 8, color: '#dc2626', cursor: 'pointer' }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {notice && (
                  <p role="status" style={{ color: notice.includes('thành công') ? '#15803d' : '#dc2626', margin: '14px 0 0', fontWeight: 650 }}>
                    {notice}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button type="button" onClick={runPreview} disabled={busy} style={{ padding: '10px 16px', border: '1px solid #2563eb', background: '#fff', color: '#2563eb', borderRadius: 9, fontWeight: 700, cursor: 'pointer' }}>
                    {busy ? 'Đang xử lý...' : 'Xem trước bảng tất toán'}
                  </button>
                  <button type="button" onClick={runSettle} disabled={busy} style={{ padding: '10px 16px', border: '1px solid #2563eb', background: '#2563eb', color: '#fff', borderRadius: 9, fontWeight: 700, cursor: 'pointer' }}>
                    Xác nhận tất toán
                  </button>
                </div>
              </>
            )}

            {busy && !preview && (
              <p style={{ margin: '16px 0', color: '#64748b' }}>Đang tải bảng tất toán...</p>
            )}

            {preview && (
              <div style={{ marginTop: 22, border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Bảng tất toán</h3>
                  <button type="button" onClick={downloadPdf} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontWeight: 650 }}>
                    Tải PDF
                  </button>
                </div>

                <p style={{ margin: '0 0 10px', color: '#475569', fontSize: 13 }}>
                  Chỉ số chốt gần nhất: điện {preview.lastElectricity} → {preview.finalElectricity} · nước {preview.lastWater} → {preview.finalWater}
                </p>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Tiền cọc</td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#15803d' }}>+{money(preview.depositAmount)}</td>
                    </tr>
                    {preview.deductions.map((d, i) => (
                      <tr key={i}>
                        <td style={{ padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>
                          Khấu trừ: {d.name}
                        </td>
                        <td style={{ padding: '8px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#dc2626' }}>-{money(d.amount)}</td>
                      </tr>
                    ))}
                    {preview.previousDebt > 0 && (
                      <tr>
                        <td style={{ padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Công nợ kỳ trước</td>
                        <td style={{ padding: '8px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#dc2626' }}>-{money(preview.previousDebt)}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Hoá đơn kỳ cuối</td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#dc2626' }}>-{money(preview.finalInvoiceAmount)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 6px', fontWeight: 800 }}>
                        {preview.refundAmount > 0 ? 'Tiền hoàn lại cho khách' : 'Khách phải trả thêm'}
                      </td>
                      <td style={{ padding: '10px 6px', fontWeight: 800, textAlign: 'right', color: preview.refundAmount > 0 ? '#15803d' : '#dc2626' }}>
                        {preview.refundAmount > 0 ? money(preview.refundAmount) : money(preview.payableAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {preview.finalInvoiceLines.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <strong style={{ fontSize: 13 }}>Chi tiết hoá đơn kỳ cuối:</strong>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: '#475569' }}>
                      {preview.finalInvoiceLines.map((l, i) => (
                        <li key={i}>
                          {l.label}: {money(l.amount)}
                          {l.previousReading != null && l.currentReading != null
                            ? ` (${l.previousReading} → ${l.currentReading} ${l.unit})`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {preview.earlyTerminated && (
                  <p style={{ margin: '12px 0 0', color: '#9a3412', fontSize: 13 }}>
                    Chấm dứt trước hạn. Lý do: {preview.terminationReason || '—'}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
