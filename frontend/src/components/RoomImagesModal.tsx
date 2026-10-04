import React, { useEffect, useRef, useState } from 'react'

export interface RoomImageItem {
  id: number
  roomId: number
  imageUrl: string
  sortOrder: number
}

interface RoomImagesModalProps {
  roomId: number
  roomCode: string
  buildingName?: string
  onClose: () => void
  onUpdated?: () => void
}

const API = 'http://localhost:8080'

export const RoomImagesModal: React.FC<RoomImagesModalProps> = ({
  roomId,
  roomCode,
  buildingName,
  onClose,
  onUpdated,
}) => {
  const [images, setImages] = useState<RoomImageItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [uploading, setUploading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [successMsg, setSuccessMsg] = useState<string>('')
  const [isDragOver, setIsDragOver] = useState<boolean>(false)

  // Drag-and-drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Confirm delete modal state
  const [deletingImage, setDeletingImage] = useState<RoomImageItem | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Image zoom preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const token = localStorage.getItem('accessToken')
  const authHeaders = {
    Authorization: `Bearer ${token}`,
  }

  const loadImages = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/room-images/room/${roomId}`, {
        headers: authHeaders,
      })
      if (!res.ok) {
        throw new Error('Không thể tải danh sách ảnh.')
      }
      const data: RoomImageItem[] = await res.json()
      // Sắp xếp theo sortOrder
      data.sort((a, b) => a.sortOrder - b.sortOrder)
      setImages(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi tải ảnh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadImages()
  }, [roomId])

  // Xử lý upload file
  const handleUploadFiles = async (files: FileList | File[]) => {
    setError('')
    setSuccessMsg('')

    const fileList = Array.from(files)
    if (fileList.length === 0) return

    if (images.length + fileList.length > 8) {
      setError(`Mỗi phòng chỉ được tối đa 8 ảnh. Bạn đã có ${images.length} ảnh và chọn thêm ${fileList.length} ảnh.`)
      return
    }

    // Validate từng file
    for (const file of fileList) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg']
      if (!validTypes.includes(file.type.toLowerCase())) {
        setError(`File "${file.name}" không đúng định dạng JPG/PNG.`)
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(`File "${file.name}" vượt quá kích thước 5MB tối đa.`)
        return
      }
    }

    setUploading(true)
    let uploadedCount = 0

    try {
      for (const file of fileList) {
        const formData = new FormData()
        formData.append('image', file)

        const res = await fetch(`${API}/api/room-images/room/${roomId}`, {
          method: 'POST',
          headers: authHeaders,
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || `Lỗi tải lên ảnh ${file.name}`)
        }
        uploadedCount++
      }

      setSuccessMsg(`Tải lên thành công ${uploadedCount} ảnh!`)
      await loadImages()
      if (onUpdated) onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi tải ảnh lên.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Kéo thả file upload
  const onFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files)
    }
  }

  // Kéo thả sắp xếp thứ tự ảnh
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragEnter = (index: number) => {
    setDragOverIndex(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const updated = [...images]
    const [movedItem] = updated.splice(draggedIndex, 1)
    updated.splice(dropIndex, 0, movedItem)

    // Cập nhật lại sortOrder client-side
    const reordered = updated.map((img, idx) => ({
      ...img,
      sortOrder: idx + 1,
    }))

    setImages(reordered)
    setDraggedIndex(null)
    setDragOverIndex(null)

    // Gửi cập nhật thứ tự lên server
    try {
      const imageIds = reordered.map((img) => img.id)
      const res = await fetch(`${API}/api/room-images/room/${roomId}/order`, {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageIds }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Không thể lưu thứ tự ảnh.')
      }

      setSuccessMsg('Đã cập nhật thứ tự ảnh (Ảnh đầu tiên là ảnh đại diện)!')
      if (onUpdated) onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu thứ tự ảnh.')
      await loadImages()
    }
  }

  // Xóa ảnh sau khi xác nhận popup
  const handleConfirmDelete = async () => {
    if (!deletingImage) return
    setIsDeleting(true)
    setError('')
    setSuccessMsg('')

    try {
      const res = await fetch(`${API}/api/room-images/${deletingImage.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Không thể xóa ảnh.')
      }

      setSuccessMsg('Đã xóa ảnh thành công!')
      setDeletingImage(null)
      await loadImages()
      if (onUpdated) onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xóa ảnh.')
    } finally {
      setIsDeleting(false)
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
          maxWidth: '860px',
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
              <span style={{ fontSize: '20px' }}>🖼️</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                Quản lý ảnh thực tế - Phòng {roomCode}
              </h2>
            </div>
            {buildingName && (
              <p style={{ margin: '4px 0 0 28px', fontSize: '13px', color: '#64748b' }}>
                Tòa nhà: <strong>{buildingName}</strong> · Tối đa 8 ảnh (≤ 5MB/ảnh, định dạng JPG/PNG)
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

          {/* Drag and Drop Upload Zone */}
          {images.length < 8 && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onFileDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? '#3b82f6' : '#cbd5e1'}`,
                backgroundColor: isDragOver ? '#eff6ff' : '#f8fafc',
                borderRadius: '16px',
                padding: '30px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
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
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📤</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                Kéo & thả ảnh vào đây hoặc bấm để chọn tệp
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Hỗ trợ JPG, PNG · Tối đa 5MB/ảnh · Còn được tải thêm <strong>{8 - images.length}</strong> ảnh
              </div>
              {uploading && (
                <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>
                  ⏳ Đang tải ảnh lên...
                </div>
              )}
            </div>
          )}

          {/* Image Gallery / Reorder Grid */}
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
                Danh sách ảnh phòng ({images.length}/8)
              </h3>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                💡 Kéo thả để đổi thứ tự · Ảnh số 1 tự động làm <strong>Ảnh đại diện</strong>
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Đang tải thư viện ảnh...
              </div>
            ) : images.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                }}
              >
                Chưa có ảnh nào cho phòng này. Hãy tải lên ảnh thực tế để khách thuê dễ hình dung!
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '16px',
                }}
              >
                {images.map((img, index) => {
                  const isCover = index === 0
                  const isHovered = dragOverIndex === index
                  const isDragged = draggedIndex === index

                  return (
                    <div
                      key={img.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      style={{
                        position: 'relative',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        backgroundColor: '#f1f5f9',
                        border: isHovered
                          ? '2.5px dashed #2563eb'
                          : isCover
                          ? '2.5px solid #eb6b40'
                          : '1px solid #e2e8f0',
                        opacity: isDragged ? 0.4 : 1,
                        cursor: 'grab',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                    >
                      {/* Image Thumbnail (400px view capability) */}
                      <div
                        style={{
                          width: '100%',
                          height: '140px',
                          position: 'relative',
                          backgroundColor: '#0f172a',
                        }}
                      >
                        <img
                          src={`${API}${img.imageUrl}`}
                          alt={`Phòng ${roomCode} - ảnh ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                          onClick={() => setPreviewUrl(`${API}${img.imageUrl}`)}
                        />

                        {/* Cover Badge */}
                        {isCover && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '8px',
                              left: '8px',
                              backgroundColor: '#eb6b40',
                              color: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                              letterSpacing: '0.2px',
                            }}
                          >
                            ⭐ Ảnh đại diện
                          </div>
                        )}

                        {/* Sort Order Number Badge */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: 'rgba(15, 23, 42, 0.75)',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '6px',
                          }}
                        >
                          #{index + 1}
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div
                        style={{
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(`${API}${img.imageUrl}`)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#2563eb',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                        >
                          🔍 Xem lớn
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingImage(img)}
                          style={{
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            borderRadius: '6px',
                            padding: '4px 8px',
                          }}
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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
            Hoàn tất & Đóng
          </button>
        </div>
      </div>

      {/* POPUP XÁC NHẬN KHI XÓA ẢNH */}
      {deletingImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: '42px', marginBottom: '10px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Xác nhận xóa ảnh phòng?
            </h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa ảnh này khỏi phòng <strong>{roomCode}</strong>? Thao tác này không thể hoàn tác.
            </p>

            <div
              style={{
                width: '100%',
                maxHeight: '160px',
                overflow: 'hidden',
                borderRadius: '10px',
                marginBottom: '20px',
                backgroundColor: '#f1f5f9',
              }}
            >
              <img
                src={`${API}${deletingImage.imageUrl}`}
                alt="Ảnh cần xóa"
                style={{ width: '100%', height: '140px', objectFit: 'contain' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeletingImage(null)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PHÓNG TO ẢNH (400px+ thumbnail preview) */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '24px',
            cursor: 'zoom-out',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '800px', width: '100%', textAlign: 'center' }}>
            <img
              src={previewUrl}
              alt="Xem chi tiết ảnh phòng"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '12px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              }}
            />
            <div style={{ marginTop: '12px', color: '#ffffff', fontSize: '13px' }}>
              Bấm bất kỳ đâu để đóng
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomImagesModal
