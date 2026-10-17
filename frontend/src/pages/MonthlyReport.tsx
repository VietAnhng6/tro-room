import { useEffect, useState } from 'react'

type BuildingOption = {
  id: number
  name: string
}

type MonthSummary = {
  period: string
  issuedAmount: number
  collectedAmount: number
  outstandingAmount: number
  collectionRatePercent: number
  occupiedRooms: number
  totalRooms: number
  occupancyRatePercent: number
}

type ReportResponse = {
  buildings: BuildingOption[]
  months: MonthSummary[]
  hasInvoiceData: boolean
  recentMonths: {
    period: string
    issuedAmount: number
    collectedAmount: number
  }[]
  hasRecentInvoiceData: boolean
}

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const monthLabel = (period: string) => {
  const [year, month] = period.split('-')
  return `${month}/${year}`
}

const amount = (value: number) => money.format(value)

function initialPeriods() {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth() - 5, 1)
  const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  return { from: format(from), to: format(to) }
}

export default function MonthlyReport() {
  const [initial] = useState(initialPeriods)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [buildingId, setBuildingId] = useState('')
  const [report, setReport] = useState<ReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const token = localStorage.getItem('accessToken')
    const params = new URLSearchParams({ from, to })
    if (buildingId) params.set('buildingId', buildingId)

    fetch(`http://localhost:8080/api/reports/monthly?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw new Error(body?.message || 'Không thể tải báo cáo tháng.')
        }
        return response.json() as Promise<ReportResponse>
      })
      .then(setReport)
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải báo cáo tháng.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [from, to, buildingId])

  const months = report?.months ?? []
  const totals = months.reduce(
    (result, month) => ({
      issued: result.issued + month.issuedAmount,
      collected: result.collected + month.collectedAmount,
      outstanding: result.outstanding + month.outstandingAmount,
    }),
    { issued: 0, collected: 0, outstanding: 0 },
  )
  const collectionRate = totals.issued
    ? (totals.collected / totals.issued) * 100
    : 0
  const chartMonths = report?.recentMonths ?? []
  const chartMax = Math.max(
    1,
    ...chartMonths.flatMap((month) => [month.issuedAmount, month.collectedAmount]),
  )
  const chartBaseY = 210
  const chartHeight = 160
  const chartGroupWidth = chartMonths.length ? 640 / chartMonths.length : 0
  const barWidth = Math.min(24, chartGroupWidth * 0.28)

  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px 40px', color: '#0f172a' }}>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Báo cáo doanh thu &amp; lấp đầy</h1>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
          Theo dõi hóa đơn đã phát hành, tiền đã thu và tình trạng phòng theo tháng.
        </p>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 12 }}>
          Tỷ lệ lấp đầy chỉ tính các phòng hiện ở trạng thái trống, đã cọc hoặc đang thuê;
          hệ thống chưa lưu lịch sử trạng thái phòng theo tháng.
        </p>
      </header>

      <section
        aria-label="Bộ lọc báo cáo"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'end',
          gap: 14,
          padding: 18,
          marginBottom: 20,
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          background: '#fff',
        }}
      >
        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 13, fontWeight: 700 }}>
          Từ tháng
          <input
            type="month"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value)
              setLoading(true)
              setError('')
            }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 13, fontWeight: 700 }}>
          Đến tháng
          <input
            type="month"
            value={to}
            onChange={(event) => {
              setTo(event.target.value)
              setLoading(true)
              setError('')
            }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 13, fontWeight: 700 }}>
          Tòa nhà
          <select
            value={buildingId}
            onChange={(event) => {
              setBuildingId(event.target.value)
              setLoading(true)
              setError('')
            }}
          >
            <option value="">Tất cả tòa nhà</option>
            {(report?.buildings ?? []).map((building) => (
              <option key={building.id} value={building.id}>{building.name}</option>
            ))}
          </select>
        </label>
        <span style={{ color: '#64748b', fontSize: 12 }}>
          Mỗi lần xem tối đa 12 tháng.
        </span>
      </section>

      {error && (
        <div role="alert" style={{ marginBottom: 18, padding: 14, borderRadius: 10, background: '#fef2f2', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p role="status" style={{ color: '#64748b' }}>Đang tải báo cáo…</p>
      ) : report && (
        <>
          {!report.hasInvoiceData && (
            <p role="status" style={{ marginBottom: 18, color: '#64748b' }}>
              Không có dữ liệu hóa đơn trong khoảng tháng đã chọn.
            </p>
          )}

          <section
            aria-label="Tổng hợp trong khoảng thời gian"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 14,
              marginBottom: 20,
            }}
          >
            {[
              { label: 'Tổng đã phát hành', value: amount(totals.issued), color: '#2563eb' },
              { label: 'Tổng đã thu', value: amount(totals.collected), color: '#059669' },
              { label: 'Còn phải thu', value: amount(totals.outstanding), color: '#d97706' },
              { label: 'Tỷ lệ thu', value: `${collectionRate.toFixed(2)}%`, color: '#7c3aed' },
            ].map((card) => (
              <article key={card.label} style={{ padding: 18, border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff' }}>
                <div style={{ color: '#64748b', fontSize: 13, fontWeight: 700 }}>{card.label}</div>
                <div style={{ marginTop: 10, color: card.color, fontSize: 21, fontWeight: 800 }}>{card.value}</div>
              </article>
            ))}
          </section>

          <section style={{ marginBottom: 20, padding: 20, border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 17 }}>Doanh thu 6 tháng gần nhất</h2>
            <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: 13 }}>
              Tính từ tháng hiện tại, theo bộ lọc tòa nhà.
            </p>
            <div style={{ display: 'flex', gap: 18, marginBottom: 8, color: '#475569', fontSize: 12 }}>
              <span><i style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: '#93c5fd' }} />Đã phát hành</span>
              <span><i style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: '#10b981' }} />Đã thu</span>
            </div>
            {!report.hasRecentInvoiceData && (
              <p role="status" style={{ color: '#64748b' }}>
                Không có dữ liệu hóa đơn trong 6 tháng gần nhất.
              </p>
            )}
            {chartMonths.length ? (
              <svg
                role="img"
                aria-label="Biểu đồ cột tiền đã phát hành và đã thu theo tháng"
                viewBox="0 0 720 260"
                style={{ display: 'block', width: '100%', minHeight: 210 }}
              >
                {[0, 1, 2, 3].map((line) => {
                  const y = chartBaseY - (chartHeight * line) / 3
                  return <line key={line} x1="48" x2="700" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                })}
                {chartMonths.map((month, index) => {
                  const center = 60 + chartGroupWidth * index + chartGroupWidth / 2
                  const issuedHeight = (month.issuedAmount / chartMax) * chartHeight
                  const collectedHeight = (month.collectedAmount / chartMax) * chartHeight
                  return (
                    <g key={month.period}>
                      <rect
                        x={center - barWidth - 2}
                        y={chartBaseY - issuedHeight}
                        width={barWidth}
                        height={issuedHeight}
                        rx="3"
                        fill="#93c5fd"
                      >
                        <title>{`${monthLabel(month.period)} · Đã phát hành: ${amount(month.issuedAmount)}`}</title>
                      </rect>
                      <rect
                        x={center + 2}
                        y={chartBaseY - collectedHeight}
                        width={barWidth}
                        height={collectedHeight}
                        rx="3"
                        fill="#10b981"
                      >
                        <title>{`${monthLabel(month.period)} · Đã thu: ${amount(month.collectedAmount)}`}</title>
                      </rect>
                      <text x={center} y="235" textAnchor="middle" fill="#64748b" fontSize="12">
                        {monthLabel(month.period)}
                      </text>
                    </g>
                  )
                })}
              </svg>
            ) : (
              <p style={{ color: '#64748b' }}>Chưa có dữ liệu trong khoảng tháng này.</p>
            )}
          </section>

          <section style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  {['Tháng', 'Đã phát hành', 'Đã thu', 'Còn phải thu', 'Tỷ lệ thu', 'Phòng đang thuê', 'Tỷ lệ lấp đầy'].map((heading) => (
                    <th key={heading} style={{ padding: '13px 14px', color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((month) => (
                  <tr key={month.period} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '13px 14px', fontWeight: 700 }}>{monthLabel(month.period)}</td>
                    <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>{amount(month.issuedAmount)}</td>
                    <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>{amount(month.collectedAmount)}</td>
                    <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>{amount(month.outstandingAmount)}</td>
                    <td style={{ padding: '13px 14px' }}>{month.collectionRatePercent.toFixed(2)}%</td>
                    <td style={{ padding: '13px 14px' }}>
                      {month.totalRooms === 0
                        ? 'Không có phòng đang cho thuê'
                        : `${month.occupiedRooms} / ${month.totalRooms}`}
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      {month.totalRooms === 0
                        ? '—'
                        : `${month.occupancyRatePercent.toFixed(2)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  )
}
