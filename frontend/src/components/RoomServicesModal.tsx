import React, { useEffect, useState } from 'react'

export interface RoomServiceItem {
  id: number
  roomId: number
  serviceId: number
  serviceName: string
  calculationMethod: 'FIXED_ROOM' | 'BY_METER' | 'BY_PERSON' | string
  unit: string
  price: number
  active?: boolean
}

export interface AvailableService {
  id: number
  name: string
  calculationMethod: string
  unit: string
  active?: boolean
}

interface RoomServicesModalProps {
  roomId: number
  roomCode: string
  buildingName?: string
  onClose: () => void
  onUpdated?: () => void
}

const API = 'http://localhost:8080'

const formatMoney = (val: number) =>
  new Intl.NumberFormat('vi-VN').format(val) + ' đ'

const calculationMethodLabel = (method: string) => {
  switch (method) {
    case 'FIXED_ROOM':
      return 'Cố định theo phòng'
    case 'BY_METER':
      return 'Theo chỉ số đồng hồ'
    case 'BY_PERSON':
      return 'Theo số người ở'
    default:
      return method
  }
}

export const RoomServicesModal: React.FC<RoomServicesModalProps> = ({
  roomId,
  roomCode,
  buildingName,
  onClose,
  onUpdated,
}) => {
  const [assignedServices, setAssignedServices] = useState<RoomServiceItem[]>([])
  const [allServices, setAllServices] = useState<AvailableService[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [overridePrice, setOverridePrice] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPrice, setEditPrice] = useState<string>('')

  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [successMsg, setSuccessMsg] = useState<string>('')

  const token = localStorage.getItem('accessToken')
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Tải danh sách dịch vụ của phòng
      const resAssigned = await fetch(`${API}/api/room-services/room/${roomId}`, {
        headers,
      })
      if (!resAssigned.ok) {
        throw new Error('Không thể tải dịch vụ của phòng.')
      }
      const assignedData: RoomServiceItem[] = await resAssigned.json()
      setAssignedServices(assignedData)

      // 2. Tải danh sách tất cả dịch vụ đang hoạt động
      const resAll = await fetch(`${API}/api/services?active=true`, {
        headers,
      })
      if (resAll.ok) {
        const allData: AvailableService[] = await resAll.json()
        setAllServices(allData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi tải dữ liệu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [roomId])

  // Lọc các dịch vụ chưa được gán cho phòng
  const unassignedServices = allServices.filter(
    (s) => !assignedServices.some((as) => as.serviceId === s.id)
  )

  // Tính tổng chi phí cố định dự kiến / tháng
  const totalFixedCost = assignedServices
    .filter((s) => s.calculationMethod === 'FIXED_ROOM')
    .reduce((sum, s) => sum + (Number(s.price) || 0), 0)

  // Thêm dịch vụ riêng cho phòng
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!selectedServiceId) {
      setError('Vui lòng chọn dịch vụ.')
      return
    }

    const priceNum = Number(overridePrice)
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Đơn giá không hợp lệ (không được âm).')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API}/api/room-services/room/${roomId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          serviceId: Number(selectedServiceId),
          price: priceNum,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || 'Không thể gán dịch vụ cho phòng.')
      }

      setSuccessMsg('Gán dịch vụ và đơn giá riêng thành công!')
      setSelectedServiceId('')
      setOverridePrice('')
      await loadData()
      if (onUpdated) onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gán dịch vụ.')
    } finally {
      setSaving(false)
    }
  }

  // Cập nhật đơn giá riêng
  const handleUpdatePrice = async (id: number) => {
    setError('')
    setSuccessMsg('')

    const priceNum = Number(editPrice)
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Đơn giá không hợp lệ.')
      return
    }

    try {
      const res = await fetch(`${API}/api/room-services/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          price: priceNum,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || 'Không thể cập nhật đơn giá.')
      }

      setSuccessMsg('Cập nhật đơn giá riêng thành công!')
      setEditingId(null)
      await loadData()
      if (onUpdated) onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi cập nhật đơn giá.')
    }
  }

  // Xóa dịch vụ riêng khỏi phòng
  const handleDeleteService = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn bỏ dịch vụ "${name}" khỏi phòng ${roomCode}?`)) {
      return
    }

    setError('')
    setSuccessMsg('')
    try {
      const res = await fetch(`${API}/api/room-services/${id}`, {
        method: 'DELETE',
        headers,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Không thể xóa dịch vụ.')
      }

      setSuccessMsg(`Đã bỏ dịch vụ "${name}" khỏi phòng.`)
      await loadData()
      if (onUpdated) onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xóa dịch vụ.')
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '22px 28px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                Quản lý dịch vụ riêng - Phòng {roomCode}
              </h2>
            </div>
            {buildingName && (
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                Thuộc tòa nhà: <strong>{buildingName}</strong>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#e2e8f0',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Note Banner */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#eff6ff',
              borderLeft: '4px solid #3b82f6',
              borderRadius: '8px',
              color: '#1e40af',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div>
              <strong>Ghi chú quan trọng:</strong> Cấu hình dịch vụ & đơn giá riêng chỉ áp dụng từ kỳ hóa đơn sau. Đơn giá riêng ưu tiên hơn đơn giá chung của tòa nhà.
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '13.5px',
              }}
            >
              {error}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                color: '#059669',
                fontSize: '13.5px',
              }}
            >
              {successMsg}
            </div>
          )}

          {/* Form thêm dịch vụ mới */}
          <form
            onSubmit={handleAddService}
            style={{
              padding: '18px 20px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
              + Gán dịch vụ & ghi đè đơn giá riêng
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1.2fr) auto',
                gap: '12px',
                alignItems: 'flex-end',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Chọn dịch vụ
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">-- Chọn dịch vụ cần gán --</option>
                  {unassignedServices.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name} ({calculationMethodLabel(srv.calculationMethod)} / {srv.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Đơn giá riêng (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Ví dụ: 100000"
                  value={overridePrice}
                  onChange={(e) => setOverridePrice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={saving || !selectedServiceId || !overridePrice}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: saving || !selectedServiceId || !overridePrice ? 'not-allowed' : 'pointer',
                  opacity: saving || !selectedServiceId || !overridePrice ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                  height: '42px',
                  transition: 'background 0.2s',
                }}
              >
                {saving ? 'Đang lưu...' : '+ Gán dịch vụ'}
              </button>
            </div>
          </form>

          {/* Bảng danh sách dịch vụ của phòng */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Danh sách dịch vụ đang áp dụng ({assignedServices.length})
              </h3>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                Đang tải dữ liệu dịch vụ...
              </div>
            ) : assignedServices.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  fontSize: '14px',
                }}
              >
                Phòng này chưa có dịch vụ riêng nào. Dịch vụ sẽ theo cấu hình chung của tòa nhà.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                        Tên dịch vụ
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                        Cách tính
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                        Đơn vị
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', color: '#475569', fontWeight: 700 }}>
                        Đơn giá riêng
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontWeight: 700 }}>
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedServices.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                          {item.serviceName}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            {calculationMethodLabel(item.calculationMethod)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>
                          {item.unit || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {editingId === item.id ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                min="0"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                style={{
                                  width: '100px',
                                  padding: '6px 8px',
                                  fontSize: '13px',
                                  borderRadius: '6px',
                                  border: '1.5px solid #3b82f6',
                                }}
                              />
                              <button
                                onClick={() => handleUpdatePrice(item.id)}
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#10b981',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                Lưu
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#94a3b8',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {formatMoney(item.price)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            {editingId !== item.id && (
                              <button
                                onClick={() => {
                                  setEditingId(item.id)
                                  setEditPrice(String(item.price))
                                }}
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  color: '#334155',
                                }}
                              >
                                Sửa giá
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteService(item.id, item.serviceName)}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#fee2e2',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                color: '#b91c1c',
                              }}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tổng chi phí cố định dự kiến / tháng */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534' }}>
                Tổng chi phí dịch vụ cố định dự kiến / tháng
              </div>
              <div style={{ fontSize: '12.5px', color: '#15803d', marginTop: '2px' }}>
                (Bao gồm các dịch vụ có định mức cố định theo phòng hàng tháng)
              </div>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d' }}>
              {formatMoney(totalFixedCost)}
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#f8fafc',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 22px',
              backgroundColor: '#475569',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoomServicesModal
