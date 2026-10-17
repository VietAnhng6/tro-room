
import React, { useEffect, useState } from 'react'

type Building = {
  id: number
  name: string
  address?: string
}

type Readiness = {
  buildingId: number
  period: string
  total: number
  recorded: number
  remaining: number
}

type Item = {
  id?: number
  label: string
  type: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
  previousReading: number | null
  currentReading: number | null
  note?: string | null
}

type Invoice = {
  id: number
  invoiceCode: string
  contractId: number | null
  contractCode: string | null
  roomId: number | null
  roomCode: string | null
  tenantName: string | null
  period: string
  rentAmount: number
  totalAmount: number
  status: string
  cancellationReason?: string | null
  issueDate: string | null
  dueDate: string | null
  items?: Item[]
}

type SkippedRoom = {
  contractId: number
  roomId: number
  roomCode: string
  reason: string
}

type GenerateResult = {
  buildingId: number
  period: string
  totalRooms: number
  created: number
  skippedRooms: SkippedRoom[]
}

const API = ''

const getToken = () => localStorage.getItem('accessToken')

async function readResponse(res: Response) {
  const text = await res.text()

  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ'
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'

  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Nháp',
  ISSUED: 'Đã phát hành',
  CANCELLED: 'Đã huỷ',
}

const isMeterItem = (item: Item) =>
  item.type === 'ELECTRICITY' || item.type === 'WATER'

function itemInvalid(item: Item): boolean {
  if (
    !item.label.trim() ||
    !item.unit.trim() ||
    !Number.isFinite(item.quantity) ||
    item.quantity < 0 ||
    !Number.isFinite(item.unitPrice) ||
    item.unitPrice < 0
  ) {
    return true
  }

  if (isMeterItem(item)) {
    return (
      item.previousReading == null ||
      item.currentReading == null ||
      item.previousReading < 0 ||
      item.currentReading < item.previousReading
    )
  }

  return false
}

function Invoices() {
  const isLandlord = localStorage.getItem('role') === 'LANDLORD'

  const [buildings, setBuildings] = useState<Building[]>([])
  const [buildingId, setBuildingId] = useState('')
  const [period, setPeriod] = useState(currentPeriod())

  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [result, setResult] = useState<GenerateResult | null>(null)

  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [detail, setDetail] = useState<Invoice | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [editReason, setEditReason] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Tải danh sách tòa nhà
  useEffect(() => {
    fetch(`${API}/api/buildings`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await readResponse(res)
          throw new Error(data.message || 'Không thể tải danh sách tòa nhà')
        }
        return res.json()
      })
      .then((data: Building[]) => {
        setBuildings(data)

        if (data.length > 0) {
          setBuildingId(String(data[0].id))
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách tòa nhà')
      })
  }, [])

  // Tải dữ liệu chỉ số và hóa đơn theo tòa nhà, kỳ hóa đơn
  useEffect(() => {
    if (!buildingId) {
      setReadiness(null)
      setInvoices([])
      return
    }

    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setError('')
      setResult(null)

      try {
        const [readinessRes, invoicesRes] = await Promise.all([
          fetch(
            `${API}/api/manager/meter-readings?buildingId=${buildingId}&period=${period}`,
            { headers: { Authorization: `Bearer ${getToken()}` } },
          ),
          fetch(
            `${API}/api/invoices?buildingId=${buildingId}&period=${period}`,
            { headers: { Authorization: `Bearer ${getToken()}` } },
          ),
        ])

        const readinessData = readinessRes.ok
          ? await readinessRes.json()
          : null

        if (!invoicesRes.ok) {
          const data = await readResponse(invoicesRes)
          throw new Error(data.message || 'Không thể tải danh sách hóa đơn')
        }

        const invoicesData = await invoicesRes.json()

        if (!cancelled) {
          setReadiness(readinessData as Readiness | null)
          setInvoices(invoicesData as Invoice[])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu hóa đơn')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [buildingId, period])

  // Tạo hóa đơn nháp cho cả tòa
  const generate = async () => {
    if (!buildingId || generating) return

    setGenerating(true)
    setError('')
    setSuccess('')
    setResult(null)

    try {
      const response = await fetch(`${API}/api/invoices/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          buildingId: Number(buildingId),
          period,
        }),
      })

      const data = await readResponse(response)

      if (!response.ok) {
        throw new Error(data.message || 'Không thể tạo hóa đơn')
      }

      setResult(data as GenerateResult)
      await refreshInvoices()

      if (data.created > 0) {
        setSuccess(
          `Đã lưu thành công ${data.created} hóa đơn nháp cho kỳ ${period}.`,
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setGenerating(false)
    }
  }

  // Tải lại danh sách hóa đơn
  const refreshInvoices = async () => {
    if (!buildingId) return

    const res = await fetch(
      `${API}/api/invoices?buildingId=${buildingId}&period=${period}`,
      { headers: { Authorization: `Bearer ${getToken()}` } },
    )

    if (!res.ok) {
      const data = await readResponse(res)
      throw new Error(data.message || 'Không thể tải lại danh sách hóa đơn')
    }

    setInvoices((await res.json()) as Invoice[])
  }

  // Xem chi tiết hóa đơn
  const openDetail = async (id: number) => {
    setDetailLoading(true)
    setDetail(null)

    try {
      const res = await fetch(`${API}/api/invoices/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })

      const data = await readResponse(res)

      if (!res.ok) {
        throw new Error(data.message || 'Không thể tải chi tiết hóa đơn')
      }

      setDetail(data as Invoice)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setDetailLoading(false)
    }
  }

  // Mở form sửa hóa đơn nháp
  const startEdit = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/invoices/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })

      const data = await readResponse(res)

      if (!res.ok) {
        throw new Error(data.message || 'Không thể tải hóa đơn')
      }

      const invoice = data as Invoice

      if (invoice.status !== 'DRAFT') {
        throw new Error('Chỉ được sửa hóa đơn nháp')
      }

      setEditingInvoice(invoice)
      setEditReason('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  // Lưu nội dung chỉnh sửa
  const saveEdit = async (items: Item[]) => {
    if (!editingInvoice || savingEdit) return

    if (!editReason.trim()) {
      alert('Vui lòng nhập lý do chỉnh sửa')
      return
    }

    if (items.some(itemInvalid)) {
      alert('Vui lòng kiểm tra tên khoản mục, đơn vị, số lượng, đơn giá và chỉ số điện/nước')
      return
    }

    setSavingEdit(true)

    try {
      const res = await fetch(`${API}/api/invoices/${editingInvoice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          reason: editReason.trim(),
          items: items.map((item) => ({
            id: item.id ?? null,
            label: item.label.trim(),
            type: item.type,
            quantity: item.quantity,
            unit: item.unit.trim(),
            unitPrice: item.unitPrice,
            previousReading: item.previousReading,
            currentReading: item.currentReading,
            note: item.note ?? '',
          })),
        }),
      })

      const data = await readResponse(res)

      if (!res.ok) {
        throw new Error(data.message || 'Không thể lưu hóa đơn')
      }

      setEditingInvoice(null)
      setEditReason('')

      await refreshInvoices()
      alert('Đã lưu hóa đơn nháp')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSavingEdit(false)
    }
  }

  // Phát hành hóa đơn nháp
  const issueInvoice = async (invoice: Invoice) => {
    if (invoice.status !== 'DRAFT' || actionLoading) return

    const confirmed = window.confirm(
      `Phát hành hóa đơn ${invoice.invoiceCode}?`,
    )

    if (!confirmed) return

    setActionLoading(true)

    try {
      const res = await fetch(`${API}/api/invoices/${invoice.id}/issue`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      })

      const data = await readResponse(res)

      if (!res.ok) {
        throw new Error(data.message || 'Không thể phát hành hóa đơn')
      }

      await refreshInvoices()
      alert('Đã phát hành hóa đơn')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  // Hủy hóa đơn đã phát hành
  const cancelInvoice = async (invoice: Invoice) => {
    if (invoice.status !== 'ISSUED' || actionLoading) return

    const reason = window.prompt(
      `Nhập lý do hủy hóa đơn ${invoice.invoiceCode}:`,
    )

    if (reason === null) return

    if (!reason.trim()) {
      alert('Lý do hủy không được để trống')
      return
    }

    if (reason.trim().length > 500) {
      alert('Lý do hủy không được vượt quá 500 ký tự')
      return
    }

    const confirmed = window.confirm(
      `Xác nhận hủy hóa đơn ${invoice.invoiceCode}?`,
    )

    if (!confirmed) return

    setActionLoading(true)

    try {
      const res = await fetch(`${API}/api/invoices/${invoice.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ reason: reason.trim() }),
      })

      const data = await readResponse(res)

      if (!res.ok) {
        throw new Error(data.message || 'Không thể hủy hóa đơn')
      }

      await refreshInvoices()
      await openDetail(invoice.id)
      alert('Đã hủy hóa đơn')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1
            style={{
              margin: '0 0 6px',
              fontSize: 27,
              fontWeight: 800,
              color: '#0f172a',
            }}
          >
            Quản lý hóa đơn tháng
          </h1>

          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Tạo hóa đơn nháp cho cả tòa nhà. Phòng chưa chốt chỉ số điện nước
            sẽ được bỏ qua và hiển thị lý do.
          </p>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 30 }}>
        <div style={cardStyle}>
          <div
            style={{
              padding: 20,
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'flex-end',
            }}
          >
            <Field label="Tòa nhà">
              <select
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                style={inputStyle}
              >
                {buildings.length === 0 && (
                  <option value="">Chưa có tòa nhà</option>
                )}

                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kỳ hóa đơn (tháng)">
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={inputStyle}
              />
            </Field>

            {isLandlord && (
              <button
                onClick={generate}
                disabled={generating || !buildingId || actionLoading}
                style={{
                  ...primaryButtonStyle,
                  opacity: generating || !buildingId || actionLoading ? 0.6 : 1,
                }}
              >
                {generating ? 'Đang tạo...' : 'Tạo hóa đơn nháp cả tòa'}
              </button>
            )}
          </div>

          {readiness && (
            <div style={summaryBarStyle}>
              <span>
                <strong>{readiness.total}</strong> phòng đang thuê
              </span>

              <span>
                <strong style={{ color: '#16a34a' }}>
                  {readiness.recorded}
                </strong>{' '}
                đã chốt chỉ số
              </span>

              <span>
                <strong
                  style={{
                    color: readiness.remaining > 0 ? '#dc2626' : '#16a34a',
                  }}
                >
                  {readiness.remaining}
                </strong>{' '}
                chưa chốt chỉ số
              </span>
            </div>
          )}
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {success && <div style={successStyle}>{success}</div>}

        {result && (
          <div style={resultStyle}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 16,
                marginBottom: 10,
              }}
            >
              Kết quả: đã tạo {result.created}/{result.totalRooms} hóa đơn nháp
            </div>

            {result.skippedRooms.length === 0 ? (
              <div style={{ color: '#16a34a' }}>
                Tất cả phòng đủ điều kiện đã được tạo hóa đơn nháp.
              </div>
            ) : (
              <div>
                <div style={{ color: '#b45309', marginBottom: 8 }}>
                  Các phòng bị bỏ qua ({result.skippedRooms.length}):
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {result.skippedRooms.map((room) => (
                      <tr
                        key={room.contractId}
                        style={{ borderBottom: '1px solid #fef3c7' }}
                      >
                        <td
                          style={{
                            padding: '6px 0',
                            fontWeight: 700,
                            width: 120,
                          }}
                        >
                          {room.roomCode}
                        </td>

                        <td style={{ padding: '6px 0', color: '#92400e' }}>
                          {room.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <h2
          style={{
            fontSize: 19,
            fontWeight: 800,
            color: '#0f172a',
            margin: '26px 0 14px',
          }}
        >
          Hóa đơn trong kỳ {period}
        </h2>

        <div style={cardStyle}>
          {loading ? (
            <div style={emptyStyle}>Đang tải dữ liệu...</div>
          ) : invoices.length === 0 ? (
            <div style={emptyStyle}>Chưa có hóa đơn nào trong kỳ này.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 820,
                }}
              >
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={thStyle}>Mã hóa đơn</th>
                    <th style={thStyle}>Phòng</th>
                    <th style={thStyle}>Người đứng tên</th>
                    <th style={thStyle}>Tổng tiền</th>
                    <th style={thStyle}>Trạng thái</th>
                    <th style={thStyle}>Hạn thanh toán</th>
                    <th style={thStyle}>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td style={tdStyle}>{invoice.invoiceCode}</td>
                      <td style={tdStyle}>{invoice.roomCode || '—'}</td>
                      <td style={tdStyle}>{invoice.tenantName || '—'}</td>

                      <td style={tdStyle}>
                        <strong>{formatMoney(invoice.totalAmount)}</strong>
                      </td>

                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            background:
                              invoice.status === 'DRAFT'
                                ? '#f1f5f9'
                                : invoice.status === 'ISSUED'
                                  ? '#dcfce7'
                                  : '#fee2e2',
                            color:
                              invoice.status === 'DRAFT'
                                ? '#475569'
                                : invoice.status === 'ISSUED'
                                  ? '#166534'
                                  : '#991b1b',
                          }}
                        >
                          {statusLabel[invoice.status] || invoice.status}
                        </span>
                      </td>

                      <td style={tdStyle}>{formatDate(invoice.dueDate)}</td>

                      <td style={tdStyle}>
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            flexWrap: 'wrap',
                          }}
                        >
                          <button
                            onClick={() => openDetail(invoice.id)}
                            style={editButtonStyle}
                          >
                            Chi tiết
                          </button>

                          {isLandlord && invoice.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => startEdit(invoice.id)}
                                disabled={actionLoading || savingEdit}
                                style={editButtonStyle}
                              >
                                Sửa
                              </button>

                              <button
                                onClick={() => issueInvoice(invoice)}
                                disabled={actionLoading || savingEdit}
                                style={primaryButtonStyle}
                              >
                                Phát hành
                              </button>
                            </>
                          )}

                          {isLandlord && invoice.status === 'ISSUED' && (
                            <button
                              onClick={() => cancelInvoice(invoice)}
                              disabled={actionLoading || savingEdit}
                              style={cancelButtonStyle}
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {(detail || detailLoading) && (
        <DetailModal
          loading={detailLoading}
          invoice={detail}
          onClose={() => {
            setDetail(null)
            setDetailLoading(false)
          }}
        />
      )}

      {editingInvoice && (
        <EditInvoiceModal
          key={editingInvoice.id}
          invoice={editingInvoice}
          reason={editReason}
          setReason={setEditReason}
          saving={savingEdit}
          onClose={() => {
            if (!savingEdit) {
              setEditingInvoice(null)
              setEditReason('')
            }
          }}
          onSave={saveEdit}
        />
      )}
    </div>
  )
}

