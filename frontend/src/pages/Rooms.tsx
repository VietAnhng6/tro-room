import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RoomServicesModal from '../components/RoomServicesModal'
import CreateListingModal from '../components/CreateListingModal'

type RoomStatus = 'EMPTY' | 'DEPOSITED' | 'RENTED' | 'STOPPED'

type Building = {
  id: number
  name: string
  active: boolean
  roomCount?: number
}

type Room = {
  id: number
  code: string
  floor: number
  area: number
  rent: number
  maxPeople: number
  status: RoomStatus
  buildingId: number
  buildingName: string
}

export interface RoomImageItem {
  id: number
  roomId: number
  imageUrl: string
  sortOrder: number
}

const API = 'http://localhost:8080'

const statusLabel: Record<RoomStatus, string> = {
  EMPTY: 'Trống',
  DEPOSITED: 'Đã cọc',
  RENTED: 'Đang thuê',
  STOPPED: 'Đã ngưng',
}

const statusColor: Record<RoomStatus, { bg: string; color: string }> = {
  EMPTY: { bg: '#dcfce7', color: '#166534' },
  DEPOSITED: { bg: '#fef3c7', color: '#92400e' },
  RENTED: { bg: '#dbeafe', color: '#1d4ed8' },
  STOPPED: { bg: '#f1f5f9', color: '#475569' },
}

const getImageSrc = (img: RoomImageItem) => {
  if (!img) return ''
  if (img.imageUrl?.startsWith('http://') || img.imageUrl?.startsWith('https://')) {
    return img.imageUrl
  }
  if (img.imageUrl?.startsWith('/api/')) {
    return `${API}${img.imageUrl}`
  }
  return `${API}/api/room-images/${img.id}`
}

const compressImageFile = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (file.size < 300 * 1024) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const maxDim = 1400
        let width = img.width
        let height = img.height

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg'
            const optimizedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(optimizedFile)
          },
          'image/jpeg',
          0.82
        )
      }
      img.onerror = () => resolve(file)
      img.src = event.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

function Rooms() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])

  const [buildingId, setBuildingId] = useState(
    new URLSearchParams(window.location.search).get('buildingId') || ''
  )
  const [floor, setFloor] = useState('')
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Edit / Create Room Modal
  const [showForm, setShowForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'images'>('info')

  // Other Modals
  const [serviceModalRoom, setServiceModalRoom] = useState<Room | null>(null)
  const [listingModalRoom, setListingModalRoom] = useState<Room | null>(null)

  // Images state inside Edit Modal
  const [images, setImages] = useState<RoomImageItem[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageError, setImageError] = useState('')
  const [imageSuccess, setImageSuccess] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [deletingImage, setDeletingImage] = useState<RoomImageItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [form, setForm] = useState({
    code: '',
    floor: '',
    area: '',
    rent: '',
    maxPeople: '',
    buildingId: '',
  })

  const token = localStorage.getItem('accessToken')

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  async function loadBuildings() {
    try {
      const res = await fetch(`${API}/api/buildings`, { headers })
      if (!res.ok) return
      const data = await res.json()
      setBuildings(data)
    } catch {}
  }

  async function loadRooms() {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (buildingId) params.append('buildingId', buildingId)
      if (floor) params.append('floor', floor)

      const query = params.toString()
      const url = `${API}/api/rooms${query ? `?${query}` : ''}`

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401) {
        navigate('/')
        return
      }

      if (res.status === 403) {
        setError('Bạn không có quyền quản lý phòng.')
        setRooms([])
        return
      }

      if (!res.ok) {
        throw new Error('Không thể tải danh sách phòng.')
      }

      const data = await res.json()
      setRooms(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách phòng.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBuildings()
  }, [])

  useEffect(() => {
    loadRooms()
  }, [buildingId, floor])

  // Load images when opening edit room
  const loadRoomImages = async (roomId: number) => {
    setLoadingImages(true)
    setImageError('')
    try {
      const res = await fetch(`${API}/api/room-images/room/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data: RoomImageItem[] = await res.json()
        data.sort((a, b) => a.sortOrder - b.sortOrder)
        setImages(data)
      }
    } catch {
    } finally {
      setLoadingImages(false)
    }
  }

  function openCreate() {
    setEditingRoom(null)
    setActiveTab('info')
    setImages([])
    setImageError('')
    setImageSuccess('')
    setForm({
      code: '',
      floor: '',
      area: '',
      rent: '',
      maxPeople: '',
      buildingId: buildingId || (buildings.length > 0 ? String(buildings[0].id) : ''),
    })
    setShowForm(true)
  }

  function openEdit(room: Room) {
    setEditingRoom(room)
    setActiveTab('info')
    setImageError('')
    setImageSuccess('')
    setForm({
      code: room.code,
      floor: String(room.floor),
      area: String(room.area),
      rent: String(room.rent),
      maxPeople: String(room.maxPeople),
      buildingId: String(room.buildingId),
    })
    loadRoomImages(room.id)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingRoom(null)
    setImages([])
    setImageError('')
    setImageSuccess('')
  }

  async function saveRoom() {
    if (
      !form.code.trim() ||
      !form.floor ||
      !form.area ||
      !form.rent ||
      !form.maxPeople ||
      !form.buildingId
    ) {
      alert('Vui lòng nhập đầy đủ thông tin phòng.')
      return
    }

    const payload = {
      code: form.code.trim(),
      floor: Number(form.floor),
      area: Number(form.area),
      rent: Number(form.rent),
      maxPeople: Number(form.maxPeople),
      buildingId: Number(form.buildingId),
    }

    try {
      const url = editingRoom
        ? `${API}/api/rooms/${editingRoom.id}`
        : `${API}/api/rooms`

      const method = editingRoom ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        navigate('/')
        return
      }

      if (res.status === 403) {
        alert('Bạn không có quyền thực hiện thao tác này.')
        return
      }

      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || 'Không thể lưu phòng.')
      }

      closeForm()
      await loadRooms()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể lưu phòng.')
    }
  }

  async function changeStatus(room: Room, status: RoomStatus) {
    if (status === room.status) return

    try {
      const res = await fetch(`${API}/api/rooms/${room.id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || 'Không thể cập nhật trạng thái.')
      }

      await loadRooms()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.')
    }
  }

  // Handle image upload inside edit modal
  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!editingRoom) return
    setImageError('')
    setImageSuccess('')

    const fileList = Array.from(files)
    if (fileList.length === 0) return

    if (images.length + fileList.length > 8) {
      setImageError(
        `Mỗi phòng chỉ được tối đa 8 ảnh. Đã có ${images.length} ảnh, chọn thêm ${fileList.length} ảnh.`
      )
      return
    }

    setUploadingImages(true)
    let count = 0

    try {
      for (const rawFile of fileList) {
        const optimizedFile = await compressImageFile(rawFile)
        const formData = new FormData()
        formData.append('image', optimizedFile)

        const res = await fetch(`${API}/api/room-images/room/${editingRoom.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })

        if (!res.ok) {
          throw new Error(`Không thể tải lên ảnh "${rawFile.name}"`)
        }
        count++
      }

      setImageSuccess(`Tải lên thành công ${count} ảnh!`)
      await loadRoomImages(editingRoom.id)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Có lỗi khi tải ảnh lên.')
    } finally {
      setUploadingImages(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDropOrder = async (dropIndex: number) => {
    if (!editingRoom || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const updated = [...images]
    const [moved] = updated.splice(draggedIndex, 1)
    updated.splice(dropIndex, 0, moved)

    const reordered = updated.map((img, idx) => ({ ...img, sortOrder: idx + 1 }))
    setImages(reordered)
    setDraggedIndex(null)
    setDragOverIndex(null)

    try {
      const imageIds = reordered.map((img) => img.id)
      await fetch(`${API}/api/room-images/room/${editingRoom.id}/order`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageIds }),
      })
      setImageSuccess('Đã cập nhật thứ tự ảnh (Ảnh số 1 là ảnh đại diện)!')
    } catch {
      setImageError('Lỗi khi lưu thứ tự ảnh.')
      await loadRoomImages(editingRoom.id)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingImage || !editingRoom) return
    setIsDeleting(true)
    setImageError('')
    setImageSuccess('')

    try {
      const res = await fetch(`${API}/api/room-images/${deletingImage.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Không thể xóa ảnh.')

      setImageSuccess('Đã xóa ảnh thành công!')
      setDeletingImage(null)
      await loadRoomImages(editingRoom.id)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Lỗi khi xóa ảnh.')
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredRooms = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return rooms
    return rooms.filter((room) => room.code.toLowerCase().includes(keyword))
  }, [rooms, search])

  const emptyBuildings = useMemo(() => {
    return buildings.filter((building) => {
      if ((building.roomCount || 0) > 0) return false
      if (buildingId && String(building.id) !== buildingId) return false
      return true
    })
  }, [buildings, buildingId])

  const stats = useMemo(() => {
    return {
      total: filteredRooms.length,
      empty: filteredRooms.filter((r) => r.status === 'EMPTY').length,
      deposited: filteredRooms.filter((r) => r.status === 'DEPOSITED').length,
      rented: filteredRooms.filter((r) => r.status === 'RENTED').length,
    }
  }, [filteredRooms])

  function formatMoney(value: number) {
    return new Intl.NumberFormat('vi-VN').format(value) + ' ₫'
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px 40px', boxSizing: 'border-box' }}>
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: '#0f172a',
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: '-0.4px',
            }}
          >
            Quản lý danh sách phòng
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              color: '#64748b',
              fontSize: 14,
            }}
          >
            Theo dõi trạng thái phòng, gán dịch vụ, quản lý ảnh và đăng tin cho thuê.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={openCreate}
            style={{
              border: 0,
              borderRadius: 10,
              padding: '10px 18px',
              background: '#2563eb',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Thêm phòng mới
          </button>
        </div>
      </div>

      {/* 4 STATISTICS BLOCKS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 16,
          marginBottom: 22,
          width: '100%',
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 100,
          }}
        >
          <div style={{ color: '#64748b', fontSize: 13, fontWeight: 650 }}>Tổng số phòng</div>
          <div style={{ color: '#2563eb', fontSize: 26, fontWeight: 800, marginTop: 8 }}>
            {stats.total}
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 100,
          }}
        >
          <div style={{ color: '#64748b', fontSize: 13, fontWeight: 650 }}>Phòng trống</div>
          <div style={{ color: '#16a34a', fontSize: 26, fontWeight: 800, marginTop: 8 }}>
            {stats.empty}
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 100,
          }}
        >
          <div style={{ color: '#64748b', fontSize: 13, fontWeight: 650 }}>Đã đặt cọc</div>
          <div style={{ color: '#d97706', fontSize: 26, fontWeight: 800, marginTop: 8 }}>
            {stats.deposited}
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 100,
          }}
        >
          <div style={{ color: '#64748b', fontSize: 13, fontWeight: 650 }}>Đang cho thuê</div>
          <div style={{ color: '#7c3aed', fontSize: 26, fontWeight: 800, marginTop: 8 }}>
            {stats.rented}
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <div style={{ flex: '1 1 240px', minWidth: 200, position: 'relative' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã phòng..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '10px 14px',
              outline: 'none',
              fontSize: 14,
              background: '#ffffff',
              color: '#0f172a',
            }}
          />
        </div>

        <select
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          style={{
            minWidth: 200,
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '10px 14px',
            background: '#fff',
            fontSize: 14,
            outline: 'none',
            color: '#1e293b',
          }}
        >
          <option value="">Tất cả tòa nhà</option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </select>

        <select
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          style={{
            minWidth: 140,
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '10px 14px',
            background: '#fff',
            fontSize: 14,
            outline: 'none',
            color: '#1e293b',
          }}
        >
          <option value="">Tất cả tầng</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((f) => (
            <option key={f} value={f}>
              Tầng {f}
            </option>
          ))}
        </select>
      </div>

      {/* ERROR */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: 10,
            padding: 14,
            marginBottom: 18,
          }}
        >
          {error}
        </div>
      )}

      {/* ROOMS TABLE */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(15,23,42,.03)',
        }}
      >
        {loading ? (
          <div style={{ padding: 50, textAlign: 'center', color: '#64748b' }}>
            Đang tải danh sách phòng...
          </div>
        ) : filteredRooms.length === 0 && emptyBuildings.length === 0 ? (
          <div style={{ padding: 50, textAlign: 'center' }}>
            <div style={{ color: '#0f172a', fontSize: 17, fontWeight: 750, marginBottom: 6 }}>
              Chưa có phòng nào
            </div>
            <div style={{ color: '#64748b', fontSize: 14 }}>
              Hãy bấm nút "Thêm phòng mới" ở trên để bắt đầu tạo phòng.
            </div>
          </div>
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
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <th style={thStyleCenter}>STT</th>
                  <th style={thStyleCenter}>Mã phòng</th>
                  <th style={thStyleCenter}>Tòa nhà</th>
                  <th style={thStyleCenter}>Tầng</th>
                  <th style={thStyleCenter}>Diện tích</th>
                  <th style={thStyleCenter}>Giá thuê</th>
                  <th style={thStyleCenter}>Tối đa</th>
                  <th style={thStyleCenter}>Trạng thái</th>
                  <th style={thStyleCenter}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredRooms.map((room, idx) => {
                  const status = statusColor[room.status]

                  return (
                    <tr
                      key={room.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      {/* STT */}
                      <td style={tdStyleCenter}>
                        <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
                          #{idx + 1}
                        </span>
                      </td>

                      {/* Mã phòng */}
                      <td style={tdStyleCenter}>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>
                          {room.code}
                        </span>
                      </td>

                      {/* Tòa nhà */}
                      <td style={tdStyleCenter}>
                        <span style={{ color: '#334155', fontWeight: 600, fontSize: 13.5 }}>
                          {room.buildingName}
                        </span>
                      </td>

                      {/* Tầng */}
                      <td style={tdStyleCenter}>
                        <span style={{ color: '#475569', fontSize: 13.5 }}>
                          Tầng {room.floor}
                        </span>
                      </td>

                      {/* Diện tích */}
                      <td style={tdStyleCenter}>
                        <span style={{ color: '#475569', fontSize: 13.5, fontWeight: 600 }}>
                          {room.area} m²
                        </span>
                      </td>

                      {/* Giá thuê */}
                      <td style={tdStyleCenter}>
                        <span style={{ color: '#0f172a', fontWeight: 800, fontSize: 14 }}>
                          {formatMoney(room.rent)}
                        </span>
                      </td>

                      {/* Tối đa */}
                      <td style={tdStyleCenter}>
                        <span style={{ color: '#475569', fontSize: 13 }}>
                          {room.maxPeople} người
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td style={tdStyleCenter}>
                        <select
                          value={room.status}
                          disabled={
                            buildings.find((b) => b.id === room.buildingId)?.active === false
                          }
                          onChange={(e) => changeStatus(room, e.target.value as RoomStatus)}
                          style={{
                            border: 0,
                            borderRadius: 999,
                            padding: '6px 12px',
                            background: status.bg,
                            color: status.color,
                            fontWeight: 750,
                            fontSize: 12,
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          {Object.entries(statusLabel).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Thao tác */}
                      <td style={tdStyleCenter}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            onClick={() => setServiceModalRoom(room)}
                            title="Gán dịch vụ và đơn giá riêng cho phòng"
                            style={{
                              border: '1px solid #bfdbfe',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              borderRadius: 6,
                              padding: '6px 10px',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '12px',
                            }}
                          >
                            Dịch vụ
                          </button>

                          <button
                            onClick={() => setListingModalRoom(room)}
                            disabled={room.status !== 'EMPTY'}
                            style={{
                              border: room.status === 'EMPTY' ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                              background: room.status === 'EMPTY' ? '#fff7ed' : '#f8fafc',
                              color: room.status === 'EMPTY' ? '#ea580c' : '#94a3b8',
                              borderRadius: 6,
                              padding: '6px 10px',
                              cursor: room.status === 'EMPTY' ? 'pointer' : 'not-allowed',
                              fontWeight: 700,
                              fontSize: '12px',
                              opacity: room.status === 'EMPTY' ? 1 : 0.6,
                            }}
                          >
                            Đăng tin
                          </button>

                          <button
                            onClick={() => openEdit(room)}
                            title="Chỉnh sửa thông tin và quản lý ảnh phòng"
                            style={{
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              color: '#334155',
                              borderRadius: 6,
                              padding: '6px 12px',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '12px',
                            }}
                          >
                            Sửa
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {emptyBuildings.map((building) => (
                  <tr
                    key={`building-${building.id}`}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: '#fafafa',
                    }}
                  >
                    <td colSpan={9} style={{ padding: '16px 20px', textAlign: 'center', color: '#64748b' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{building.name}</span> — Chưa có phòng nào.{' '}
                      <button
                        onClick={() => {
                          setForm({
                            code: '',
                            floor: '',
                            area: '',
                            rent: '',
                            maxPeople: '',
                            buildingId: String(building.id),
                          })
                          setEditingRoom(null)
                          setShowForm(true)
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#2563eb',
                          cursor: 'pointer',
                          fontWeight: 700,
                          textDecoration: 'underline',
                          marginLeft: 6,
                        }}
                      >
                        Thêm phòng ngay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL SỬA PHÒNG / TẠO PHÒNG ================= */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,.55)',
            backdropFilter: 'blur(3px)',
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
              maxWidth: editingRoom ? 800 : 560,
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#fff',
              borderRadius: 16,
              padding: '26px 30px',
              boxShadow: '0 25px 70px rgba(15,23,42,.25)',
              boxSizing: 'border-box',
            }}
          >
            {/* MODAL HEADER */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: '#0f172a',
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  {editingRoom ? `Chỉnh sửa phòng ${editingRoom.code}` : 'Thêm phòng mới'}
                </h2>
                <p
                  style={{
                    margin: '4px 0 0',
                    color: '#64748b',
                    fontSize: 13,
                  }}
                >
                  {editingRoom
                    ? 'Chỉnh sửa thông số phòng và tải ảnh thực tế bên dưới.'
                    : 'Nhập các thông tin cơ bản để tạo phòng.'}
                </p>
              </div>

              <button
                onClick={closeForm}
                style={{
                  border: 0,
                  background: '#f1f5f9',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 16,
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* TAB SELECTOR */}
            {editingRoom && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: 10,
                  marginBottom: 18,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  style={{
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: activeTab === 'info' ? '#eff6ff' : 'transparent',
                    color: activeTab === 'info' ? '#2563eb' : '#64748b',
                    fontWeight: 750,
                    fontSize: 13.5,
                    cursor: 'pointer',
                  }}
                >
                  Thông tin phòng
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('images')}
                  style={{
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: activeTab === 'images' ? '#eff6ff' : 'transparent',
                    color: activeTab === 'images' ? '#2563eb' : '#64748b',
                    fontWeight: 750,
                    fontSize: 13.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>Quản lý ảnh thực tế</span>
                  <span
                    style={{
                      background: activeTab === 'images' ? '#2563eb' : '#cbd5e1',
                      color: '#ffffff',
                      fontSize: 11,
                      padding: '1px 6px',
                      borderRadius: 10,
                      fontWeight: 800,
                    }}
                  >
                    {images.length}
                  </span>
                </button>
              </div>
            )}

            {/* TAB 1: BASIC INFO */}
            {(activeTab === 'info' || !editingRoom) && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 16,
                  }}
                >
                  <label>
                    <div style={labelStyle}>Mã phòng *</div>
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="Ví dụ: 101"
                      style={inputStyle}
                    />
                  </label>

                  <label>
                    <div style={labelStyle}>Tòa nhà *</div>
                    <select
                      value={form.buildingId}
                      onChange={(e) => setForm({ ...form, buildingId: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Chọn tòa nhà</option>
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <div style={labelStyle}>Tầng *</div>
                    <input
                      type="number"
                      min="1"
                      value={form.floor}
                      onChange={(e) => setForm({ ...form, floor: e.target.value })}
                      placeholder="Ví dụ: 2"
                      style={inputStyle}
                    />
                  </label>

                  <label>
                    <div style={labelStyle}>Diện tích (m²) *</div>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: e.target.value })}
                      placeholder="Ví dụ: 25.5"
                      style={inputStyle}
                    />
                  </label>

                  <label>
                    <div style={labelStyle}>Giá thuê (VNĐ) *</div>
                    <input
                      type="number"
                      min="0"
                      value={form.rent}
                      onChange={(e) => setForm({ ...form, rent: e.target.value })}
                      placeholder="Ví dụ: 2500000"
                      style={inputStyle}
                    />
                  </label>

                  <label>
                    <div style={labelStyle}>Số người tối đa *</div>
                    <input
                      type="number"
                      min="1"
                      value={form.maxPeople}
                      onChange={(e) => setForm({ ...form, maxPeople: e.target.value })}
                      placeholder="Ví dụ: 2"
                      style={inputStyle}
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 10,
                    marginTop: 24,
                  }}
                >
                  <button
                    type="button"
                    onClick={closeForm}
                    style={{
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#334155',
                      borderRadius: 8,
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontWeight: 650,
                      fontSize: 13.5,
                    }}
                  >
                    Hủy bỏ
                  </button>

                  <button
                    type="button"
                    onClick={saveRoom}
                    style={{
                      border: 0,
                      background: '#2563eb',
                      color: '#fff',
                      borderRadius: 8,
                      padding: '10px 20px',
                      cursor: 'pointer',
                      fontWeight: 750,
                      fontSize: 13.5,
                    }}
                  >
                    {editingRoom ? 'Lưu thông tin phòng' : 'Thêm phòng mới'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: ROOM IMAGES (WITH INSTANT ZOOM CLICK CAPABILITY) */}
            {editingRoom && activeTab === 'images' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {imageError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      color: '#dc2626',
                      fontSize: '13px',
                    }}
                  >
                    {imageError}
                  </div>
                )}

                {imageSuccess && (
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '8px',
                      color: '#059669',
                      fontSize: '13px',
                    }}
                  >
                    {imageSuccess}
                  </div>
                )}

                {/* Upload Box */}
                {images.length < 8 && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragOver(true)
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragOver(false)
                      if (e.dataTransfer.files) handleUploadFiles(e.dataTransfer.files)
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragOver ? '#2563eb' : '#cbd5e1'}`,
                      backgroundColor: isDragOver ? '#eff6ff' : '#f8fafc',
                      borderRadius: '12px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/png, image/jpeg, image/jpg"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files) handleUploadFiles(e.target.files)
                      }}
                    />
                    <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e293b', marginBottom: '3px' }}>
                      Kéo thả ảnh vào đây hoặc bấm để chọn tệp
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                      Định dạng JPG, PNG (tối đa 5MB) · Còn được tải thêm <strong>{8 - images.length}</strong> ảnh
                    </div>
                    {uploadingImages && (
                      <div style={{ marginTop: '10px', fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                        Đang tải ảnh lên...
                      </div>
                    )}
                  </div>
                )}

                {/* Images Grid */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                      Danh sách ảnh phòng ({images.length}/8)
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Kéo thả để sắp xếp · Bấm vào ảnh để xem kích thước lớn
                    </span>
                  </div>

                  {loadingImages ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Đang tải ảnh...
                    </div>
                  ) : images.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '30px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px dashed #cbd5e1',
                        color: '#64748b',
                        fontSize: '13.5px',
                      }}
                    >
                      Chưa có ảnh nào cho phòng này. Hãy tải lên ảnh thực tế.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {images.map((img, index) => {
                        const isCover = index === 0
                        const isHovered = dragOverIndex === index
                        const isDragged = draggedIndex === index
                        const fullSrc = getImageSrc(img)

                        return (
                          <div
                            key={img.id}
                            draggable
                            onDragStart={() => setDraggedIndex(index)}
                            onDragEnter={() => setDragOverIndex(index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDropOrder(index)}
                            style={{
                              position: 'relative',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              backgroundColor: '#f1f5f9',
                              border: isHovered
                                ? '2px dashed #2563eb'
                                : isCover
                                ? '2.5px solid #2563eb'
                                : '1px solid #e2e8f0',
                              opacity: isDragged ? 0.4 : 1,
                              cursor: 'grab',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                            }}
                          >
                            {/* Image Thumbnail with Direct Click to Zoom */}
                            <div
                              style={{ width: '100%', height: '115px', position: 'relative', cursor: 'pointer', background: '#0f172a' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setPreviewUrl(fullSrc)
                              }}
                              title="Bấm để xem ảnh kích thước lớn"
                            >
                              <img
                                src={fullSrc}
                                alt={`Ảnh ${index + 1}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block',
                                }}
                              />
                              {isCover && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 6,
                                    left: 6,
                                    background: '#2563eb',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                  }}
                                >
                                  Ảnh đại diện
                                </div>
                              )}
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 6,
                                  right: 6,
                                  background: 'rgba(0,0,0,0.7)',
                                  color: '#fff',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                }}
                              >
                                #{index + 1}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div
                              style={{
                                padding: '6px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#fff',
                              }}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPreviewUrl(fullSrc)
                                }}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#2563eb',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                Xem ảnh
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletingImage(img)
                                }}
                                style={{
                                  border: 'none',
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  borderRadius: 4,
                                  padding: '3px 7px',
                                }}
                              >
                                Xóa
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={closeForm}
                    style={{
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      borderRadius: 8,
                      padding: '10px 18px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '13.5px',
                    }}
                  >
                    Hoàn tất & Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '380px',
              padding: '22px',
              textAlign: 'center',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              Xác nhận xóa ảnh này?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              Thao tác này sẽ xóa vĩnh viễn ảnh khỏi phòng trọ.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeletingImage(null)}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa ảnh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZOOM PREVIEW MODAL (TOP Z-INDEX, HIGH CLARITY VIEW) */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '30px',
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              style={{
                position: 'absolute',
                top: -16,
                right: -16,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#ffffff',
                color: '#0f172a',
                border: 'none',
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                zIndex: 2010,
              }}
            >
              ✕
            </button>
            <img
              src={previewUrl}
              alt="Xem ảnh lớn"
              style={{
                maxWidth: '90vw',
                maxHeight: '86vh',
                objectFit: 'contain',
                borderRadius: '10px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                backgroundColor: '#0f172a',
              }}
            />
          </div>
        </div>
      )}

      {/* ROOM SERVICES MODAL */}
      {serviceModalRoom && (
        <RoomServicesModal
          roomId={serviceModalRoom.id}
          roomCode={serviceModalRoom.code}
          buildingName={serviceModalRoom.buildingName}
          onClose={() => setServiceModalRoom(null)}
          onUpdated={loadRooms}
        />
      )}

      {/* CREATE LISTING MODAL */}
      {listingModalRoom && (
        <CreateListingModal
          room={listingModalRoom}
          onClose={() => setListingModalRoom(null)}
          onSuccess={loadRooms}
        />
      )}
    </div>
  )
}

const thStyleCenter: React.CSSProperties = {
  textAlign: 'center',
  padding: '14px 16px',
  color: '#64748b',
  fontSize: 13,
  fontWeight: 750,
  whiteSpace: 'nowrap',
}

const tdStyleCenter: React.CSSProperties = {
  textAlign: 'center',
  padding: '14px 16px',
  verticalAlign: 'middle',
}

const labelStyle: React.CSSProperties = {
  color: '#334155',
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 7,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '10px 12px',
  outline: 'none',
  fontSize: 14,
  background: '#fff',
}

export default Rooms