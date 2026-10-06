import { useEffect, useState } from 'react'

type Building = {
  id: number
  name: string
  address: string
  floors: number
  managerId?: number | null
  managerName?: string | null
  note?: string | null
  active: boolean
  roomCount?: number
  vacantCount?: number
}

type BuildingForm = {
  name: string
  address: string
  floors: string
  managerId: string
  note: string
}

function Buildings() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [form, setForm] = useState<BuildingForm>({
    name: '',
    address: '',
    floors: '',
    managerId: '',
    note: '',
  })

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    loadBuildings()
  }, [])

  const loadBuildings = async () => {
    const accessToken = localStorage.getItem('accessToken')

    if (!accessToken) {
      window.location.href = '/'
      return
    }

    try {
      setLoading(true)
      setError('')

      const url =
        search.trim()
          ? `http://localhost:8080/api/buildings?search=${encodeURIComponent(search.trim())}`
          : 'http://localhost:8080/api/buildings'

      const response = await fetch(url, {
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
        setError('Bạn không có quyền quản lý tòa nhà.')
        return
      }

      if (!response.ok) {
        throw new Error('Không thể tải danh sách tòa nhà.')
      }

      const data = await response.json()

      setBuildings(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách tòa nhà.'
      )
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      name: '',
      address: '',
      floors: '',
      managerId: '',
      note: '',
    })

    setEditingId(null)
    setShowForm(false)
  }

  const startCreate = () => {
    setMessage('')
    setError('')

    setForm({
      name: '',
      address: '',
      floors: '',
      managerId: '',
      note: '',
    })

    setEditingId(null)
    setShowForm(true)
  }

  const startEdit = (building: Building) => {
    setMessage('')
    setError('')

    setForm({
      name: building.name || '',
      address: building.address || '',
      floors: String(building.floors || ''),
      managerId:
        building.managerId !== null &&
        building.managerId !== undefined
          ? String(building.managerId)
          : '',
      note: building.note || '',
    })

    setEditingId(building.id)
    setShowForm(true)
  }

  const validateForm = () => {
    const name = form.name.trim()
    const address = form.address.trim()
    const floors = Number(form.floors)

    if (!name) {
      setError('Vui lòng nhập tên tòa nhà.')
      return false
    }

    if (!address) {
      setError('Vui lòng nhập địa chỉ.')
      return false
    }

    if (!form.floors || !Number.isInteger(floors) || floors <= 0) {
      setError('Số tầng phải là số nguyên lớn hơn 0.')
      return false
    }

    if (form.managerId.trim()) {
      const managerId = Number(form.managerId)

      if (!Number.isInteger(managerId) || managerId <= 0) {
        setError('Manager ID phải là số nguyên dương.')
        return false
      }
    }

    return true
  }

  const handleSave = async () => {
    setMessage('')
    setError('')

    if (!validateForm()) {
      return
    }

    const accessToken = localStorage.getItem('accessToken')

    if (!accessToken) {
      window.location.href = '/'
      return
    }

    const body = {
      name: form.name.trim(),
      address: form.address.trim(),
      floors: Number(form.floors),
      managerId: form.managerId.trim()
        ? Number(form.managerId)
        : null,
      note: form.note.trim() || null,
    }

    try {
      setSaving(true)

      const url = editingId
        ? `http://localhost:8080/api/buildings/${editingId}`
        : 'http://localhost:8080/api/buildings'

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const text = await response.text()

      let data: { message?: string } = {}

      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        // response không phải JSON
      }

      if (response.status === 401) {
        localStorage.clear()
        window.location.href = '/'
        return
      }

      if (response.status === 403) {
        setError('Bạn không có quyền thực hiện thao tác này.')
        return
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          text ||
          'Không thể lưu tòa nhà.'
        )
      }

      setMessage(
        editingId
          ? 'Cập nhật tòa nhà thành công.'
          : 'Tạo tòa nhà thành công.'
      )

      resetForm()
      await loadBuildings()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Có lỗi xảy ra.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (building: Building) => {
    if (!window.confirm(
      `Bạn có chắc muốn ngừng hoạt động "${building.name}"?`
    )) {
      return
    }

    const accessToken = localStorage.getItem('accessToken')

    if (!accessToken) {
      window.location.href = '/'
      return
    }

    try {
      setMessage('')
      setError('')

      const response = await fetch(
        `http://localhost:8080/api/buildings/${building.id}/deactivate`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      const text = await response.text()

      let data: { message?: string } = {}

      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        // response không phải JSON
      }

      if (response.status === 401) {
        localStorage.clear()
        window.location.href = '/'
        return
      }

      if (response.status === 403) {
        setError('Bạn không có quyền ngừng hoạt động tòa nhà.')
        return
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          text ||
          'Không thể ngừng hoạt động tòa nhà.'
        )
      }

      setMessage('Đã ngừng hoạt động tòa nhà.')

      await loadBuildings()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Có lỗi xảy ra.'
      )
    }
  }
  const handleActivate = async (building: Building) => {
  if (!window.confirm(
    `Bạn có chắc muốn hoạt động lại "${building.name}"?`
  )) {
    return
  }

  const accessToken = localStorage.getItem('accessToken')

  if (!accessToken) {
    window.location.href = '/'
    return
  }

  try {
    setMessage('')
    setError('')

    const response = await fetch(
      `http://localhost:8080/api/buildings/${building.id}/activate`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const text = await response.text()

    let data: { message?: string } = {}

    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      // response không phải JSON
    }

    if (response.status === 401) {
      localStorage.clear()
      window.location.href = '/'
      return
    }

    if (response.status === 403) {
      setError('Bạn không có quyền hoạt động lại tòa nhà.')
      return
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
        text ||
        'Không thể hoạt động lại tòa nhà.'
      )
    }

    setMessage('Đã hoạt động lại tòa nhà.')

    await loadBuildings()
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Có lỗi xảy ra.'
    )
  }
}
  const handleSearch = async () => {
    await loadBuildings()
  }

  const activeCount = buildings.filter(
    building => building.active
  ).length

  const totalRooms = buildings.reduce(
    (sum, building) =>
      sum + (building.roomCount || 0),
    0
  )

  const vacantRooms = buildings.reduce(
    (sum, building) =>
      sum + (building.vacantCount || 0),
    0
  )

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          Đang tải danh sách tòa nhà...
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <div style={styles.logo}>TR</div>

            <h1 style={styles.title}>
              Quản lý tòa nhà
            </h1>

            <p style={styles.subtitle}>
              Quản lý thông tin, số tầng và trạng thái
              các tòa nhà.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => {
                window.location.href = '/search-rooms'
              }}
              style={{
                ...styles.backButton,
                background: '#eff6ff',
                color: '#1d4ed8',
                borderColor: '#bfdbfe',
                fontWeight: 700,
              }}
            >
              🔍 Tìm phòng trọ
            </button>

            <button
              onClick={() => {
                window.location.href = '/dashboard'
              }}
              style={styles.backButton}
            >
              ← Dashboard
            </button>
          </div>
        </div>

        {/* MESSAGE */}
        {message && (
          <div style={styles.success}>
            {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {/* STATISTICS */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>
              Tổng tòa nhà
            </span>
            <strong style={styles.statValue}>
              {buildings.length}
            </strong>
          </div>

          <div style={styles.statCard}>
            <span style={styles.statLabel}>
              Đang hoạt động
            </span>
            <strong style={styles.statValue}>
              {activeCount}
            </strong>
          </div>

          <div style={styles.statCard}>
            <span style={styles.statLabel}>
              Tổng phòng
            </span>
            <strong style={styles.statValue}>
              {totalRooms}
            </strong>
          </div>

          <div style={styles.statCard}>
            <span style={styles.statLabel}>
              Phòng trống
            </span>
            <strong style={styles.statValue}>
              {vacantRooms}
            </strong>
          </div>
        </div>

        {/* TOOLBAR */}
        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              placeholder="Tìm theo tên hoặc địa chỉ..."
              style={styles.searchInput}
            />

            <button
              onClick={handleSearch}
              style={styles.searchButton}
            >
              Tìm kiếm
            </button>
          </div>

          <button
            onClick={startCreate}
            style={styles.addButton}
          >
            + Thêm tòa nhà
          </button>
        </div>

        {/* FORM */}
        {showForm && (
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <div>
                <h2 style={styles.formTitle}>
                  {editingId
                    ? 'Chỉnh sửa tòa nhà'
                    : 'Thêm tòa nhà'}
                </h2>

                <p style={styles.formSubtitle}>
                  Nhập thông tin tòa nhà
                </p>
              </div>

              <button
                onClick={resetForm}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <div style={styles.formGrid}>

              <div>
                <label style={styles.label}>
                  Tên tòa nhà *
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={e =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="Ví dụ: Tòa A"
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>
                  Số tầng *
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.floors}
                  onChange={e =>
                    setForm({
                      ...form,
                      floors: e.target.value,
                    })
                  }
                  placeholder="Ví dụ: 5"
                  style={styles.input}
                />
              </div>

              <div style={styles.fullWidth}>
                <label style={styles.label}>
                  Địa chỉ *
                </label>

                <input
                  type="text"
                  value={form.address}
                  onChange={e =>
                    setForm({
                      ...form,
                      address: e.target.value,
                    })
                  }
                  placeholder="Nhập địa chỉ tòa nhà"
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>
                  Manager ID
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.managerId}
                  onChange={e =>
                    setForm({
                      ...form,
                      managerId: e.target.value,
                    })
                  }
                  placeholder="Để trống nếu chưa gán"
                  style={styles.input}
                />

                <p style={styles.hint}>
                  Có thể để trống. Nếu gán Manager,
                  nhập ID tài khoản Manager.
                </p>
              </div>

              <div>
                <label style={styles.label}>
                  Ghi chú
                </label>

                <input
                  type="text"
                  value={form.note}
                  onChange={e =>
                    setForm({
                      ...form,
                      note: e.target.value,
                    })
                  }
                  placeholder="Ghi chú"
                  style={styles.input}
                />
              </div>

            </div>

            <div style={styles.formActions}>
              <button
                onClick={resetForm}
                style={styles.cancelButton}
              >
                Hủy
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...styles.saveButton,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving
                  ? 'Đang lưu...'
                  : editingId
                    ? 'Lưu thay đổi'
                    : 'Tạo tòa nhà'}
              </button>
            </div>
          </div>
        )}

        {/* BUILDING LIST */}
        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <h2 style={styles.listTitle}>
              Danh sách tòa nhà
            </h2>

            <span style={styles.countBadge}>
              {buildings.length} tòa nhà
            </span>
          </div>

          {buildings.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                
              </div>

              <strong>
                Chưa có tòa nhà
              </strong>

              <p>
                Hãy thêm tòa nhà đầu tiên để bắt đầu
                quản lý.
              </p>

              <button
                onClick={startCreate}
                style={styles.addButton}
              >
                + Thêm tòa nhà
              </button>
            </div>
          ) : (
            <div style={styles.buildingList}>
              {buildings.map(building => (
                <div
                  key={building.id}
                  style={styles.buildingCard}
                >
                  <div style={styles.buildingMain}>

                    <div style={styles.buildingIcon}>
                      
                    </div>

                    <div style={styles.buildingInfo}>
                      <div style={styles.nameRow}>
                        <h3 style={styles.buildingName}>
                          {building.name}
                        </h3>

                        <span
                          style={{
                            ...styles.statusBadge,
                            ...(building.active
                              ? styles.activeBadge
                              : styles.inactiveBadge),
                          }}
                        >
                          {building.active
                            ? 'Đang hoạt động'
                            : 'Đã ngừng'}
                        </span>
                      </div>

                      <p style={styles.address}>
                        {building.address}
                      </p>

                      <div style={styles.metaRow}>
                        <span>
                          {building.floors} tầng
                        </span>

                        <span>
                          {building.roomCount || 0} phòng
                        </span>

                        <span>
                          {building.vacantCount || 0} phòng trống
                        </span>
                      </div>
                        {(building.roomCount || 0) === 0 && (
                        <div style={styles.noRoom}>
                         Chưa có phòng nào
                          </div>
                        )}    
                        
                      {building.managerName && (
                        <div style={styles.manager}>
                           Manager:{' '}
                          <strong>
                            {building.managerName}
                          </strong>
                        </div>
                      )}

                      {building.note && (
                        <div style={styles.note}>
                          {building.note}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={styles.actions}>
                    <button
                      onClick={() =>
                        startEdit(building)
                      }
                      style={styles.editButton}
                    >
                      Sửa
                    </button>

                    <button
                      onClick={() => {
                        window.location.href =
                          '/building-services/' +
                          building.id +
                          '?name=' +
                          encodeURIComponent(building.name)
                      }}
                      style={styles.serviceButton}
                    >
                      Điện nước
                    </button>

                    <button
  onClick={() => {
    if (building.active) {
      handleDeactivate(building)
    } else {
      handleActivate(building)
    }
  }}
  style={
    building.active
      ? styles.deactivateButton
      : styles.activateButton
  }
>
  {building.active ? 'Ngừng hoạt động' : 'Hoạt động lại'}
</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #eff6ff, #f8fafc, #eef2ff)',
    padding: '36px 20px 60px',
    boxSizing: 'border-box',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },
  activateButton: {
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  color: '#16a34a',
  borderRadius: 8,
  padding: '8px 13px',
  cursor: 'pointer',
  fontWeight: 650,
  whiteSpace: 'nowrap',
},
  container: {
    width: '100%',
    maxWidth: 1180,
    margin: '0 auto',
  },

  loadingCard: {
    width: 'fit-content',
    margin: '100px auto',
    padding: 30,
    background: '#fff',
    borderRadius: 16,
    color: '#64748b',
    boxShadow:
      '0 20px 50px rgba(15,23,42,.08)',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    marginBottom: 24,
  },

  logo: {
    width: 52,
    height: 52,
    borderRadius: 15,
    background:
      'linear-gradient(135deg,#2563eb,#4f46e5)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 19,
    marginBottom: 13,
  },

  title: {
    margin: 0,
    fontSize: 30,
    color: '#0f172a',
  },

  subtitle: {
    margin: '7px 0 0',
    color: '#64748b',
    fontSize: 14,
  },

  backButton: {
    border: '1px solid #dbe2ea',
    background: '#fff',
    color: '#475569',
    borderRadius: 10,
    padding: '10px 15px',
    cursor: 'pointer',
    fontWeight: 600,
  },

  success: {
    background: '#ecfdf5',
    color: '#047857',
    border: '1px solid #a7f3d0',
    padding: 13,
    borderRadius: 11,
    marginBottom: 18,
    fontSize: 13,
  },

  error: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    padding: 13,
    borderRadius: 11,
    marginBottom: 18,
    fontSize: 13,
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 14,
    marginBottom: 18,
  },

  statCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 15,
    padding: 20,
    boxShadow:
      '0 8px 25px rgba(15,23,42,.05)',
  },

  statLabel: {
    display: 'block',
    color: '#64748b',
    fontSize: 12,
    marginBottom: 8,
  },

  statValue: {
    fontSize: 27,
    color: '#0f172a',
  },

  toolbar: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 15,
    padding: 15,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },

  searchBox: {
    display: 'flex',
    gap: 8,
    flex: 1,
  },

searchInput: {
    flex: 1,
    height: 44,
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    padding: '0 13px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#ffffff', // Màu nền trắng sáng
    color: '#0f172a',      // Màu chữ tối rõ nét
  },

  searchButton: {
    border: 0,
    background: '#e2e8f0',
    color: '#334155',
    borderRadius: 9,
    padding: '0 17px',
    cursor: 'pointer',
    fontWeight: 600,
  },

  addButton: {
    border: 0,
    background:
      'linear-gradient(135deg,#2563eb,#4f46e5)',
    color: '#fff',
    borderRadius: 9,
    padding: '0 18px',
    cursor: 'pointer',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },

  formCard: {
    background: '#fff',
    border: '1px solid #bfdbfe',
    borderRadius: 17,
    padding: 24,
    marginBottom: 18,
    boxShadow:
      '0 10px 35px rgba(37,99,235,.08)',
  },

  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  formTitle: {
    margin: 0,
    fontSize: 19,
    color: '#0f172a',
  },

  formSubtitle: {
    margin: '5px 0 0',
    color: '#64748b',
    fontSize: 13,
  },

  closeButton: {
    border: 0,
    background: '#f1f5f9',
    color: '#475569',
    borderRadius: 8,
    width: 34,
    height: 34,
    cursor: 'pointer',
  },

  formGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(2, minmax(0, 1fr))',
    gap: 15,
  },

  fullWidth: {
    gridColumn: '1 / -1',
  },

  label: {
    display: 'block',
    marginBottom: 7,
    color: '#334155',
    fontWeight: 650,
    fontSize: 13,
  },

input: {
    width: '100%',
    height: 44,
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    padding: '0 12px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#ffffff', // Thêm nền trắng
    color: '#0f172a',      // Thêm màu chữ tối rõ nét
  },

  hint: {
    margin: '6px 0 0',
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 1.5,
  },

  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 9,
    marginTop: 22,
  },

  cancelButton: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#475569',
    borderRadius: 9,
    padding: '10px 17px',
    cursor: 'pointer',
    fontWeight: 600,
  },

  saveButton: {
    border: 0,
    background:
      'linear-gradient(135deg,#2563eb,#4f46e5)',
    color: '#fff',
    borderRadius: 9,
    padding: '10px 20px',
    cursor: 'pointer',
    fontWeight: 700,
  },

  listCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 17,
    padding: 22,
  },

  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  listTitle: {
    margin: 0,
    fontSize: 19,
    color: '#0f172a',
  },

  countBadge: {
    background: '#eff6ff',
    color: '#2563eb',
    borderRadius: 999,
    padding: '6px 11px',
    fontSize: 12,
    fontWeight: 700,
  },

  buildingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },

  buildingCard: {
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 18,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 20,
  },

  buildingMain: {
    display: 'flex',
    gap: 15,
    minWidth: 0,
  },

  buildingIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 23,
    flexShrink: 0,
  },

  buildingInfo: {
    minWidth: 0,
  },

  nameRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 9,
  },

  buildingName: {
    margin: 0,
    fontSize: 17,
    color: '#0f172a',
  },

  statusBadge: {
    borderRadius: 999,
    padding: '4px 9px',
    fontSize: 10,
    fontWeight: 700,
  },

  activeBadge: {
    background: '#ecfdf5',
    color: '#047857',
  },

  inactiveBadge: {
    background: '#f1f5f9',
    color: '#64748b',
  },

  address: {
    margin: '7px 0',
    color: '#64748b',
    fontSize: 13,
  },

  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 14,
    color: '#475569',
    fontSize: 12,
  },

  manager: {
    marginTop: 8,
    color: '#475569',
    fontSize: 12,
  },

  note: {
    marginTop: 7,
    color: '#64748b',
    fontSize: 12,
  },
  noRoom: {
  marginTop: 8,
  color: '#94a3b8',
  fontSize: 12,
  fontStyle: 'italic',
  },

  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    justifyContent: 'center',
    flexShrink: 0,
  },
  addRoomButton: {
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#2563eb',
  borderRadius: 8,
  padding: '8px 13px',
  cursor: 'pointer',
  fontWeight: 650,
  whiteSpace: 'nowrap',
  },
  editButton: {
    border: '1px solid #bfdbfe',
    background: '#eff6ff',
    color: '#2563eb',
    borderRadius: 8,
    padding: '8px 13px',
    cursor: 'pointer',
    fontWeight: 650,
  },

  serviceButton: {
    border: '1px solid #fcd34d',
    background: '#fffbeb',
    color: '#b45309',
    borderRadius: 8,
    padding: '8px 13px',
    cursor: 'pointer',
    fontWeight: 650,
    whiteSpace: 'nowrap',
  },

  deactivateButton: {
    border: '1px solid #fecaca',
    background: '#fff',
    color: '#dc2626',
    borderRadius: 8,
    padding: '8px 13px',
    cursor: 'pointer',
    fontWeight: 650,
    whiteSpace: 'nowrap',
  },

  empty: {
    textAlign: 'center',
    padding: '55px 20px',
    color: '#64748b',
  },

  emptyIcon: {
    fontSize: 45,
    marginBottom: 12,
  },
}

export default Buildings