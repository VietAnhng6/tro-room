import React, { useCallback, useEffect, useState } from 'react'

type Building = {
  id: number
  name: string
  address?: string
}

type DebtInvoiceItem = {
  id: number
  invoiceCode: string
  period: string
  issueDate: string | null
  dueDate: string | null
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  daysOverdue: number
  status: string
}

type RoomDebtItem = {
  buildingId: number
  buildingName: string
  roomId: number
  roomCode: string
  contractId: number | null
  contractCode: string | null
  tenantName: string
  tenantPhone: string
  unpaidInvoiceCount: number
  totalRemainingDebt: number
  oldestDueDate: string | null
  maxDaysOverdue: number
  unpaidInvoices: DebtInvoiceItem[]
}

type DebtSummaryResponse = {
  items: RoomDebtItem[]
  totalRoomsWithDebt: number
  totalRemainingDebt: number
  totalUnpaidInvoices: number
}

const API = 'http://localhost:8080'
const getToken = () => localStorage.getItem('accessToken')

function formatMoney(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ'
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const parts = value.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return value
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  backgroundColor: '#fff',
  color: '#374151',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  transition: 'all 0.15s ease',
}

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#2563eb',
  color: '#fff',
  border: '1px solid #2563eb',
}

const successButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#16a34a',
  color: '#fff',
  border: '1px solid #16a34a',
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

export default function Debts() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Filters
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('')
  const [minOverdueDays, setMinOverdueDays] = useState<string>('')
  const [maxOverdueDays, setMaxOverdueDays] = useState<string>('')
  const [minDebtAmount, setMinDebtAmount] = useState<string>('')
  const [maxDebtAmount, setMaxDebtAmount] = useState<string>('')

  // Data
  const [debtData, setDebtData] = useState<DebtSummaryResponse>({
    items: [],
    totalRoomsWithDebt: 0,
    totalRemainingDebt: 0,
    totalUnpaidInvoices: 0,
  })

  // Selected room for detail modal
  const [selectedRoom, setSelectedRoom] = useState<RoomDebtItem | null>(null)

  // Payment modal state
  const [payingInvoice, setPayingInvoice] = useState<DebtInvoiceItem | null>(null)
  const [payAmount, setPayAmount] = useState<string>('')
  const [submittingPayment, setSubmittingPayment] = useState(false)

  // Load buildings
  const loadBuildings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/buildings`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const data = await res.json()
        setBuildings(Array.isArray(data) ? data : [])
      }
    } catch {
      // ignore
    }
  }, [])

  // Load debts
  const loadDebts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedBuildingId) params.append('buildingId', selectedBuildingId)
      if (minOverdueDays) params.append('minOverdueDays', minOverdueDays)
      if (maxOverdueDays) params.append('maxOverdueDays', maxOverdueDays)
      if (minDebtAmount) params.append('minDebtAmount', minDebtAmount)
      if (maxDebtAmount) params.append('maxDebtAmount', maxDebtAmount)

      const res = await fetch(`${API}/api/debts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })

      if (!res.ok) {
        const errText = await res.text()
        let errMsg = 'Không thể tải danh sách công nợ'
        try {
          const errObj = JSON.parse(errText)
          errMsg = errObj.message || errMsg
        } catch {
          if (errText) errMsg = errText
        }
        throw new Error(errMsg)
      }

      const data: DebtSummaryResponse = await res.json()
      setDebtData(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }, [selectedBuildingId, minOverdueDays, maxOverdueDays, minDebtAmount, maxDebtAmount])

  useEffect(() => {
    void loadBuildings()
    void loadDebts()
  }, [loadBuildings, loadDebts])

  // Reset filters
  const resetFilters = () => {
    setSelectedBuildingId('')
    setMinOverdueDays('')
    setMaxOverdueDays('')
    setMinDebtAmount('')
    setMaxDebtAmount('')
  }

  // Quick filter presets
  const applyQuickFilter = (type: string) => {
    if (type === 'ALL') {
      resetFilters()
    } else if (type === 'OVERDUE') {
      setMinOverdueDays('1')
      setMaxOverdueDays('')
    } else if (type === 'LONG_OVERDUE') {
      setMinOverdueDays('30')
      setMaxOverdueDays('')
    } else if (type === 'HIGH_DEBT') {
      setMinDebtAmount('3000000')
      setMaxDebtAmount('')
    }
  }

  // Xuất file CSV (có chèn BOM \ufeff để Excel tiếng Việt không bị lỗi font)
  const handleExportCsv = () => {
    if (!debtData.items || debtData.items.length === 0) {
      alert('Không có dữ liệu công nợ để xuất file.')
      return
    }

    const headers = [
      'STT',
      'Tòa nhà',
      'Phòng',
      'Người đứng tên',
      'Số điện thoại',
      'Số HĐ chưa trả hết',
      'Tổng còn thiếu (VNĐ)',
      'Hạn thanh toán cũ nhất',
      'Số ngày quá hạn dài nhất',
    ]

    const rows = debtData.items.map((item, index) => {
      const overdueText =
        item.maxDaysOverdue > 0
          ? `${item.maxDaysOverdue} ngày`
          : item.maxDaysOverdue === 0
          ? 'Đến hạn hôm nay'
          : 'Chưa đến hạn'

      return [
        index + 1,
        `"${(item.buildingName || '').replace(/"/g, '""')}"`,
        `"${(item.roomCode || '').replace(/"/g, '""')}"`,
        `"${(item.tenantName || '').replace(/"/g, '""')}"`,
        `"${(item.tenantPhone || '').replace(/"/g, '""')}"`,
        item.unpaidInvoiceCount,
        item.totalRemainingDebt,
        `"${item.oldestDueDate || '—'}"`,
        `"${overdueText}"`,
      ].join(',')
    })

    // Dòng tổng cộng số tiền còn thiếu của tập kết quả đang lọc
    const summaryRow = [
      '',
      '"TỔNG CỘNG"',
      '',
      '',
      '',
      `"${debtData.totalUnpaidInvoices}"`,
      `"${debtData.totalRemainingDebt}"`,
      '',
      '',
    ].join(',')

    const csvBody = [headers.join(','), ...rows, summaryRow].join('\r\n')

    // Bắt buộc chèn BOM '\ufeff' vào đầu file để Excel không bị lỗi font tiếng Việt
    const blob = new Blob(['\ufeff' + csvBody], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `CongNo_Phong_Toa_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Record payment
  const handleOpenPayment = (inv: DebtInvoiceItem) => {
    setPayingInvoice(inv)
    setPayAmount(String(inv.remainingAmount))
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payingInvoice) return

    const amount = Number(payAmount)
    if (!amount || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ (> 0)')
      return
    }

    setSubmittingPayment(true)
    try {
      const res = await fetch(`${API}/api/debts/invoices/${payingInvoice.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ amount, note: 'Thu nợ tiền phòng' }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Không thể ghi nhận thanh toán')
      }

      setNotice(`Đã thu ${formatMoney(amount)} cho hoá đơn ${payingInvoice.invoiceCode}`)
      setPayingInvoice(null)
      setSelectedRoom(null)
      await loadDebts()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi thu tiền')
    } finally {
      setSubmittingPayment(false)
    }
  }

  const maxOverdueDaysOverall = debtData.items.reduce(
    (max, item) => Math.max(max, item.maxDaysOverdue),
    0
  )

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', fontFamily: 'inherit', color: '#111827' }}>
      {/* Tiêu đề trang */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: 26, fontWeight: 700, color: '#1f2937' }}>
            Xem công nợ theo phòng và theo toà
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            Theo dõi chi tiết số tiền còn thiếu, số hoá đơn chưa trả và số ngày quá hạn dài nhất để thu tiền kịp thời.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCsv}
            disabled={debtData.items.length === 0}
            style={{
              ...successButtonStyle,
              opacity: debtData.items.length === 0 ? 0.6 : 1,
            }}
            title="Xuất danh sách công nợ đang lọc ra file CSV mã hoá UTF-8 có chèn BOM"
          >
            📥 Xuất file CSV (UTF-8)
          </button>
        </div>
      </div>

      {notice && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, color: '#065f46', marginBottom: 20 }}>
          ✓ {notice}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', marginBottom: 20 }}>
          ✕ {error}
        </div>
      )}

      {/* 4 Thẻ chỉ số tổng quan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)', border: '1px solid #fca5a5', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Tổng còn thiếu (đang lọc)
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#dc2626', marginTop: 8 }}>
            {formatMoney(debtData.totalRemainingDebt)}
          </div>
          <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>
            Tổng số tiền chủ nhà cần thu
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Số phòng có công nợ
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginTop: 8 }}>
            {debtData.totalRoomsWithDebt} <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>phòng</span>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            Trong danh sách kết quả đang lọc
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Số HĐ chưa trả hết
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#d97706', marginTop: 8 }}>
            {debtData.totalUnpaidInvoices} <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>hóa đơn</span>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            Chưa thanh toán hoặc trả thiếu
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Quá hạn dài nhất
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: maxOverdueDaysOverall > 0 ? '#b91c1c' : '#16a34a', marginTop: 8 }}>
            {maxOverdueDaysOverall > 0 ? `${maxOverdueDaysOverall} ngày` : '0 ngày'}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            Tính từ ngày hôm nay trừ hạn cũ nhất
          </div>
        </div>
      </div>

      {/* 2. Bộ lọc: Toà nhà, khoảng ngày quá hạn, ngưỡng số tiền còn thiếu */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#374151' }}>
            Bộ lọc công nợ
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => applyQuickFilter('ALL')}
              style={{ ...buttonStyle, padding: '4px 10px', fontSize: 12 }}
            >
              Tất cả
            </button>
            <button
              onClick={() => applyQuickFilter('OVERDUE')}
              style={{ ...buttonStyle, padding: '4px 10px', fontSize: 12, color: '#b91c1c', borderColor: '#fca5a5' }}
            >
              Đã quá hạn (&gt; 0 ngày)
            </button>
            <button
              onClick={() => applyQuickFilter('LONG_OVERDUE')}
              style={{ ...buttonStyle, padding: '4px 10px', fontSize: 12, color: '#991b1b', borderColor: '#f87171' }}
            >
              Quá hạn lâu (&ge; 30 ngày)
            </button>
            <button
              onClick={() => applyQuickFilter('HIGH_DEBT')}
              style={{ ...buttonStyle, padding: '4px 10px', fontSize: 12, color: '#d97706', borderColor: '#fcd34d' }}
            >
              Nợ lớn (&ge; 3 triệu)
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
          {/* Lọc theo toà nhà */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
              Tòa nhà
            </label>
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Tất cả tòa nhà --</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo khoảng ngày quá hạn: từ ngày */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
              Quá hạn từ (ngày)
            </label>
            <input
              type="number"
              min="0"
              placeholder="VD: 1"
              value={minOverdueDays}
              onChange={(e) => setMinOverdueDays(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Lọc theo khoảng ngày quá hạn: đến ngày */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
              Đến (ngày)
            </label>
            <input
              type="number"
              min="0"
              placeholder="VD: 60"
              value={maxOverdueDays}
              onChange={(e) => setMaxOverdueDays(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Ngưỡng số tiền còn thiếu: từ */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
              Nợ từ (VNĐ)
            </label>
            <input
              type="number"
              min="0"
              step="100000"
              placeholder="VD: 1000000"
              value={minDebtAmount}
              onChange={(e) => setMinDebtAmount(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Ngưỡng số tiền còn thiếu: đến */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
              Nợ đến (VNĐ)
            </label>
            <input
              type="number"
              min="0"
              step="100000"
              placeholder="VD: 10000000"
              value={maxDebtAmount}
              onChange={(e) => setMaxDebtAmount(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Nút lọc & Đặt lại */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => void loadDebts()}
              style={{ ...primaryButtonStyle, flex: 1, justifyContent: 'center' }}
            >
              Lọc
            </button>
            <button
              onClick={() => {
                resetFilters()
                setTimeout(() => void loadDebts(), 0)
              }}
              style={{ ...buttonStyle, justifyContent: 'center' }}
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {/* 1. Bảng danh sách công nợ & 3. Dòng tổng cộng */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
            Đang tải dữ liệu công nợ...
          </div>
        ) : debtData.items.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Không có phòng nào nợ tiền theo điều kiện lọc
            </div>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 16px 0' }}>
              Tất cả các phòng đã thanh toán đủ hoặc không khớp với bộ lọc hiện tại.
            </p>
            <button onClick={resetFilters} style={buttonStyle}>
              Xoá bộ lọc
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                  <th style={{ padding: '14px 16px', width: 50 }}>STT</th>
                  <th style={{ padding: '14px 16px' }}>Tòa nhà</th>
                  <th style={{ padding: '14px 16px' }}>Phòng</th>
                  <th style={{ padding: '14px 16px' }}>Người đứng tên</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Số HĐ chưa trả hết</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Tổng còn thiếu</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Hạn thanh toán cũ nhất</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Số ngày quá hạn dài nhất</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', width: 140 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {debtData.items.map((item, index) => {
                  const isOverdue = item.maxDaysOverdue > 0
                  const isMultiPeriod = item.unpaidInvoiceCount >= 2

                  return (
                    <tr
                      key={item.roomId}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa',
                        transition: 'background-color 0.1s',
                      }}
                    >
                      <td style={{ padding: '14px 16px', color: '#6b7280' }}>
                        {index + 1}
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 500, color: '#1f2937' }}>
                        {item.buildingName}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: '#2563eb', padding: '3px 8px', backgroundColor: '#eff6ff', borderRadius: 6 }}>
                          {item.roomCode}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{item.tenantName}</div>
                        {item.tenantPhone && item.tenantPhone !== '—' && (
                          <div style={{ fontSize: 12, color: '#6b7280' }}>📞 {item.tenantPhone}</div>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                            backgroundColor: isMultiPeriod ? '#fee2e2' : '#fef3c7',
                            color: isMultiPeriod ? '#991b1b' : '#92400e',
                          }}
                        >
                          {item.unpaidInvoiceCount} kỳ
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#dc2626' }}>
                          {formatMoney(item.totalRemainingDebt)}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#4b5563' }}>
                        {formatDate(item.oldestDueDate)}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {isOverdue ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 700,
                              backgroundColor: item.maxDaysOverdue >= 30 ? '#7f1d1d' : '#ef4444',
                              color: '#fff',
                            }}
                          >
                            Quá hạn {item.maxDaysOverdue} ngày
                          </span>
                        ) : item.maxDaysOverdue === 0 ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                            }}
                          >
                            Đến hạn hôm nay
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 500,
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                            }}
                          >
                            Chưa đến hạn
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedRoom(item)}
                          style={{
                            ...buttonStyle,
                            padding: '6px 12px',
                            fontSize: 13,
                            color: '#2563eb',
                            borderColor: '#bfdbfe',
                            backgroundColor: '#eff6ff',
                          }}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* 3. Dòng tổng cộng số tiền còn thiếu của tập kết quả đang lọc */}
              <tfoot>
                <tr
                  style={{
                    backgroundColor: '#fef2f2',
                    borderTop: '2px solid #f87171',
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  <td colSpan={4} style={{ padding: '16px 20px', color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    TỔNG CỘNG ({debtData.items.length} phòng)
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#991b1b' }}>
                    {debtData.totalUnpaidInvoices} kỳ
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', color: '#b91c1c', fontSize: 17, fontWeight: 800 }}>
                    {formatMoney(debtData.totalRemainingDebt)}
                  </td>
                  <td colSpan={3} style={{ padding: '16px 20px', color: '#7f1d1d', fontSize: 13, textAlign: 'right' }}>
                    * Tổng số tiền còn thiếu của tập kết quả đang lọc
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Chi tiết các hoá đơn chưa trả hết của một phòng */}
      {selectedRoom && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedRoom(null)
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              maxWidth: 850,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: 28,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: 20, fontWeight: 700, color: '#111827' }}>
                  Chi tiết công nợ — Phòng {selectedRoom.roomCode}
                </h3>
                <div style={{ fontSize: 14, color: '#6b7280' }}>
                  {selectedRoom.buildingName} · Người thuê: <strong>{selectedRoom.tenantName}</strong> (SĐT: {selectedRoom.tenantPhone})
                </div>
              </div>

              <button
                onClick={() => setSelectedRoom(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 22,
                  cursor: 'pointer',
                  color: '#9ca3af',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#fef2f2', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}>TỔNG NỢ CÒN THIẾU CỦA PHÒNG</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                  {formatMoney(selectedRoom.totalRemainingDebt)}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 13, color: '#7f1d1d' }}>
                Gồm <strong>{selectedRoom.unpaidInvoiceCount}</strong> hóa đơn chưa trả hết
                <br />
                Quá hạn dài nhất: <strong>{selectedRoom.maxDaysOverdue} ngày</strong>
              </div>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#4b5563' }}>
                    <th style={{ padding: '10px 12px' }}>Mã hoá đơn</th>
                    <th style={{ padding: '10px 12px' }}>Kỳ</th>
                    <th style={{ padding: '10px 12px' }}>Hạn thanh toán</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tổng tiền</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Đã trả</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Còn thiếu</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Quá hạn</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Thu tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRoom.unpaidInvoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#2563eb' }}>
                        {inv.invoiceCode}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{inv.period}</td>
                      <td style={{ padding: '10px 12px' }}>{formatDate(inv.dueDate)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {formatMoney(inv.totalAmount)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a' }}>
                        {formatMoney(inv.paidAmount)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                        {formatMoney(inv.remainingAmount)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {inv.daysOverdue > 0 ? (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>{inv.daysOverdue} ngày</span>
                        ) : (
                          <span style={{ color: '#16a34a' }}>Đúng hạn</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenPayment(inv)}
                          style={{
                            ...successButtonStyle,
                            padding: '4px 10px',
                            fontSize: 12,
                          }}
                        >
                          Thu tiền
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => setSelectedRoom(null)}
                style={buttonStyle}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ghi nhận thanh toán / thu tiền */}
      {payingInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayingInvoice(null)
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 700 }}>
              Ghi nhận thu tiền — {payingInvoice.invoiceCode}
            </h3>

            <div style={{ fontSize: 14, color: '#4b5563', marginBottom: 16 }}>
              Kỳ: <strong>{payingInvoice.period}</strong> · Tổng: {formatMoney(payingInvoice.totalAmount)}
              <br />
              Đã thu: {formatMoney(payingInvoice.paidAmount)} · Còn thiếu: <strong style={{ color: '#dc2626' }}>{formatMoney(payingInvoice.remainingAmount)}</strong>
            </div>

            <form onSubmit={handleSubmitPayment}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Số tiền thu lần này (VNĐ)
                </label>
                <input
                  type="number"
                  min="1"
                  max={payingInvoice.remainingAmount}
                  step="1000"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(payingInvoice.remainingAmount))}
                    style={{ ...buttonStyle, padding: '4px 8px', fontSize: 11 }}
                  >
                    Thu hết ({formatMoney(payingInvoice.remainingAmount)})
                  </button>
                  {payingInvoice.remainingAmount > 1000000 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(Math.floor(payingInvoice.remainingAmount / 2)))}
                      style={{ ...buttonStyle, padding: '4px 8px', fontSize: 11 }}
                    >
                      Thu một nửa (50%)
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  style={buttonStyle}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  style={successButtonStyle}
                >
                  {submittingPayment ? 'Đang lưu...' : 'Xác nhận thu tiền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