// Modal chỉnh sửa hóa đơn nháp
function EditInvoiceModal({
  invoice,
  reason,
  setReason,
  saving,
  onClose,
  onSave,
}: {
  invoice: Invoice
  reason: string
  setReason: (value: string) => void
  saving: boolean
  onClose: () => void
  onSave: (items: Item[]) => void
}) {
  const [items, setItems] = useState<Item[]>(() =>
    (invoice.items || []).map((item) => ({ ...item })),
  )

  const updateItem = (index: number, patch: Partial<Item>) => {
    setItems((oldItems) =>
      oldItems.map((item, i) => {
        if (i !== index) return item

        const next = { ...item, ...patch }

        if (isMeterItem(next)) {
          if (
            next.previousReading != null &&
            next.currentReading != null &&
            next.currentReading >= next.previousReading
          ) {
            next.quantity = next.currentReading - next.previousReading
          } else {
            next.quantity = 0
          }
        }

        next.amount = next.quantity * next.unitPrice

        return next
      }),
    )
  }

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  )

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 850 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Sửa hóa đơn {invoice.invoiceCode}
          </h2>

          <button
            onClick={onClose}
            disabled={saving}
            style={closeButtonStyle}
          >
            ×
          </button>
        </div>

        <p style={{ color: '#64748b', fontSize: 13 }}>
          Chỉ có thể chỉnh sửa hóa đơn ở trạng thái Nháp. Nhập lý do chỉnh sửa
          để lưu lại lịch sử thay đổi.
        </p>

        {items.length === 0 ? (
          <div style={emptyStyle}>Hóa đơn này chưa có khoản mục nào.</div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id ?? index}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <Field label="Tên khoản mục">
                <input
                  style={{
                    ...inputStyle,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  value={item.label}
                  onChange={(e) =>
                    updateItem(index, { label: e.target.value })
                  }
                  disabled={saving}
                />
              </Field>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginTop: 10,
                }}
              >
                {isMeterItem(item) ? (
                  <>
                    <Field label="Chỉ số cũ">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        style={inputStyle}
                        value={item.previousReading ?? ''}
                        onChange={(e) =>
                          updateItem(index, {
                            previousReading: e.target.value === ''
                              ? null
                              : Number(e.target.value),
                          })
                        }
                        disabled={saving}
                      />
                    </Field>

                    <Field label="Chỉ số mới">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        style={inputStyle}
                        value={item.currentReading ?? ''}
                        onChange={(e) =>
                          updateItem(index, {
                            currentReading: e.target.value === ''
                              ? null
                              : Number(e.target.value),
                          })
                        }
                        disabled={saving}
                      />
                    </Field>
                  </>
                ) : (
                  <Field label="Số lượng">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      style={inputStyle}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, {
                          quantity: e.target.value === ''
                            ? 0
                            : Number(e.target.value),
                        })
                      }
                      disabled={saving}
                    />
                  </Field>
                )}

                <Field label="Đơn vị">
                  <input
                    style={inputStyle}
                    value={item.unit}
                    onChange={(e) =>
                      updateItem(index, { unit: e.target.value })
                    }
                    disabled={saving}
                  />
                </Field>

                <Field label="Đơn giá (đ)">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    style={inputStyle}
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(index, {
                        unitPrice: e.target.value === ''
                          ? 0
                          : Number(e.target.value),
                      })
                    }
                    disabled={saving}
                  />
                </Field>
              </div>

              <div style={{ marginTop: 10 }}>
                <Field label="Ghi chú khoản mục">
                  <input
                    style={{
                      ...inputStyle,
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    value={item.note ?? ''}
                    onChange={(e) =>
                      updateItem(index, { note: e.target.value })
                    }
                    placeholder="Ví dụ: điều chỉnh theo thỏa thuận"
                    disabled={saving}
                  />
                </Field>
              </div>

              {isMeterItem(item) && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: '#64748b',
                  }}
                >
                  Số lượng:{' '}
                  <strong>
                    {item.quantity} {item.unit}
                  </strong>{' '}
                  (tự tính từ chỉ số)
                </div>
              )}

              <div
                style={{
                  textAlign: 'right',
                  marginTop: 8,
                  fontWeight: 700,
                }}
              >
                Thành tiền:{' '}
                {formatMoney(item.quantity * item.unitPrice)}
              </div>
            </div>
          ))
        )}

        <Field label="Lý do chỉnh sửa (bắt buộc)">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            style={{
              ...inputStyle,
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
            placeholder="Nhập lý do thay đổi hóa đơn..."
            disabled={saving}
          />
        </Field>

        <div
          style={{
            textAlign: 'right',
            marginTop: 16,
            fontWeight: 800,
            fontSize: 17,
          }}
        >
          Tổng cộng: {formatMoney(total)}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 20,
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            style={editButtonStyle}
          >
            Đóng
          </button>

          <button
            disabled={
              saving ||
              !reason.trim() ||
              items.length === 0 ||
              items.some(itemInvalid)
            }
            onClick={() => onSave(items)}
            style={{
              ...primaryButtonStyle,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 6,
          color: '#475569',
        }}
      >
        {label}
      </label>

      {children}
    </div>
  )
}

