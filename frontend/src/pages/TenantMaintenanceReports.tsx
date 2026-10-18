import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

type MaintenanceReport = {
  id: number
  reportCode: string
  deviceType: string
  description: string
  urgency: 'NORMAL' | 'URGENT' | string
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | string
  managerResponse: string | null
  createdAt: string
  roomId: number
  roomCode: string
  photoIds: number[]
}
type RentedRoom = {
  id: number
  code: string
  buildingName: string
}

const API = '/api/maintenance-reports'
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

const statusLabels: Record<string, string> = {
  NEW: 'Mới',
  IN_PROGRESS: 'Đang xử lý',
  COMPLETED: 'Đã xong',
  REJECTED: 'Từ chối',
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function responseMessage(response: Response) {
  const body = await response.text()
  if (!body) return `Yêu cầu thất bại (HTTP ${response.status}).`
  try {
    const parsed = JSON.parse(body) as { message?: string; detail?: string; error?: string }
    return parsed.message || parsed.detail || parsed.error || body
  } catch {
    return body
  }
}

function PhotoPreview({ reportId, photoId }: { reportId: number; photoId: number }) {
  const [src, setSrc] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    let objectUrl = ''
    let cancelled = false
    fetch(`${API}/${reportId}/photos/${photoId}`, { headers: authHeaders() })
      .then((response) => {
        if (!response.ok) throw new Error('Không tải được ảnh')
        return response.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => { if (!cancelled) setError(true) })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [reportId, photoId])

  if (error) return <span className="maintenance-photo-error">Không tải được ảnh</span>
  if (!src) return <span className="maintenance-photo-loading">Đang tải ảnh…</span>
  return <a href={src} target="_blank" rel="noreferrer"><img className="maintenance-photo" src={src} alt="Ảnh đính kèm báo hỏng" /></a>
}

export default function TenantMaintenanceReports() {
  const [reports, setReports] = useState<MaintenanceReport[]>([])
  const [rooms, setRooms] = useState<RentedRoom[]>([])
  const [roomId, setRoomId] = useState('')
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [deviceType, setDeviceType] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT'>('NORMAL')
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadReports() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(API, { headers: authHeaders() })
      if (!response.ok) throw new Error(await responseMessage(response))
      const data = await response.json()
      if (!Array.isArray(data)) throw new Error('Dữ liệu báo hỏng trả về không đúng định dạng.')
      setReports(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách báo hỏng.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  void loadReports()

  async function loadRentedRooms() {
    setRoomsLoading(true)

    try {
      const response = await fetch('/api/rooms/my-rented', {
        headers: authHeaders(),
      })

      if (!response.ok) {
        throw new Error(await responseMessage(response))
      }

      const data: RentedRoom[] = await response.json()

      if (!Array.isArray(data)) {
        throw new Error('Danh sách phòng trả về không đúng định dạng.')
      }

      setRooms(data)
      setRoomId(data.length > 0 ? String(data[0].id) : '')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách phòng đang thuê.',
      )
    } finally {
      setRoomsLoading(false)
    }
  }

  void loadRentedRooms()
}, [])

  function onPhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || [])
    if (selected.length > 3) {
      setError('Bạn chỉ được chọn tối đa 3 ảnh.')
      event.target.value = ''
      setPhotos([])
      return
    }
    const oversized = selected.find((file) => file.size > MAX_PHOTO_BYTES)
    if (oversized) {
      setError(`Ảnh “${oversized.name}” vượt quá 5 MB.`)
      event.target.value = ''
      setPhotos([])
      return
    }
    const invalid = selected.find((file) => !['image/jpeg', 'image/png'].includes(file.type))
    if (invalid) {
      setError('Chỉ chấp nhận ảnh JPG/JPEG hoặc PNG.')
      event.target.value = ''
      setPhotos([])
      return
    }
    setError('')
    setPhotos(selected)
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!roomId) {
  setError('Vui lòng chọn phòng cần báo hỏng.')
  return
  }

  if (!deviceType.trim() || !description.trim()) {
    setError('Vui lòng nhập loại thiết bị và mô tả sự cố.')
    return
  }
    const form = new FormData()
    form.append('roomId', roomId)
    form.append('deviceType', deviceType.trim())
    form.append('description', description.trim())
    form.append('urgency', urgency)
    photos.forEach((photo) => form.append('photos', photo))
    

    setSubmitting(true)
    try {
      const response = await fetch(API, { method: 'POST', headers: authHeaders(), body: form })
      if (!response.ok) throw new Error(await responseMessage(response))
      const created = await response.json() as MaintenanceReport
      setSuccess(`Đã gửi báo hỏng ${created.reportCode}. Trạng thái hiện tại: Mới.`)
      setDeviceType('')
      setDescription('')
      setUrgency('NORMAL')
      setPhotos([])
      const input = document.getElementById('maintenance-photos') as HTMLInputElement | null
      if (input) input.value = ''
      await loadReports()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi báo hỏng.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="maintenance-page">
      <style>{`
        .maintenance-page{max-width:1100px;margin:0 auto;padding:24px;color:#172033}
        .maintenance-heading{margin-bottom:22px}.maintenance-heading h1{margin:0 0 8px;font-size:28px}.maintenance-heading p{margin:0;color:#64748b;line-height:1.55}
        .maintenance-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:22px;margin-bottom:20px;box-shadow:0 6px 22px rgba(15,23,42,.04)}
        .maintenance-card h2{margin:0 0 18px;font-size:19px}.maintenance-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .maintenance-field{display:flex;flex-direction:column;gap:7px}.maintenance-field.full{grid-column:1/-1}.maintenance-field label{font-weight:650;font-size:14px}
        .maintenance-field input,.maintenance-field select,.maintenance-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:11px 12px;font:inherit;background:#fff;color:#172033}
        .maintenance-field textarea{min-height:115px;resize:vertical}.maintenance-help{font-size:12px;color:#64748b}.maintenance-actions{display:flex;justify-content:flex-end;margin-top:18px}
        .maintenance-button{border:0;border-radius:10px;padding:12px 18px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}.maintenance-button:disabled{opacity:.55;cursor:not-allowed}
        .maintenance-alert{padding:12px 14px;border-radius:10px;margin:0 0 16px;line-height:1.45}.maintenance-alert.error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}.maintenance-alert.success{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}
        .maintenance-report{border:1px solid #e2e8f0;border-radius:13px;padding:17px;margin-top:14px}.maintenance-report-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}.maintenance-report h3{margin:0 0 6px;font-size:17px}.maintenance-muted{color:#64748b;font-size:13px}.maintenance-pill{display:inline-flex;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:750;background:#f1f5f9;color:#475569}.maintenance-pill.urgent{background:#fee2e2;color:#991b1b}.maintenance-pill.done{background:#dcfce7;color:#166534}.maintenance-report p{white-space:pre-wrap;line-height:1.55}.maintenance-response{margin-top:12px;padding:12px;border-radius:10px;background:#f8fafc;border-left:3px solid #94a3b8}.maintenance-photos{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.maintenance-photo{width:110px;height:90px;object-fit:cover;border-radius:9px;border:1px solid #e2e8f0}.maintenance-photo-loading,.maintenance-photo-error{font-size:12px;color:#64748b;padding:8px}
        @media(max-width:640px){.maintenance-page{padding:14px}.maintenance-card{padding:16px}.maintenance-grid{grid-template-columns:1fr}.maintenance-field.full{grid-column:auto}.maintenance-heading h1{font-size:23px}}
      `}</style>
      <header className="maintenance-heading">
        <h1>Báo hỏng & bảo trì</h1>
        <p>Gửi sự cố thiết bị trong phòng và theo dõi trạng thái xử lý, phản hồi của quản lý tại đây.</p>
      </header>

      <section className="maintenance-card">
        <h2>Tạo báo hỏng mới</h2>
        {error && <div className="maintenance-alert error" role="alert">{error}</div>}
        {success && <div className="maintenance-alert success" role="status">{success}</div>}
        <form onSubmit={submitReport}>
          <div className="maintenance-grid">
          {/* THÊM ĐOẠN CHỌN PHÒNG NGAY TẠI ĐÂY */}
          <div className="maintenance-field full">
            <label htmlFor="maintenance-room">Phòng cần báo hỏng *</label>
            <select
              id="maintenance-room"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
              disabled={roomsLoading || rooms.length === 0}
            >
              <option value="">
                {roomsLoading
                  ? 'Đang tải danh sách phòng…'
                  : rooms.length === 0
                    ? 'Không có phòng đang thuê hợp lệ'
                    : 'Chọn phòng cần báo hỏng'}
              </option>

              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.buildingName} – Phòng {room.code}
                </option>
              ))}
            </select>

            <span className="maintenance-help">
              Chọn đúng phòng xảy ra sự cố.
            </span>
          </div>

          {/* CÁC TRƯỜNG CŨ GIỮ NGUYÊN Ở PHÍA DƯỚI */}
            <div className="maintenance-field">
              <label htmlFor="maintenance-device">Loại thiết bị *</label>
              <input id="maintenance-device" value={deviceType} onChange={(e) => setDeviceType(e.target.value)} maxLength={120} placeholder="Ví dụ: Bình nóng lạnh, điều hòa…" required />
            </div>
            <div className="maintenance-field">
              <label htmlFor="maintenance-urgency">Mức độ khẩn *</label>
              <select id="maintenance-urgency" value={urgency} onChange={(e) => setUrgency(e.target.value as 'NORMAL' | 'URGENT')}>
                <option value="NORMAL">Thường</option>
                <option value="URGENT">Gấp</option>
              </select>
            </div>
            <div className="maintenance-field full">
              <label htmlFor="maintenance-description">Mô tả sự cố *</label>
              <textarea id="maintenance-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={3000} placeholder="Mô tả tình trạng, thời điểm xảy ra và thông tin cần lưu ý…" required />
            </div>
            <div className="maintenance-field full">
              <label htmlFor="maintenance-photos">Ảnh sự cố (không bắt buộc)</label>
              <input id="maintenance-photos" type="file" accept="image/jpeg,image/png" multiple onChange={onPhotosChange} />
              <span className="maintenance-help">Tối đa 3 ảnh JPG/PNG, mỗi ảnh không quá 5 MB.</span>
              {photos.length > 0 && <span className="maintenance-help">Đã chọn: {photos.map((photo) => photo.name).join(', ')}</span>}
            </div>
          </div>
          <div className="maintenance-actions"><button className="maintenance-button" type="submit" disabled={submitting}>{submitting ? 'Đang gửi…' : 'Gửi báo hỏng'}</button></div>
        </form>
      </section>

      <section className="maintenance-card">
        <h2>Báo hỏng của tôi</h2>
        {loading ? <p>Đang tải danh sách báo hỏng…</p> : reports.length === 0 ? <p className="maintenance-muted">Bạn chưa gửi báo hỏng nào.</p> : reports.map((report) => (
          <article className="maintenance-report" key={report.id}>
            <div className="maintenance-report-top">
              <div><h3>{report.reportCode} · {report.deviceType}</h3><div className="maintenance-muted">Phòng {report.roomCode} · {new Date(report.createdAt).toLocaleString('vi-VN')}</div></div>
              <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                <span className={`maintenance-pill ${report.urgency === 'URGENT' ? 'urgent' : ''}`}>{report.urgency === 'URGENT' ? 'Gấp' : 'Thường'}</span>
                <span className={`maintenance-pill ${report.status === 'COMPLETED' ? 'done' : ''}`}>{statusLabels[report.status] || report.status}</span>
              </div>
            </div>
            <p>{report.description}</p>
            {report.photoIds.length > 0 && <div className="maintenance-photos">{report.photoIds.map((photoId) => <PhotoPreview key={photoId} reportId={report.id} photoId={photoId} />)}</div>}
            <div className="maintenance-response"><strong>Phản hồi của quản lý</strong><div style={{marginTop:5}}>{report.managerResponse?.trim() || 'Chưa có phản hồi từ quản lý.'}</div></div>
          </article>
        ))}
      </section>
    </main>
  )
}
