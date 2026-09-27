import { useEffect, useState } from 'react'

type ProfileData = {
  dateOfBirth?: string
  citizenId?: string
  hometown?: string
  job?: string
  idFrontUrl?: string
  idBackUrl?: string
}

function Profile() {
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [citizenId, setCitizenId] = useState('')
  const [existingCitizenId, setExistingCitizenId] = useState('')
  const [hometown, setHometown] = useState('')
  const [job, setJob] = useState('')

  const [idFront, setIdFront] = useState<File | null>(null)
  const [idBack, setIdBack] = useState<File | null>(null)

  const [idFrontUrl, setIdFrontUrl] = useState('')
  const [idBackUrl, setIdBackUrl] = useState('')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)

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

        /*
         * Backend có thể trả CCCD đã được mask.
         * Không đưa CCCD mask vào input chỉnh sửa.
         */
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

  const validateFile = (file: File | null) => {
    if (!file) {
      return true
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Ảnh CCCD phải là JPG hoặc PNG.')
      return false
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh CCCD không được vượt quá 5MB.')
      return false
    }

    return true
  }

  const handleFrontFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setError('')
    setMessage('')

    const file = event.target.files?.[0] || null

    if (!file) {
      setIdFront(null)
      return
    }

    if (!validateFile(file)) {
      event.target.value = ''
      setIdFront(null)
      return
    }

    setIdFront(file)
  }

  const handleBackFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setError('')
    setMessage('')

    const file = event.target.files?.[0] || null

    if (!file) {
      setIdBack(null)
      return
    }

    if (!validateFile(file)) {
      event.target.value = ''
      setIdBack(null)
      return
    }

    setIdBack(file)
  }

  const handleSave = async () => {
    setMessage('')
    setError('')

    /*
     * CCCD phải là số thật.
     * CCCD đã mask từ backend không được coi là giá trị hợp lệ.
     */
    if (!/^\d{9}$|^\d{12}$/.test(citizenId)) {
      setError(
        existingCitizenId
          ? 'CCCD hiện tại đang được ẩn. Nếu muốn cập nhật CCCD, hãy nhập lại đủ 9 hoặc 12 chữ số.'
          : 'CCCD phải gồm 9 hoặc 12 chữ số.'
      )
      return
    }

    /*
     * Không cho chọn ngày sinh trong tương lai.
     */
    if (dateOfBirth) {
      const today = new Date()
      const selectedDate = new Date(`${dateOfBirth}T00:00:00`)

      if (selectedDate > today) {
        setError('Ngày sinh không được lớn hơn ngày hiện tại.')
        return
      }
    }

    if (!validateFile(idFront)) {
      return
    }

    if (!validateFile(idBack)) {
      return
    }

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

    if (idFront) {
      formData.append('idFront', idFront)
    }

    if (idBack) {
      formData.append('idBack', idBack)
    }

    try {
      setLoading(true)

      const response = await fetch(
        'http://localhost:8080/api/profile',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      )

      const text = await response.text()

      let data: { message?: string } = {}

      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        // Response không phải JSON
      }

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
        throw new Error(
          data.message ||
          text ||
          'Không thể lưu hồ sơ.'
        )
      }

      setExistingCitizenId(citizenId)

      setIdFront(null)
      setIdBack(null)

      setMessage(
        'Thông tin hồ sơ đã được lưu thành công.'
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Có lỗi xảy ra khi lưu hồ sơ.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (loadingProfile) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          Đang tải hồ sơ...
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* HEADER */}
        <div style={styles.topRow}>
          <div>
            <div style={styles.logo}>TR</div>

            <h1 style={styles.title}>
              Hồ sơ cá nhân
            </h1>

            <p style={styles.subtitle}>
              Cập nhật thông tin cá nhân và CCCD
            </p>
          </div>

          <button
            onClick={() => {
              window.location.href = '/dashboard'
            }}
            style={styles.backTop}
          >
            ← Dashboard
          </button>
        </div>

        {/* MESSAGE */}
        {message && (
          <div style={styles.success}>
            ✓ {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {/* THÔNG TIN CÁ NHÂN */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            Thông tin cá nhân
          </h2>

          <label style={styles.label}>
            Ngày sinh
          </label>

          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => {
              setDateOfBirth(e.target.value)
              setError('')
              setMessage('')
            }}
            style={styles.input}
          />

          <label style={styles.label}>
            CCCD
          </label>

          {existingCitizenId && (
            <div style={styles.maskedBox}>
              <span>
                CCCD hiện tại
              </span>

              <strong>
                {existingCitizenId}
              </strong>
            </div>
          )}

          <input
            type="text"
            inputMode="numeric"
            value={citizenId}
            onChange={(e) => {
              setCitizenId(
                e.target.value.replace(/\D/g, '')
              )

              setError('')
              setMessage('')
            }}
            placeholder={
              existingCitizenId
                ? 'Nhập lại CCCD nếu muốn cập nhật'
                : 'Nhập 9 hoặc 12 chữ số'
            }
            maxLength={12}
            style={styles.input}
          />

          <p style={styles.hint}>
            CCCD phải gồm 9 hoặc 12 chữ số.
          </p>

          <label style={styles.label}>
            Quê quán
          </label>

          <input
            type="text"
            value={hometown}
            onChange={(e) => {
              setHometown(e.target.value)
              setError('')
              setMessage('')
            }}
            placeholder="Nhập quê quán"
            style={styles.input}
          />

          <label style={styles.label}>
            Nghề nghiệp
          </label>

          <input
            type="text"
            value={job}
            onChange={(e) => {
              setJob(e.target.value)
              setError('')
              setMessage('')
            }}
            placeholder="Nhập nghề nghiệp"
            style={styles.input}
          />
        </div>

        {/* CCCD */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            Giấy tờ CCCD
          </h2>

          <p style={styles.hint}>
            JPG/PNG, tối đa 5MB mỗi ảnh.
            Hệ thống sẽ tự resize chiều rộng tối đa 1600px.
          </p>

          {/* MẶT TRƯỚC */}
          <label style={styles.label}>
            CCCD mặt trước
          </label>

          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFrontFileChange}
            style={styles.fileInput}
          />

          {idFront && (
            <div style={styles.fileName}>
              📄 {idFront.name}
            </div>
          )}

          {idFrontUrl && !idFront && (
            <div style={styles.currentFile}>
              ✓ Đã có ảnh CCCD mặt trước
            </div>
          )}

          {/* MẶT SAU */}
          <label style={styles.label}>
            CCCD mặt sau
          </label>

          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleBackFileChange}
            style={styles.fileInput}
          />

          {idBack && (
            <div style={styles.fileName}>
              📄 {idBack.name}
            </div>
          )}

          {idBackUrl && !idBack && (
            <div style={styles.currentFile}>
              ✓ Đã có ảnh CCCD mặt sau
            </div>
          )}
        </div>

        {/* SAVE */}
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading
              ? 'not-allowed'
              : 'pointer',
          }}
        >
          {loading
            ? 'Đang lưu...'
            : 'Lưu thông tin'}
        </button>

        <button
          onClick={() => {
            window.location.href = '/dashboard'
          }}
          style={styles.backButton}
        >
          ← Quay lại Dashboard
        </button>

      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #eff6ff, #f8fafc, #eef2ff)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '40px 20px',
    boxSizing: 'border-box',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },

  loadingCard: {
    marginTop: 80,
    padding: 30,
    background: '#fff',
    borderRadius: 16,
    boxShadow:
      '0 15px 40px rgba(15,23,42,.08)',
    color: '#64748b',
  },

  card: {
    width: '100%',
    maxWidth: 720,
    background: '#fff',
    borderRadius: 22,
    padding: 34,
    boxShadow:
      '0 20px 60px rgba(15,23,42,.10)',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box',
  },

  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    marginBottom: 24,
  },

  logo: {
    width: 50,
    height: 50,
    borderRadius: 14,
    background:
      'linear-gradient(135deg,#2563eb,#4f46e5)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 19,
    marginBottom: 14,
  },

  title: {
    margin: 0,
    fontSize: 28,
    color: '#0f172a',
  },

  subtitle: {
    margin: '7px 0 0',
    color: '#64748b',
    fontSize: 14,
  },

  backTop: {
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#475569',
    borderRadius: 9,
    padding: '9px 13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  section: {
    padding: 22,
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    marginBottom: 18,
    background: '#fbfdff',
  },

  sectionTitle: {
    margin: '0 0 16px',
    fontSize: 17,
    color: '#172033',
  },

  label: {
    display: 'block',
    margin: '13px 0 7px',
    fontWeight: 650,
    color: '#334155',
    fontSize: 13,
  },

  input: {
    width: '100%',
    height: 46,
    padding: '0 13px',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },

  maskedBox: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    padding: '11px 13px',
    marginBottom: 8,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    color: '#64748b',
    fontSize: 13,
  },

  hint: {
    margin: '6px 0 0',
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 1.5,
  },

  fileInput: {
    width: '100%',
    padding: 10,
    border: '1px dashed #94a3b8',
    borderRadius: 10,
    background: '#f8fafc',
    boxSizing: 'border-box',
  },

  fileName: {
    marginTop: 7,
    color: '#475569',
    fontSize: 12,
  },

  currentFile: {
    marginTop: 7,
    color: '#047857',
    fontSize: 12,
  },

  button: {
    width: '100%',
    marginTop: 5,
    padding: 14,
    border: 0,
    borderRadius: 11,
    background:
      'linear-gradient(135deg,#2563eb,#4f46e5)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    boxShadow:
      '0 8px 20px rgba(37,99,235,.20)',
  },

  backButton: {
    width: '100%',
    marginTop: 10,
    padding: 11,
    border: 0,
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
  },

  success: {
    background: '#ecfdf5',
    color: '#047857',
    border: '1px solid #a7f3d0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 13,
  },

  error: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 13,
  },
}

export default Profile