function DetailModal({
  loading,
  invoice,
  onClose,
}: {
  loading: boolean
  invoice: Invoice | null
  onClose: () => void
}) {
  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              color: '#0f172a',
            }}
          >
            {invoice
              ? `Hóa đơn ${invoice.invoiceCode}`
              : 'Chi tiết hóa đơn'}
          </h2>

          <button onClick={onClose} style={closeButtonStyle}>
            ×
          </button>
        </div>

        {loading || !invoice ? (
          <div style={emptyStyle}>Đang tải...</div>
        ) : (
          <div>
            <div
              style={{
                fontSize: 14,
                color: '#475569',
                marginBottom: 16,
                lineHeight: 1.7,
              }}
            >
              <div>
                Phòng <strong>{invoice.roomCode || '—'}</strong> ·{' '}
                {invoice.tenantName || '—'}
              </div>

              <div>
                Kỳ {invoice.period} · Ngày phát hành{' '}
                {formatDate(invoice.issueDate)} · Hạn{' '}
                {formatDate(invoice.dueDate)} ·{' '}
                {statusLabel[invoice.status] || invoice.status}
              </div>
                {invoice.status === 'CANCELLED' && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      border: '1px solid #fecaca',
                      borderRadius: 8,
                      background: '#fef2f2',
                      color: '#991b1b',
                    }}
                  >
                    <strong>Lý do hủy:</strong>{' '}
                    {invoice.cancellationReason?.trim() ||
                      'Chưa có thông tin lý do hủy'}
                  </div>
                )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 520,
                }}
              >
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={thStyle}>Khoản mục</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>
                      Số lượng
                    </th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>
                      Đơn giá
                    </th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>
                      Thành tiền
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(invoice.items || []).map((item, index) => (
                    <tr key={item.id ?? index}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 650 }}>{item.label}</div>

                        {(item.previousReading !== null ||
                          item.currentReading !== null) && (
                          <div
                            style={{
                              fontSize: 12,
                              color: '#64748b',
                            }}
                          >
                            Chỉ số {item.previousReading ?? '—'} →{' '}
                            {item.currentReading ?? '—'}
                          </div>
                        )}

                        {item.note && (
                          <div
                            style={{
                              fontSize: 12,
                              color: '#64748b',
                            }}
                          >
                            {item.note}
                          </div>
                        )}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                        }}
                      >
                        {item.quantity} {item.unit}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                        }}
                      >
                        {formatMoney(item.unitPrice)}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                          fontWeight: 700,
                        }}
                      >
                        {formatMoney(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                textAlign: 'right',
                marginTop: 16,
                fontSize: 17,
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              Tổng cộng: {formatMoney(invoice.totalAmount)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  color: '#0f172a',
}

const headerStyle: React.CSSProperties = {
  background: '#fff',
  borderBottom: '1px solid #e2e8f0',
  padding: '20px 32px',
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  overflow: 'hidden',
}

const summaryBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 28,
  flexWrap: 'wrap',
  padding: '14px 20px',
  background: '#f8fafc',
  borderTop: '1px solid #e2e8f0',
  fontSize: 14,
  color: '#475569',
}

const inputStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 9,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
  minWidth: 200,
}

const primaryButtonStyle: React.CSSProperties = {
  border: 0,
  background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
  color: '#fff',
  borderRadius: 9,
  padding: '11px 18px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 14,
}

const errorStyle: React.CSSProperties = {
  background: '#fef2f2',
  color: '#b91c1c',
  padding: 14,
  borderRadius: 12,
  marginTop: 16,
  fontSize: 14,
}

const successStyle: React.CSSProperties = {
  background: '#f0fdf4',
  border: '1px solid #bbf7d0',
  color: '#166534',
  padding: 14,
  borderRadius: 12,
  marginTop: 16,
  fontSize: 14,
  fontWeight: 650,
}

const resultStyle: React.CSSProperties = {
  background: '#fffbeb',
  border: '1px solid #fde68a',
  color: '#0f172a',
  padding: 18,
  borderRadius: 14,
  marginTop: 16,
  fontSize: 14,
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '13px 16px',
  borderBottom: '1px solid #e2e8f0',
  color: '#475569',
  fontSize: 13,
}

const tdStyle: React.CSSProperties = {
  padding: '13px 16px',
  borderBottom: '1px solid #e2e8f0',
  verticalAlign: 'middle',
  fontSize: 14,
  color: '#0f172a',
}

const emptyStyle: React.CSSProperties = {
  padding: 50,
  textAlign: 'center',
  color: '#64748b',
}

const editButtonStyle: React.CSSProperties = {
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#2563eb',
  borderRadius: 8,
  padding: '8px 13px',
  cursor: 'pointer',
  fontWeight: 650,
  whiteSpace: 'nowrap',
}
const cancelButtonStyle: React.CSSProperties = {
  ...editButtonStyle,
  color: '#b91c1c',
  borderColor: '#fecaca',
  background: '#fef2f2',
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  zIndex: 1000,
}

const modalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 640,
  maxHeight: '90vh',
  overflowY: 'auto',
  background: '#fff',
  borderRadius: 18,
  padding: 26,
  boxShadow: '0 25px 70px rgba(15,23,42,.25)',
}

const closeButtonStyle: React.CSSProperties = {
  border: 0,
  background: '#f1f5f9',
  color: '#334155',
  width: 34,
  height: 34,
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 18,
}

export default Invoices

