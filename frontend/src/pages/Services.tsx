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

type PriceHistory = {
  id: number
  price: number
  effectiveFrom: string
}

const API = 'http://localhost:8080'

const getToken = () => localStorage.getItem('accessToken')

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ'
}

function formatDate(value: string) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function methodLabel(value: string) {
  const labels: Record<string, string> = {
    BY_METER: 'Theo số',
    BY_PERSON: 'Theo người',
    FIXED_ROOM: 'Cố định theo phòng',
  }

  return labels[value] || value
}

function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)

  const [showPrice, setShowPrice] = useState(false)
  const [priceService, setPriceService] = useState<Service | null>(null)

  const [showHistory, setShowHistory] = useState(false)
  const [historyService, setHistoryService] = useState<Service | null>(null)
  const [history, setHistory] = useState<PriceHistory[]>([])

  const [form, setForm] = useState({
    name: '',
    calculationMethod: 'BY_METER',
    unit: '',
    price: '',
    description: '',
  })

  const [priceForm, setPriceForm] = useState({
    price: '',
    effectiveFrom: '',
  })

  const loadServices = async () => {
    try {
      setLoading(true)
      setError('')

      const token = getToken()

      const response = await fetch(`${API}/api/services`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Không thể tải danh sách dịch vụ')
      }

      const data = await response.json()
      setServices(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [])

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchSearch =
        service.name.toLowerCase().includes(search.toLowerCase()) ||
        service.unit.toLowerCase().includes(search.toLowerCase())

      const matchFilter =
        filter === 'ALL' ||
        (filter === 'ACTIVE' && service.active) ||
        (filter === 'INACTIVE' && !service.active)

      return matchSearch && matchFilter
    })
  }, [services, search, filter])

  const total = services.length
  const activeCount = services.filter((s) => s.active).length
  const inactiveCount = services.filter((s) => !s.active).length

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '',
      calculationMethod: 'BY_METER',
      unit: '',
      price: '',
      description: '',
    })
    setShowForm(true)
  }

  const openEdit = (service: Service) => {
    setEditing(service)
    setForm({
      name: service.name,
      calculationMethod: service.calculationMethod,
      unit: service.unit,
      price: String(service.price),
      description: service.description || '',
    })
    setShowForm(true)
  }

  const saveService = async () => {
    if (!form.name.trim()) {
      alert('Vui lòng nhập tên dịch vụ')
      return
    }

    if (!form.unit.trim()) {
      alert('Vui lòng nhập đơn vị')
      return
    }

    if (form.price === '' || Number(form.price) < 0) {
      alert('Giá dịch vụ không hợp lệ')
      return
    }

    try {
      const token = getToken()

      const url = editing
        ? `${API}/api/services/${editing.id}`
        : `${API}/api/services`

      const response = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          calculationMethod: form.calculationMethod,
          unit: form.unit.trim(),
          price: Number(form.price),
          description: form.description.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Không thể lưu dịch vụ')
      }

      setShowForm(false)
      await loadServices()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  const toggleStatus = async (service: Service) => {
    const action = service.active ? 'ngừng' : 'kích hoạt'

    if (!confirm(`Bạn có chắc muốn ${action} dịch vụ "${service.name}"?`)) {
      return
    }

    try {
      const token = getToken()

      const response = await fetch(
        `${API}/api/services/${service.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            active: !service.active,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Không thể cập nhật trạng thái')
      }

      await loadServices()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  const openPriceModal = (service: Service) => {
    setPriceService(service)
    setPriceForm({
      price: String(service.price),
      effectiveFrom: new Date().toISOString().split('T')[0],
    })
    setShowPrice(true)
  }

  const updatePrice = async () => {
    if (!priceService) return

    if (priceForm.price === '' || Number(priceForm.price) < 0) {
      alert('Giá không hợp lệ')
      return
    }

    if (!priceForm.effectiveFrom) {
      alert('Vui lòng chọn ngày áp dụng')
      return
    }

    try {
      const token = getToken()

      const response = await fetch(
        `${API}/api/services/${priceService.id}/price`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            price: Number(priceForm.price),
            effectiveFrom: priceForm.effectiveFrom,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Không thể cập nhật giá')
      }

      setShowPrice(false)
      await loadServices()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  const openHistory = async (service: Service) => {
    try {
      const token = getToken()

      const response = await fetch(
        `${API}/api/services/${service.id}/price-history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Không thể tải lịch sử giá')
      }

      setHistory(data)
      setHistoryService(service)
      setShowHistory(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        color: '#0f172a',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '20px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <div>
            <button
              onClick={() => {
                window.location.href = '/dashboard'
              }}
              style={{
                border: 0,
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              ← Dashboard
            </button>

            <h1 style={{ margin: 0, fontSize: 28 }}>
              Quản lý dịch vụ
            </h1>

            <p
              style={{
                margin: '6px 0 0',
                color: '#64748b',
              }}
            >
              Quản lý điện, nước và các dịch vụ của nhà trọ
            </p>
          </div>

          <button
            onClick={openCreate}
            style={{
              border: 0,
              borderRadius: 10,
              padding: '12px 18px',
              background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Thêm dịch vụ
          </button>
        </div>
      </div>

      <main
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 32,
        }}
      >
        {/* STATS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <Stat title="Tổng dịch vụ" value={total} />
          <Stat title="Đang hoạt động" value={activeCount} />
          <Stat title="Đã ngừng" value={inactiveCount} />
        </div>

        {/* FILTER */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc đơn vị..."
            style={inputStyle}
          />

          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')
            }
            style={{
              ...inputStyle,
              width: 190,
            }}
          >
            <option value="ALL">Tất cả</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Đã ngừng</option>
          </select>
        </div>

        {/* TABLE */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={emptyStyle}>Đang tải dữ liệu...</div>
          ) : error ? (
            <div
              style={{
                ...emptyStyle,
                color: '#dc2626',
              }}
            >
              {error}
            </div>
          ) : filteredServices.length === 0 ? (
            <div style={emptyStyle}>
              Chưa có dịch vụ phù hợp.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 900,
                }}
              >
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={thStyle}>Tên dịch vụ</th>
                    <th style={thStyle}>Cách tính</th>
                    <th style={thStyle}>Đơn vị</th>
                    <th style={thStyle}>Giá</th>
                    <th style={thStyle}>Trạng thái</th>
                    <th style={thStyle}>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredServices.map((service) => (
                    <tr key={service.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700 }}>
                          {service.name}
                        </div>

                        {service.description && (
                          <div
                            style={{
                              color: '#64748b',
                              fontSize: 13,
                              marginTop: 4,
                            }}
                          >
                            {service.description}
                          </div>
                        )}
                      </td>

                      <td style={tdStyle}>
                        {methodLabel(service.calculationMethod)}
                      </td>

                      <td style={tdStyle}>{service.unit}</td>

                      <td style={tdStyle}>
                        <strong>{formatMoney(service.price)}</strong>
                      </td>

                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '5px 10px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: service.active
                              ? '#dcfce7'
                              : '#f1f5f9',
                            color: service.active
                              ? '#15803d'
                              : '#64748b',
                          }}
                        >
                          {service.active
                            ? 'Đang hoạt động'
                            : 'Đã ngừng'}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <ActionButton
                            text="Sửa"
                            onClick={() => openEdit(service)}
                          />

                          <ActionButton
                            text="Đổi giá"
                            onClick={() => openPriceModal(service)}
                          />

                          <ActionButton
                            text="Lịch sử giá"
                            onClick={() => openHistory(service)}
                          />

                          <ActionButton
                            text={service.active ? 'Ngừng' : 'Kích hoạt'}
                            onClick={() => toggleStatus(service)}
                          />
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

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <Modal
          title={editing ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ'}
          onClose={() => setShowForm(false)}
        >
          <Field label="Tên dịch vụ">
            <input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              style={inputStyle}
              placeholder="Ví dụ: Điện"
            />
          </Field>

          <Field label="Cách tính">
            <select
              value={form.calculationMethod}
              onChange={(e) =>
                setForm({
                  ...form,
                  calculationMethod: e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="BY_METER">Theo số</option>
              <option value="BY_PERSON">Theo người</option>
              <option value="FIXED_ROOM">Cố định theo phòng</option>
            </select>
          </Field>

          <Field label="Đơn vị">
            <input
              value={form.unit}
              onChange={(e) =>
                setForm({ ...form, unit: e.target.value })
              }
              style={inputStyle}
              placeholder="Ví dụ: kWh, m³, người..."
            />
          </Field>

          <Field label="Giá">
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: e.target.value })
              }
              style={inputStyle}
              placeholder="Ví dụ: 3500"
            />
          </Field>

          <Field label="Mô tả">
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              style={{
                ...inputStyle,
                minHeight: 90,
                resize: 'vertical',
              }}
              placeholder="Mô tả dịch vụ..."
            />
          </Field>

          <ModalButtons
            onCancel={() => setShowForm(false)}
            onSave={saveService}
            saveText={editing ? 'Lưu thay đổi' : 'Tạo dịch vụ'}
          />
        </Modal>
      )}

      {/* PRICE MODAL */}
      {showPrice && priceService && (
        <Modal
          title={`Đổi giá: ${priceService.name}`}
          onClose={() => setShowPrice(false)}
        >
          <div
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              padding: 12,
              borderRadius: 10,
              marginBottom: 18,
              fontSize: 14,
            }}
          >
            Giá hiện tại: <strong>{formatMoney(priceService.price)}</strong>
          </div>

          <Field label="Giá mới">
            <input
              type="number"
              min="0"
              value={priceForm.price}
              onChange={(e) =>
                setPriceForm({
                  ...priceForm,
                  price: e.target.value,
                })
              }
              style={inputStyle}
            />
          </Field>

          <Field label="Ngày bắt đầu áp dụng">
            <input
              type="date"
              value={priceForm.effectiveFrom}
              onChange={(e) =>
                setPriceForm({
                  ...priceForm,
                  effectiveFrom: e.target.value,
                })
              }
              style={inputStyle}
            />
          </Field>

          <ModalButtons
            onCancel={() => setShowPrice(false)}
            onSave={updatePrice}
            saveText="Cập nhật giá"
          />
        </Modal>
      )}

      {/* HISTORY MODAL */}
      {showHistory && historyService && (
        <Modal
          title={`Lịch sử giá - ${historyService.name}`}
          onClose={() => setShowHistory(false)}
        >
          {history.length === 0 ? (
            <div style={emptyStyle}>
              Chưa có lịch sử thay đổi giá.
            </div>
          ) : (
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {history.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: 14,
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span>{formatDate(item.effectiveFrom)}</span>

                  <strong>{formatMoney(item.price)}</strong>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

/* =========================
   COMPONENTS
========================= */

function Stat({
  title,
  value,
}: {
  title: string
  value: number
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div
        style={{
          color: '#64748b',
          fontSize: 14,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function ActionButton({
  text,
  onClick,
}: {
  text: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: '1px solid #cbd5e1',
        background: '#fff',
        color: '#334155',
        borderRadius: 8,
        padding: '7px 10px',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {text}
    </button>
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
          <h2 style={{ margin: 0, fontSize: 21, color: '#0f172a' }}>
            {title}
          </h2>

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

/* =========================
   STYLES
========================= */

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
  textAlign: 'center',
  padding: '13px 16px',
  borderBottom: '1px solid #e2e8f0',
  color: '#475569',
  fontSize: 13,
  fontWeight: 750,
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  textAlign: 'center',
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

export default Services