import React, { useEffect, useState } from 'react'

export interface RoomDetailForListing {
  id: number
  code: string
  floor: number
  area: number
  rent: number
  maxPeople: number
  status: string
  buildingId: number
  buildingName: string
}

interface CreateListingModalProps {
  room: RoomDetailForListing
  onClose: () => void
  onSuccess?: () => void
}

const API = 'http://localhost:8080'

const formatMoney = (val: number) =>
  new Intl.NumberFormat('vi-VN').format(val) + ' đ'

// Tính ngày hiện tại + days theo múi giờ Việt Nam
const getVietnamDateString = (daysOffset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  room,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState<string>(
    `Cho thuê phòng ${room.code} - ${room.buildingName} - ${room.area}m² full tiện nghi`
  )
  const [description, setDescription] = useState<string>(
    `Phòng ${room.code} tại ${room.buildingName}, tầng ${room.floor}.\n- Diện tích: ${room.area} m²\n- Giá thuê: ${formatMoney(room.rent)}/tháng\n- Tối đa: ${room.maxPeople} người ở\n- Giờ giấc tự do, an ninh đảm bảo, tiện ích đầy đủ.`
  )
  const [status, setStatus] = useState<string>('PUBLISHED')
  const [expiresAt, setExpiresAt] = useState<string>(getVietnamDateString(30))

  // Preview data loaded from room
  const [imageCount, setImageCount] = useState<number>(0)
  const [serviceNames, setServiceNames] = useState<string[]>([])
  const [loadingDetails, setLoadingDetails] = useState<boolean>(true)

  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [successMsg, setSuccessMsg] = useState<string>('')

  const isRoomEmpty = room.status === 'EMPTY'
  const isExpired = expiresAt < getVietnamDateString(0)

  const token = localStorage.getItem('accessToken')
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  useEffect(() => {
    // Tải ảnh và dịch vụ của phòng để hiển thị tự động
    const fetchRoomDetails = async () => {
      setLoadingDetails(true)
      try {
        const [imgRes, srvRes] = await Promise.all([
          fetch(`${API}/api/room-images/room/${room.id}`, { headers }).catch(() => null),
          fetch(`${API}/api/room-services/room/${room.id}`, { headers }).catch(() => null),
        ])

        if (imgRes && imgRes.ok) {
          const imgs = await imgRes.json()
          setImageCount(Array.isArray(imgs) ? imgs.length : 0)
        }

        if (srvRes && srvRes.ok) {
          const srvs = await srvRes.json()
          if (Array.isArray(srvs)) {
            setServiceNames(srvs.map((s: { serviceName: string }) => s.serviceName))
          }
        }
      } catch {
        // Không chặn modal nếu không tải được chi tiết phụ
      } finally {
        setLoadingDetails(false)
      }
    }

    fetchRoomDetails()
  }, [room.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!isRoomEmpty) {
      setError('Chỉ có thể tạo tin đăng cho phòng đang TRỐNG (Trạng thái EMPTY).')
      return
    }

    if (!title.trim()) {
      setError('Tiêu đề tin đăng không được để trống.')
      return
    }

    if (isExpired) {
      setError('Ngày hết hạn không được ở trong quá khứ.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API}/api/listings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          roomId: room.id,
          title: title.trim(),
          description: description.trim(),
          status,
          expiresAt,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || 'Không thể tạo tin đăng cho phòng này.')
      }

      setSuccessMsg('Đăng tin cho thuê thành công! Tin đăng hiện đã có thể tìm kiếm.')
      setTimeout(() => {
        if (onSuccess) onSuccess()
        onClose()
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi đăng tin.')
    } finally {
      setSubmitting(false)
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
          maxWidth: '820px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
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
              <span style={{ fontSize: '20px' }}>📢</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                Đăng tin cho thuê - Phòng {room.code}
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 28px', fontSize: '13px', color: '#64748b' }}>
              Tòa nhà: <strong>{room.buildingName}</strong> · Tự động đồng bộ thông số phòng, ảnh & dịch vụ
            </p>
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
          {/* Cảnh báo trạng thái phòng không phải EMPTY */}
          {!isRoomEmpty && (
            <div
              style={{
                padding: '14px 18px',
                backgroundColor: '#fef2f2',
                border: '1.5px solid #fecaca',
                borderRadius: '10px',
                color: '#991b1b',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '22px' }}>🚫</span>
              <div>
                <strong>Không thể đăng tin:</strong> Phòng hiện đang ở trạng thái <strong>{room.status}</strong>. Nút đăng tin đã bị vô hiệu hóa vì chỉ phòng đang trống mới được phép đăng tin cho thuê.
              </div>
            </div>
          )}

          {/* Cảnh báo ngày hết hạn */}
          {isExpired && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                color: '#92400e',
                fontSize: '13.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <div>
                <strong>Cảnh báo:</strong> Ngày hết hạn được chọn ở trong quá khứ. Tin đăng sẽ không hiển thị trên kết quả tìm kiếm.
              </div>
            </div>
          )}

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
              ⚠️ {error}
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
              ✓ {successMsg}
            </div>
          )}

          {/* Card thông tin tự động điền từ phòng trống */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>
              ⚡ Thông tin tự động điền từ hệ thống phòng:
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '12px',
              }}
            >
              <div style={{ padding: '10px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Giá thuê</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#2563eb' }}>{formatMoney(room.rent)}/th</div>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Diện tích & Tầng</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{room.area} m² · Tầng {room.floor}</div>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Số người tối đa</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{room.maxPeople} người</div>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Ảnh & Dịch vụ</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                  {loadingDetails ? 'Đang tải...' : `${imageCount} ảnh · ${serviceNames.length} dịch vụ`}
                </div>
              </div>
            </div>
          </div>

          {/* Form nhập thông tin tin đăng */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Tiêu đề tin đăng *
              </label>
              <input
                type="text"
                required
                disabled={!isRoomEmpty || submitting}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Cho thuê phòng khép kín đẹp, ban công thoáng mát..."
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: !isRoomEmpty ? '#f1f5f9' : '#ffffff',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Mô tả chi tiết phòng
              </label>
              <textarea
                rows={5}
                disabled={!isRoomEmpty || submitting}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả tiện ích, nội thất, quy định tòa nhà, khu vực xung quanh..."
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  backgroundColor: !isRoomEmpty ? '#f1f5f9' : '#ffffff',
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Trạng thái tin đăng
                </label>
                <select
                  value={status}
                  disabled={!isRoomEmpty || submitting}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="PUBLISHED">🟢 Đang hiển thị (Công khai cho khách)</option>
                  <option value="DRAFT">📝 Bản nháp (Chưa công khai)</option>
                  <option value="HIDDEN">⏸️ Tạm ẩn (Ẩn khỏi tìm kiếm)</option>
                  <option value="RENTED">🔒 Đã cho thuê</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Ngày hết hạn tin (Mặc định 30 ngày)
                </label>
                <input
                  type="date"
                  disabled={!isRoomEmpty || submitting}
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '11px 20px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={!isRoomEmpty || submitting || isExpired}
                style={{
                  padding: '11px 26px',
                  backgroundColor: !isRoomEmpty || isExpired ? '#94a3b8' : '#2563eb',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '14.5px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: !isRoomEmpty || submitting || isExpired ? 'not-allowed' : 'pointer',
                  boxShadow: !isRoomEmpty || isExpired ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.28)',
                  transition: 'all 0.2s ease',
                }}
              >
                {submitting ? 'Đang tạo tin...' : '🚀 Xác nhận & Đăng tin'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateListingModal
