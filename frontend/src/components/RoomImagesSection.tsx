import React, { useEffect, useRef, useState } from 'react'

export interface RoomImageItem {
  id: number
  roomId: number
  imageUrl: string
  sortOrder: number
}

interface RoomImagesSectionProps {
  roomId: number
  roomCode: string
  buildingName?: string
  onUpdated?: () => void
}

const API = 'http://localhost:8080'

// Helper function lấy URL ảnh
const getImageSrc = (img: RoomImageItem) => {
  if (!img) return ''
  if (img.imageUrl?.startsWith('http://') || img.imageUrl?.startsWith('https://')) {
    return img.imageUrl
  }
  if (img.imageUrl?.startsWith('/api/room-images/')) {
    return `${API}${img.imageUrl}`
  }
  return `${API}/api/room-images/${img.id}`
}

// Nén ảnh client-side tối ưu tốc độ & không bao giờ bị 413 Payload Too Large
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

export const RoomImagesSection: React.FC<RoomImagesSectionProps> = ({
  roomId,
  roomCode,
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
      data.sort((a, b) => a.sortOrder - b.sortOrder)
      setImages(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi tải ảnh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (roomId) {
      loadImages()
    }
  }, [roomId])

  const handleUploadFiles = async (files: FileList | File[]) => {
    setError('')
    setSuccessMsg('')

    const fileList = Array.from(files)
    if (fileList.length === 0) return

    if (images.length + fileList.length > 8) {
      setError(`Mỗi phòng chỉ được tối đa 8 ảnh. Hiện có ${images.length} ảnh và bạn đã chọn thêm ${fileList.length} ảnh.`)
      return
    }

    for (const file of fileList) {
      const lowerName = file.name.toLowerCase()
      const isAllowedExt = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png') || lowerName.endsWith('.webp')
      const isAllowedType = file.type.startsWith('image/')

      if (!isAllowedExt && !isAllowedType) {
        setError(`File "${file.name}" không đúng định dạng. Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.`)
        return
      }

      if (file.size > 8 * 1024 * 1024) {
        setError(`File "${file.name}" vượt quá kích thước tối đa (8MB).`)
        return
      }
    }

    setUploading(true)
    let uploadedCount = 0

    try {
      for (const rawFile of fileList) {
        const optimizedFile = await compressImageFile(rawFile)
        const formData = new FormData()
        formData.append('image', optimizedFile)

        const res = await fetch(`${API}/api/room-images/room/${roomId}`, {
          method: 'POST',
          headers: authHeaders,
          body: formData,
        })

        if (!res.ok) {
          let serverMsg = ''
          try {
            const data = await res.json()
            if (data && data.message) serverMsg = data.message
          } catch {
            const txt = await res.text().catch(() => '')
            if (txt) serverMsg = txt
          }
          throw new Error(serverMsg || `Không thể tải lên ảnh "${rawFile.name}" (Mã lỗi ${res.status}).`)
        }
        uploadedCount++
      }

      setSuccessMsg(`Đã tải lên thành công ${uploadedCount} ảnh!`)
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

  const onFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files)
    }
  }

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

    const reordered = updated.map((img, idx) => ({
      ...img,
      sortOrder: idx + 1,
    }))

    setImages(reordered)
    setDraggedIndex(null)
    setDragOverIndex(null)

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

      setSuccessMsg('Đã lưu thứ tự ảnh mới (Ảnh số 1 là ảnh đại diện)!')
      if (onUpdated) onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu thứ tự ảnh.')
      await loadImages()
    }
  }

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
        marginTop: '22px',
        paddingTop: '20px',
        borderTop: '1px solid #e2e8f0',
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🖼️</span>
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 750,
                color: '#0f172a',
              }}
            >
              Ảnh thực tế phòng {roomCode} ({images.length}/8)
            </h3>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
            Kéo thả để sắp xếp · Ảnh vị trí số 1 sẽ làm ảnh đại diện tin đăng
          </p>
        </div>

        {images.length < 8 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '7px 14px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '8px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>➕</span>
            <span>{uploading ? 'Đang tải...' : 'Thêm ảnh'}</span>
          </button>
        )}
      </div>

      {/* Thông báo lỗi / thành công */}
      {error && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '13px',
            marginBottom: '12px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            color: '#059669',
            fontSize: '13px',
            marginBottom: '12px',
          }}
        >
          ✓ {successMsg}
        </div>
      )}

      {/* Input file ẩn */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/png, image/jpeg, image/jpg, image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) handleUploadFiles(e.target.files)
        }}
      />

      {/* Drag & Drop Upload Zone (nếu chưa đủ 8 ảnh) */}
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
            border: `2px dashed ${isDragOver ? '#2563eb' : '#cbd5e1'}`,
            backgroundColor: isDragOver ? '#eff6ff' : '#f8fafc',
            borderRadius: '12px',
            padding: '20px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: '16px',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ fontSize: '26px', marginBottom: '6px' }}>📤</div>
          <div style={{ fontSize: '13.5px', fontWeight: 650, color: '#1e293b', marginBottom: '2px' }}>
            Kéo thả ảnh vào đây hoặc bấm để chọn tệp từ máy
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Hỗ trợ JPG, PNG, WEBP · Tối đa 5MB/ảnh · Còn được thêm <strong>{8 - images.length}</strong> ảnh
          </div>
          {uploading && (
            <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>
              ⏳ Đang nén & tải ảnh lên...
            </div>
          )}
        </div>
      )}

      {/* Danh sách ảnh hiện tại */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px' }}>
          Đang tải danh sách ảnh phòng...
        </div>
      ) : images.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 16px',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
            fontSize: '13px',
          }}
        >
          Chưa có ảnh nào cho phòng này. Hãy tải lên ảnh thực tế để khách dễ hình dung khi xem tin!
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '12px',
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
                  borderRadius: '10px',
                  overflow: 'hidden',
                  backgroundColor: '#f1f5f9',
                  border: isHovered
                    ? '2.5px dashed #2563eb'
                    : isCover
                    ? '2.5px solid #2563eb'
                    : '1px solid #e2e8f0',
                  opacity: isDragged ? 0.4 : 1,
                  cursor: 'grab',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: '100%',
                    height: '110px',
                    position: 'relative',
                    backgroundColor: '#0f172a',
                  }}
                >
                  <img
                    src={getImageSrc(img)}
                    alt={`Phòng ${roomCode} - ảnh ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      cursor: 'zoom-in',
                    }}
                    onClick={() => setPreviewUrl(getImageSrc(img))}
                  />

                  {/* Cover Badge */}
                  {isCover && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      ⭐ Ảnh đại diện
                    </div>
                  )}

                  {/* Thứ tự */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    #{index + 1}
                  </div>
                </div>

                {/* Controls */}
                <div
                  style={{
                    padding: '6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(getImageSrc(img))}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#2563eb',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '2px 4px',
                    }}
                  >
                    🔍 Xem
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingImage(img)}
                    style={{
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      color: '#dc2626',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRadius: '5px',
                      padding: '2px 6px',
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
              maxWidth: '400px',
              padding: '22px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: '38px', marginBottom: '8px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              Xác nhận xóa ảnh?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa ảnh này khỏi phòng <strong>{roomCode}</strong>?
            </p>

            <div
              style={{
                width: '100%',
                maxHeight: '140px',
                overflow: 'hidden',
                borderRadius: '8px',
                marginBottom: '18px',
                backgroundColor: '#f1f5f9',
              }}
            >
              <img
                src={getImageSrc(deletingImage)}
                alt="Ảnh cần xóa"
                style={{ width: '100%', height: '130px', objectFit: 'contain' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeletingImage(null)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
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
                  padding: '9px 14px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa ảnh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PHÓNG TO ẢNH */}
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

export default RoomImagesSection
