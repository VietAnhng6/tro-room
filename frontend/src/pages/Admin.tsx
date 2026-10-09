import { useEffect, useState } from 'react'

type User = {
  id: number
  name: string
  phone: string
  email: string
  role: 'ADMIN' | 'LANDLORD' | 'MANAGER' | 'TENANT'
  active: boolean
  mustChangePassword: boolean
}

type UserPage = {
  content: User[]
  totalPages: number
  totalElements: number
  number: number
}

function Admin() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [roleFilter, setRoleFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [showCreate, setShowCreate] = useState(false)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'LANDLORD',
  })

  const token = localStorage.getItem('accessToken')

  const loadUsers = async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      params.append('page', String(page))

      if (roleFilter) {
        params.append('role', roleFilter)
      }

      if (activeFilter !== '') {
        params.append('active', activeFilter)
      }

      const res = await fetch(
        `http://localhost:8080/api/admin/users?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const data: UserPage = await res.json()

      setUsers(data.content)
      setTotalPages(data.totalPages)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách tài khoản'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [page, roleFilter, activeFilter])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    setMessage('')
    setError('')

    try {
      const res = await fetch(
        'http://localhost:8080/api/admin/users',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        }
      )

      const data = await res.text()

      if (!res.ok) {
        throw new Error(data)
      }

      setMessage(data)

      setForm({
        name: '',
        phone: '',
        email: '',
        role: 'LANDLORD',
      })

      setShowCreate(false)
      loadUsers()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tạo tài khoản'
      )
    }
  }

  const toggleUser = async (user: User) => {
    setMessage('')
    setError('')

    const endpoint = user.active
      ? `/api/admin/users/${user.id}/lock`
      : `/api/admin/users/${user.id}/unlock`

    try {
      const res = await fetch(
        `http://localhost:8080${endpoint}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await res.text()

      if (!res.ok) {
        throw new Error(data)
      }

      setMessage(data)
      loadUsers()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể thay đổi trạng thái tài khoản'
      )
    }
  }

  const roleName = (role: User['role']) => {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị viên'
      case 'LANDLORD':
        return 'Chủ nhà'
      case 'MANAGER':
        return 'Quản lý'
      case 'TENANT':
        return 'Người thuê'
      default:
        return role
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        padding: 32,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: 28,
              }}
            >
              Quản trị tài khoản
            </h1>

            <p
              style={{
                marginTop: 8,
                color: '#64748b',
              }}
            >
              Quản lý tài khoản người dùng trong hệ thống TroRoom
            </p>
          </div>

          <button
            onClick={() => setShowCreate(!showCreate)}
            style={{
              border: 0,
              borderRadius: 10,
              padding: '12px 18px',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Tạo tài khoản
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            style={{
              background: '#dcfce7',
              color: '#166534',
              padding: 14,
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: 14,
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <form
            onSubmit={handleCreate}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              padding: 24,
              marginBottom: 24,
              boxShadow: '0 8px 30px rgba(15,23,42,.06)',
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: '#0f172a',
              }}
            >
              Tạo tài khoản
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              <input
                placeholder="Họ và tên"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                required
                style={inputStyle}
              />

              <input
                placeholder="Số điện thoại"
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value,
                  })
                }
                required
                style={inputStyle}
              />

              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
                required
                style={inputStyle}
              />

              <select
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="LANDLORD">Chủ nhà</option>
                <option value="MANAGER">Quản lý</option>
                <option value="TENANT">Người thuê</option>
                <option value="ADMIN">Quản trị viên</option>
              </select>
            </div>

            <div style={{ marginTop: 18 }}>
              <button
                type="submit"
                style={primaryButton}
              >
                Tạo tài khoản
              </button>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                style={secondaryButton}
              >
                Hủy
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 18,
            marginBottom: 20,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <select
            value={roleFilter}
            onChange={(e) => {
              setPage(0)
              setRoleFilter(e.target.value)
            }}
            style={filterStyle}
          >
            <option value="">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên</option>
            <option value="LANDLORD">Chủ nhà</option>
            <option value="MANAGER">Quản lý</option>
            <option value="TENANT">Người thuê</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => {
              setPage(0)
              setActiveFilter(e.target.value)
            }}
            style={filterStyle}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã khóa</option>
          </select>
        </div>

        {/* Users table */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(15,23,42,.05)',
          }}
        >
          {loading ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              Đang tải danh sách...
            </div>
          ) : users.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              Không có tài khoản nào.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: '#f8fafc',
                    }}
                  >
                    <th style={thStyle}>STT</th>
                    <th style={thStyle}>Họ tên</th>
                    <th style={thStyle}>Số điện thoại</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Vai trò</th>
                    <th style={thStyle}>Trạng thái</th>
                    <th style={thStyle}>Mật khẩu</th>
                    <th style={thStyle}>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user, index) => (
                  <tr key={user.id}>
                  <td style={tdStyle}>{page * 20 + index + 1}</td>

                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 600,
                        }}
                      >
                        {user.name}
                      </td>

                      <td style={tdStyle}>{user.phone}</td>

                      <td style={tdStyle}>{user.email}</td>

                      <td style={tdStyle}>
                        {roleName(user.role)}
                      </td>

                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: '5px 9px',
                            borderRadius: 999,
                            background: user.active
                              ? '#dcfce7'
                              : '#fee2e2',
                            color: user.active
                              ? '#166534'
                              : '#991b1b',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {user.active
                            ? 'Đang hoạt động'
                            : 'Đã khóa'}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        {user.mustChangePassword
                          ? 'Cần đổi'
                          : 'Đã thiết lập'}
                      </td>

                      <td style={tdStyle}>
                        <button
                          onClick={() => toggleUser(user)}
                          style={{
                            border: 0,
                            borderRadius: 8,
                            padding: '8px 12px',
                            background: user.active
                              ? '#fee2e2'
                              : '#dcfce7',
                            color: user.active
                              ? '#991b1b'
                              : '#166534',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {user.active
                            ? 'Khóa'
                            : 'Mở khóa'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
              marginTop: 20,
            }}
          >
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              style={secondaryButton}
            >
              ← Trước
            </button>

            <span style={{ color: '#475569' }}>
              Trang {page + 1} / {totalPages}
            </span>

            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              style={secondaryButton}
            >
              Sau →
            </button>
          </div>
        )}

        <button
          onClick={() => {
            window.location.href = '/dashboard'
          }}
          style={{
            marginTop: 24,
            border: 0,
            background: 'transparent',
            color: '#2563eb',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← Về Dashboard
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #cbd5e1',
  borderRadius: 9,
  padding: '11px 12px',
  fontSize: 14,
  outline: 'none',
}

const filterStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 9,
  padding: '10px 12px',
  background: '#fff',
  color: '#334155',
}

const primaryButton: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  padding: '10px 16px',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  marginRight: 8,
}

const secondaryButton: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 9,
  padding: '10px 16px',
  background: '#fff',
  color: '#334155',
  fontWeight: 600,
  cursor: 'pointer',
}

const thStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '13px 14px',
  borderBottom: '1px solid #e2e8f0',
  color: '#475569',
  fontSize: 13,
  fontWeight: 750,
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '14px',
  borderBottom: '1px solid #f1f5f9',
  color: '#334155',
  fontSize: 14,
  verticalAlign: 'middle',
}

export default Admin