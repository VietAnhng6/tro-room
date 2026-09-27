import { useEffect, useState } from 'react'

function Profile() {
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [citizenId, setCitizenId] = useState('')
  const [hometown, setHometown] = useState('')
  const [job, setJob] = useState('')

  const [idFront, setIdFront] = useState<File | null>(null)
  const [idBack, setIdBack] = useState<File | null>(null)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
  const loadProfile = async () => {
    const accessToken = localStorage.getItem('accessToken')

    if (!accessToken) return

    try {
      const response = await fetch('http://localhost:8080/api/profile', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) return

      const data = await response.json()

      if (data.dateOfBirth) {
        setDateOfBirth(data.dateOfBirth)
      }

      if (data.citizenId) {
        setCitizenId(data.citizenId)
      }

      if (data.hometown) {
        setHometown(data.hometown)
      }

      if (data.job) {
        setJob(data.job)
      }
    } catch (err) {
      console.error('Không thể tải hồ sơ:', err)
    }
  }

  loadProfile()
}, [])

  const validateFile = (file: File | null) => {
    if (!file) return true

    const allowedTypes = ['image/jpeg', 'image/png']

    if (!allowedTypes.includes(file.type)) {
      setError('Ảnh CCCD phải là JPG hoặc PNG')
      return false
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh CCCD không được vượt quá 5MB')
      return false
    }

    return true
  }

  const handleSave = async () => {
    setMessage('')
    setError('')

    if (!/^\d{9}$|^\d{12}$/.test(citizenId)) {
      setError('CCCD phải gồm 9 hoặc 12 chữ số')
      return
    }

    if (!validateFile(idFront) || !validateFile(idBack)) {
      return
    }

    const accessToken = localStorage.getItem('accessToken')

    if (!accessToken) {
      setError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.')
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

      const response = await fetch('http://localhost:8080/api/profile', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Không thể lưu hồ sơ')
      }

      setMessage('Thông tin hồ sơ đã được lưu thành công!')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Có lỗi xảy ra khi lưu hồ sơ'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>TR</div>

        <h1 style={styles.title}>Hồ sơ cá nhân</h1>
        <p style={styles.subtitle}>
          Cập nhật thông tin cá nhân và CCCD
        </p>

        {message && <div style={styles.success}>{message}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.form}>
          <label style={styles.label}>Ngày sinh</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Số CCCD</label>
          <input
            type="text"
            value={citizenId}
            onChange={(e) =>
              setCitizenId(e.target.value.replace(/\D/g, ''))
            }
            placeholder="Nhập 9 hoặc 12 chữ số"
            maxLength={12}
            style={styles.input}
          />

          <label style={styles.label}>Quê quán</label>
          <input
            type="text"
            value={hometown}
            onChange={(e) => setHometown(e.target.value)}
            placeholder="Nhập quê quán"
            style={styles.input}
          />

          <label style={styles.label}>Nghề nghiệp</label>
          <input
            type="text"
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="Nhập nghề nghiệp"
            style={styles.input}
          />

          <label style={styles.label}>CCCD mặt trước</label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) =>
              setIdFront(e.target.files?.[0] || null)
            }
            style={styles.fileInput}
          />

          {idFront && (
            <div style={styles.fileName}>
              📄 {idFront.name}
            </div>
          )}

          <label style={styles.label}>CCCD mặt sau</label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) =>
              setIdBack(e.target.files?.[0] || null)
            }
            style={styles.fileInput}
          />

          {idBack && (
            <div style={styles.fileName}>
              📄 {idBack.name}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Đang lưu...' : 'Lưu thông tin'}
          </button>
        </div>

        <button
          onClick={() => (window.location.href = '/dashboard')}
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
    background: 'linear-gradient(135deg, #eef2ff, #f8fafc)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '30px',
  },

  card: {
    width: '100%',
    maxWidth: '560px',
    background: '#ffffff',
    borderRadius: '20px',
    padding: '35px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
  },

  logo: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#ffffff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 800,
    fontSize: '20px',
    marginBottom: '18px',
  },

  title: {
    margin: 0,
    fontSize: '28px',
    color: '#111827',
  },

  subtitle: {
    color: '#6b7280',
    marginBottom: '25px',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  label: {
    fontWeight: 600,
    color: '#374151',
    marginTop: '8px',
  },

  input: {
    padding: '12px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
  },

  fileInput: {
    padding: '10px',
    border: '1px dashed #9ca3af',
    borderRadius: '10px',
    background: '#f9fafb',
  },

  fileName: {
    fontSize: '13px',
    color: '#4b5563',
  },

  button: {
    marginTop: '20px',
    padding: '13px',
    border: 'none',
    borderRadius: '10px',
    background: '#4f46e5',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
  },

  backButton: {
    width: '100%',
    marginTop: '12px',
    padding: '11px',
    border: 'none',
    background: 'transparent',
    color: '#4f46e5',
    cursor: 'pointer',
  },

  success: {
    background: '#ecfdf5',
    color: '#047857',
    padding: '12px',
    borderRadius: '10px',
    marginBottom: '15px',
  },

  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '10px',
    marginBottom: '15px',
  },
}

export default Profile