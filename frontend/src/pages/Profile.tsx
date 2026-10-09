import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type ProfileData = {
  dateOfBirth?: string
  citizenId?: string
  hometown?: string
  job?: string
  idFrontUrl?: string
  idBackUrl?: string
}

interface ZoomState {
  src: string
  title: string
}

export function Profile() {
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [citizenId, setCitizenId] = useState('')
  const [existingCitizenId, setExistingCitizenId] = useState('')
  const [hometown, setHometown] = useState('')
  const [job, setJob] = useState('')

  const [idFront, setIdFront] = useState<File | null>(null)
  const [idBack, setIdBack] = useState<File | null>(null)
  const [idFrontPreview, setIdFrontPreview] = useState<string>('')
  const [idBackPreview, setIdBackPreview] = useState<string>('')
  const [idFrontUrl, setIdFrontUrl] = useState('')
  const [idBackUrl, setIdBackUrl] = useState('')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Zoom lightbox modal state
  const [zoomState, setZoomState] = useState<ZoomState | null>(null)
  const [zoomScale, setZoomScale] = useState(1)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const loadProfile = async () => {
      const accessToken = localStorage.getItem('accessToken')

      if (!accessToken) {
        window.location.href = '/'
        return
      }

      try {
        const response = await fetch('http://localhost:8080/api/profile', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (response.status === 401) {
          localStorage.clear()
          window.location.href = '/'
          return
        }

        if (response.status === 403) {
          window.location.href = '/403'
          return
        }

        if (!response.ok) {
          throw new Error('Không thể tải hồ sơ.')
        }

        const data: ProfileData = await response.json()

        setDateOfBirth(data.dateOfBirth || '')
        setHometown(data.hometown || '')
        setJob(data.job || '')
        setIdFrontUrl(data.idFrontUrl || '')
        setIdBackUrl(data.idBackUrl || '')

        if (data.citizenId) {
          setExistingCitizenId(data.citizenId)
          if (/^\d{9}$|^\d{12}$/.test(data.citizenId)) {
            setCitizenId(data.citizenId)
          }
        }
      } catch (err) {
        console.error(err)
        setError('Không thể tải hồ sơ. Vui lòng thử lại.')
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [])

  // Load existing CCCD images from backend if available
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) return

    if (idFrontUrl && !idFront) {
      fetch('http://localhost:8080/api/profile/id-image/front', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (blob) setIdFrontPreview(URL.createObjectURL(blob))
        })
        .catch(() => {})
    }

    if (idBackUrl && !idBack) {
      fetch('http://localhost:8080/api/profile/id-image/back', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (blob) setIdBackPreview(URL.createObjectURL(blob))
        })
        .catch(() => {})
    }
  }, [idFrontUrl, idBackUrl, idFront, idBack])

  // Esc key handler for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zoomState) {
        closeZoom()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zoomState])

  const openZoom = (src: string, title: string) => {
    if (!src) return
    setZoomScale(1)
    setRotation(0)
    setZoomState({ src, title })
    document.body.style.overflow = 'hidden'
  }

  const closeZoom = () => {
    setZoomState(null)
    setZoomScale(1)
    setRotation(0)
    document.body.style.overflow = ''
  }

  const validateFile = (file: File | null) => {
    if (!file) return true
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Ảnh CCCD phải là định dạng JPG hoặc PNG.')
      return false
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh CCCD không được vượt quá 5MB.')
      return false
    }
    return true
  }

  const handleFrontFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setMessage('')
    const file = event.target.files?.[0] || null
    if (!file) return

    if (!validateFile(file)) {
      event.target.value = ''
      return
    }

    setIdFront(file)
    setIdFrontPreview(URL.createObjectURL(file))
  }

  const handleBackFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setMessage('')
    const file = event.target.files?.[0] || null
    if (!file) return

    if (!validateFile(file)) {
      event.target.value = ''
      return
    }

    setIdBack(file)
    setIdBackPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setMessage('')
    setError('')

    if (!/^\d{9}$|^\d{12}$/.test(citizenId)) {
      setError(
        existingCitizenId
          ? 'CCCD hiện tại đang được ẩn. Nếu muốn cập nhật CCCD, hãy nhập lại đủ 9 hoặc 12 chữ số.'
          : 'CCCD phải gồm 9 hoặc 12 chữ số.'
      )
      return
    }

    if (dateOfBirth) {
      const today = new Date()
      const selectedDate = new Date(`${dateOfBirth}T00:00:00`)
      if (selectedDate > today) {
        setError('Ngày sinh không được lớn hơn ngày hiện tại.')
        return
      }
    }

    if (!validateFile(idFront) || !validateFile(idBack)) return

    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      window.location.href = '/'
      return
    }

    const formData = new FormData()
    formData.append('dateOfBirth', dateOfBirth)
    formData.append('citizenId', citizenId)
    formData.append('hometown', hometown)
    formData.append('job', job)

    if (idFront) formData.append('idFront', idFront)
    if (idBack) formData.append('idBack', idBack)

    try {
      setLoading(true)
      const response = await fetch('http://localhost:8080/api/profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      })

      const text = await response.text()
      let data: { message?: string } = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {}

      if (response.status === 401) {
        localStorage.clear()
        window.location.href = '/'
        return
      }

      if (response.status === 403) {
        window.location.href = '/403'
        return
      }

      if (!response.ok) {
        throw new Error(data.message || text || 'Không thể lưu hồ sơ.')
      }

      setExistingCitizenId(citizenId)
      setMessage('Thông tin hồ sơ và ảnh thẻ CCCD đã được lưu thành công.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu hồ sơ.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingProfile) {
    return (
      <div style={{ maxWidth: 1000, margin: '40px auto', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
        Đang tải thông tin hồ sơ...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px 40px', boxSizing: 'border-box' }}>
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '28px 32px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
            Hồ sơ cá nhân & Định danh CCCD
          </h1>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 13.5 }}>
            Cập nhật thông tin định danh cá nhân và tải ảnh thẻ căn cước công dân 2 mặt.
          </p>
        </div>

        {/* ALERTS */}
        {message && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 8,
              color: '#047857',
              fontSize: 13.5,
              fontWeight: 650,
              marginBottom: 18,
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              color: '#dc2626',
              fontSize: 13.5,
              fontWeight: 650,
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        {/* SECTION 1: THÔNG TIN CÁ NHÂN */}
        <div
          style={{
            padding: 22,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>
            Thông tin cơ bản
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div>
              <label style={labelStyle}>Ngày sinh</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => {
                  setDateOfBirth(e.target.value)
                  setError('')
                  setMessage('')
                }}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Số Căn cước công dân (CCCD)</label>
              <input
                type="text"
                inputMode="numeric"
                value={citizenId}
                onChange={(e) => {
                  setCitizenId(e.target.value.replace(/\D/g, ''))
                  setError('')
                  setMessage('')
                }}
                placeholder={
                  existingCitizenId
                    ? `Hiện tại: ${existingCitizenId} (Nhập lại để đổi)`
                    : 'Nhập 9 hoặc 12 chữ số'
                }
                maxLength={12}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Quê quán</label>
              <input
                type="text"
                value={hometown}
                onChange={(e) => {
                  setHometown(e.target.value)
                  setError('')
                  setMessage('')
                }}
                placeholder="Nhập quê quán (Tỉnh / Thành phố)"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Nghề nghiệp</label>
              <input
                type="text"
                value={job}
                onChange={(e) => {
                  setJob(e.target.value)
                  setError('')
                  setMessage('')
                }}
                placeholder="Nhập nghề nghiệp hiện tại"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: GIẤY TỜ CCCD 2 MẶT */}
        <div
          style={{
            padding: 22,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            marginBottom: 24,
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>
              Ảnh thẻ CCCD 2 mặt
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              Sau khi chọn tệp, ảnh sẽ hiển thị ngay bên cạnh. Bấm trực tiếp vào ảnh hoặc nút Xem để phóng to chi tiết.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
            {/* CCCD MẶT TRƯỚC */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 750, fontSize: 13.5, color: '#0f172a' }}>
                  CCCD Mặt trước
                </span>
                {idFrontPreview && (
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: '#059669',
                      background: '#ecfdf5',
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid #a7f3d0',
                    }}
                  >
                    Đã tải ảnh
                  </span>
                )}
              </div>

              {/* Side-by-side: Input + Preview */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                <label
                  style={{
                    flex: 1,
                    border: '1.5px dashed #93c5fd',
                    borderRadius: 10,
                    padding: '16px 12px',
                    textAlign: 'center',
                    background: '#eff6ff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleFrontFileChange}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                    {idFront ? idFront.name : 'Chọn ảnh mặt trước'}
                  </span>
                  <span style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                    JPG, PNG (tối đa 5MB)
                  </span>
                </label>

                {/* Instant preview with Zoom Click */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div
                    onClick={() => idFrontPreview && openZoom(idFrontPreview, 'Ảnh CCCD Mặt trước')}
                    style={{
                      width: 140,
                      height: 95,
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: idFrontPreview ? 'pointer' : 'default',
                      position: 'relative',
                      boxShadow: idFrontPreview ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    }}
                    title={idFrontPreview ? 'Bấm để xem ảnh kích thước lớn' : undefined}
                  >
                    {idFrontPreview ? (
                      <>
                        <img
                          src={idFrontPreview}
                          alt="CCCD mặt trước"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: '#ffffff',
                            fontSize: 10,
                            fontWeight: 700,
                            textAlign: 'center',
                            padding: '3px 0',
                          }}
                        >
                          Bấm để xem
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 8 }}>
                        Chưa có ảnh
                      </span>
                    )}
                  </div>

                  {idFrontPreview && (
                    <button
                      type="button"
                      onClick={() => openZoom(idFrontPreview, 'Ảnh CCCD Mặt trước')}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#2563eb',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      Xem phóng to
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* CCCD MẶT SAU */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 750, fontSize: 13.5, color: '#0f172a' }}>
                  CCCD Mặt sau
                </span>
                {idBackPreview && (
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: '#059669',
                      background: '#ecfdf5',
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid #a7f3d0',
                    }}
                  >
                    Đã tải ảnh
                  </span>
                )}
              </div>

              {/* Side-by-side: Input + Preview */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                <label
                  style={{
                    flex: 1,
                    border: '1.5px dashed #93c5fd',
                    borderRadius: 10,
                    padding: '16px 12px',
                    textAlign: 'center',
                    background: '#eff6ff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleBackFileChange}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                    {idBack ? idBack.name : 'Chọn ảnh mặt sau'}
                  </span>
                  <span style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                    JPG, PNG (tối đa 5MB)
                  </span>
                </label>

                {/* Instant preview with Zoom Click */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div
                    onClick={() => idBackPreview && openZoom(idBackPreview, 'Ảnh CCCD Mặt sau')}
                    style={{
                      width: 140,
                      height: 95,
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: idBackPreview ? 'pointer' : 'default',
                      position: 'relative',
                      boxShadow: idBackPreview ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    }}
                    title={idBackPreview ? 'Bấm để xem ảnh kích thước lớn' : undefined}
                  >
                    {idBackPreview ? (
                      <>
                        <img
                          src={idBackPreview}
                          alt="CCCD mặt sau"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: '#ffffff',
                            fontSize: 10,
                            fontWeight: 700,
                            textAlign: 'center',
                            padding: '3px 0',
                          }}
                        >
                          Bấm để xem
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 8 }}>
                        Chưa có ảnh
                      </span>
                    )}
                  </div>

                  {idBackPreview && (
                    <button
                      type="button"
                      onClick={() => openZoom(idBackPreview, 'Ảnh CCCD Mặt sau')}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#2563eb',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      Xem phóng to
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '11px 24px',
              borderRadius: 8,
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 750,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.15s ease',
            }}
          >
            {loading ? 'Đang lưu...' : 'Lưu thông tin hồ sơ'}
          </button>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX MODAL WITH CREATEPORTAL */}
      {zoomState &&
        createPortal(
          <div
            onClick={closeZoom}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999,
              padding: '20px',
              boxSizing: 'border-box',
            }}
          >
            {/* LIGHTBOX TOPBAR */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 18px',
                background: 'rgba(30, 41, 59, 0.95)',
                borderRadius: 12,
                color: '#ffffff',
                marginBottom: 16,
                boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 15 }}>
                {zoomState.title}
              </div>

              {/* CONTROLS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.min(prev + 0.25, 3))}
                  style={lightboxBtnStyle}
                  title="Phóng to"
                >
                  + Phóng to
                </button>

                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.max(prev - 0.25, 0.5))}
                  style={lightboxBtnStyle}
                  title="Thu nhỏ"
                >
                  - Thu nhỏ
                </button>

                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  style={lightboxBtnStyle}
                  title="Xoay ảnh"
                >
                  Xoay 90°
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setZoomScale(1)
                    setRotation(0)
                  }}
                  style={lightboxBtnStyle}
                  title="Đặt lại kích thước"
                >
                  Chuẩn ({Math.round(zoomScale * 100)}%)
                </button>

                <a
                  href={zoomState.src}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...lightboxBtnStyle,
                    textDecoration: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                  }}
                  title="Mở tab mới"
                >
                  Mở tab mới
                </a>

                <button
                  type="button"
                  onClick={closeZoom}
                  style={{
                    ...lightboxBtnStyle,
                    background: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 800,
                  }}
                >
                  Đóng (Esc)
                </button>
              </div>
            </div>

            {/* IMAGE CONTAINER */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '92vw',
                maxHeight: '80vh',
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                background: '#020617',
                padding: 12,
                boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
              }}
            >
              <img
                src={zoomState.src}
                alt={zoomState.title}
                style={{
                  maxWidth: '85vw',
                  maxHeight: '74vh',
                  objectFit: 'contain',
                  transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease',
                  borderRadius: 8,
                }}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

const lightboxBtnStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.15)',
  color: '#ffffff',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 6,
  fontSize: 12.5,
  fontWeight: 650,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontWeight: 700,
  color: '#334155',
  fontSize: 13,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  fontSize: 14,
  outline: 'none',
  color: '#0f172a',
}

export default Profile