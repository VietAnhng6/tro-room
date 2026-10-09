import { useEffect, useMemo, useState } from 'react'

type Service = {
  id: number
  name: string
  calculationMethod: string
  unit: string
  price: number
  description: string | null
  active: boolean
}

type ScheduledConfig = {
  calculationMethod: string
  price: number
  effectiveFrom: string
}

type BuildingConfig = {
  serviceId: number
  serviceName: string
  unit: string
  calculationMethod: string
  price: number
  effectiveFrom: string | null
  scheduled: ScheduledConfig | null
}

const API = 'http://localhost:8080'

const getToken = () => localStorage.getItem('accessToken')

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ'
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function methodLabel(value: string) {
  const labels: Record<string, string> = {
    BY_METER: 'Theo chỉ số đồng hồ',
    BY_PERSON: 'Khoán theo đầu người',
    FIXED_ROOM: 'Cố định theo phòng',
  }
  return labels[value] || value
}

function priceUnitLabel(method: string) {
  if (method === 'BY_PERSON') return 'Số tiền một người một tháng (đ)'
  return 'Đơn giá một đơn vị (đ)'
}

function nextBillingPeriod(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const y = next.getFullYear()
  const m = String(next.getMonth() + 1).padStart(2, '0')
  const d = String(next.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function todayInput(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function BuildingServices() {
  const buildingId = window.location.pathname.split('/').filter(Boolean).pop() || ''
  const buildingName =
    new URLSearchParams(window.location.search).get('name') || ''

  const [services, setServices] = useState<Service[]>([])
  const [configs, setConfigs] = useState<BuildingConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState({
    calculationMethod: 'BY_METER',
    price: '',
    effectiveFrom: '',
  })

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const token = getToken()

      const [servicesRes, configsRes] = await Promise.all([
        fetch(`${API}/api/services`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/buildings/${buildingId}/services`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (!servicesRes.ok || !configsRes.ok) {
        throw new Error('Không thể tải cấu hình điện nước')
      }

      const servicesData: Service[] = await servicesRes.json()
      const configsData: BuildingConfig[] = await configsRes.json()

      setServices(servicesData.filter((s) => s.active))
      setConfigs(configsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const rows = useMemo(() => {
    return services.map((service) => {
      const config = configs.find((c) => c.serviceId === service.id)
      return {
        service,
        calculationMethod: config?.calculationMethod ?? service.calculationMethod,
        price: config?.price ?? service.price,
        effectiveFrom: config?.effectiveFrom ?? null,
        scheduled: config?.scheduled ?? null,
        isConfigured: Boolean(config),
      }
    })
  }, [services, configs])

  const openForm = (service: Service, scheduled?: ScheduledConfig | null) => {
    setEditing(service)

    const baseMethod =
      scheduled?.calculationMethod ?? service.calculationMethod
    const basePrice = scheduled?.price ?? service.price

    // Cấu hình lần đầu áp dụng ngay hôm nay; đổi cấu hình áp dụng từ kỳ kế tiếp.
    const hasConfig = configs.some((c) => c.serviceId === service.id)

    setForm({
      calculationMethod: baseMethod,
      price: String(basePrice),
      effectiveFrom: hasConfig ? nextBillingPeriod() : todayInput(),
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!editing) return

    const price = Number(form.price)
    if (!form.price.trim() || Number.isNaN(price) || price <= 0) {
      alert('Đơn giá phải lớn hơn 0')
      return
    }

    if (!form.effectiveFrom) {
      alert('Vui lòng chọn kỳ bắt đầu áp dụng')
      return
    }

    try {
      const token = getToken()

      const response = await fetch(
        `${API}/api/buildings/${buildingId}/services/${editing.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            calculationMethod: form.calculationMethod,
            price,
            effectiveFrom: form.effectiveFrom,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Không thể lưu cấu hình')
      }

      setShowForm(false)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <button
            onClick={() => {
              window.location.href = '/buildings'
            }}
            style={backStyle}
          >
            ← Danh sách toà nhà
          </button>

          <h1 style={{ margin: '0 0 6px', fontSize: 27 }}>
            Cấu hình điện nước
          </h1>

          <p style={{ margin: 0, color: '#64748b' }}>
            {buildingName ? `Toà nhà: ${buildingName}` : `Toà nhà #${buildingId}`} — chọn
            cách tính tiền điện, nước theo chỉ số đồng hồ hoặc khoán theo đầu
            người.
          </p>
        </div>
      </div>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 30 }}>
        <div style={noticeStyle}>
          💡 Thay đổi cách tính hoặc đơn giá chỉ áp dụng từ{' '}
          <strong>kỳ hoá đơn kế tiếp</strong>. Kỳ hiện tại vẫn giữ nguyên cấu
          hình cũ.
        </div>

        <div style={cardStyle}>
          {loading ? (
            <div style={emptyStyle}>Đang tải dữ liệu...</div>
          ) : error ? (
            <div style={{ ...emptyStyle, color: '#dc2626' }}>{error}</div>
          ) : rows.length === 0 ? (
            <div style={emptyStyle}>Chưa có dịch vụ nào.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={thStyle}>Dịch vụ</th>
                    <th style={thStyle}>Cách tính hiện tại</th>
                    <th style={thStyle}>Đơn giá</th>
                    <th style={thStyle}>Áp dụng từ</th>
                    <th style={thStyle}>Thay đổi chờ áp dụng</th>
                    <th style={thStyle}>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr key={row.service.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700 }}>{row.service.name}</div>
                        <div style={{ color: '#64748b', fontSize: 13 }}>
                          Đơn vị: {row.service.unit}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div>{methodLabel(row.calculationMethod)}</div>
                        {!row.isConfigured && (
                          <div style={{ color: '#64748b', fontSize: 12 }}>
                            (mặc định toàn hệ thống)
                          </div>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <strong>{formatMoney(row.price)}</strong>
                      </td>

                      <td style={tdStyle}>{formatDate(row.effectiveFrom)}</td>

                      <td style={tdStyle}>
                        {row.scheduled ? (
                          <div
                            style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '6px 10px',
                              borderRadius: 8,
                              fontSize: 13,
                            }}
                          >
                            {methodLabel(row.scheduled.calculationMethod)} ·{' '}
                            {formatMoney(row.scheduled.price)}
                            <div style={{ fontSize: 12, marginTop: 3 }}>
                              từ {formatDate(row.scheduled.effectiveFrom)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <button
                          onClick={() => openForm(row.service, row.scheduled)}
                          style={editButtonStyle}
                        >
                          Đổi cách tính
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showForm && editing && (
        <Modal
          title={`Cấu hình ${editing.name}`}
          onClose={() => setShowForm(false)}
        >
          <Field label="Cách tính">
            <select
              value={form.calculationMethod}
              onChange={(e) =>
                setForm({ ...form, calculationMethod: e.target.value })
              }
              style={inputStyle}
            >
              <option value="BY_METER">Theo chỉ số đồng hồ</option>
              <option value="BY_PERSON">Khoán theo đầu người</option>
            </select>
          </Field>

          <Field label={priceUnitLabel(form.calculationMethod)}>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              style={inputStyle}
              placeholder={
                form.calculationMethod === 'BY_PERSON'
                  ? 'Ví dụ: 50000'
                  : 'Ví dụ: 4000'
              }
            />
          </Field>

          <Field label="Kỳ bắt đầu áp dụng">
            <input
              type="date"
              value={form.effectiveFrom}
              onChange={(e) =>
                setForm({ ...form, effectiveFrom: e.target.value })
              }
              style={inputStyle}
            />
          </Field>

          <div style={confirmNoticeStyle}>
            Cấu hình sẽ bắt đầu áp dụng từ{' '}
            <strong>{formatDate(form.effectiveFrom)}</strong>.
          </div>

          <ModalButtons
            onCancel={() => setShowForm(false)}
            onSave={save}
            saveText="Lưu cấu hình"
          />
        </Modal>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: 'block',
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 7,
          color: '#0f172a',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 18,
          padding: 26,
          boxShadow: '0 25px 70px rgba(15,23,42,.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 22,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 21, color: '#0f172a' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              border: 0,
              background: '#f1f5f9',
              color: '#334155',
              width: 34,
              height: 34,
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalButtons({
  onCancel,
  onSave,
  saveText,
}: {
  onCancel: () => void
  onSave: () => void
  saveText: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 22,
      }}
    >
      <button
        type="button"
        onClick={onCancel}
        style={{
          border: '1px solid #cbd5e1',
          background: '#fff',
          color: '#334155',
          borderRadius: 9,
          padding: '10px 16px',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Hủy
      </button>

      <button
        type="button"
        onClick={onSave}
        style={{
          border: 0,
          background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
          color: '#fff',
          borderRadius: 9,
          padding: '10px 16px',
          cursor: 'pointer',
          fontWeight: 700,
        }}
      >
        {saveText}
      </button>
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

const backStyle: React.CSSProperties = {
  border: 0,
  background: 'transparent',
  color: '#64748b',
  cursor: 'pointer',
  marginBottom: 8,
  padding: 0,
  fontSize: 14,
}

const noticeStyle: React.CSSProperties = {
  background: '#eff6ff',
  color: '#1d4ed8',
  padding: 14,
  borderRadius: 12,
  marginBottom: 20,
  fontSize: 14,
  lineHeight: 1.6,
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  overflow: 'hidden',
}

const confirmNoticeStyle: React.CSSProperties = {
  background: '#fffbeb',
  color: '#92400e',
  padding: 12,
  borderRadius: 10,
  marginBottom: 8,
  fontSize: 13,
  lineHeight: 1.6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #cbd5e1',
  borderRadius: 9,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '13px 16px',
  borderBottom: '1px solid #e2e8f0',
  color: '#475569',
  fontSize: 13,
}

const tdStyle: React.CSSProperties = {
  padding: '15px 16px',
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

export default BuildingServices
