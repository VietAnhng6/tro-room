import React, { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import BannerCarousel from '../components/BannerCarousel'
import { showConfirm } from '../utils/notification'

type Role = 'ADMIN' | 'LANDLORD' | 'MANAGER' | 'TENANT' | string

function roleLabel(role: Role, hasToken: boolean) {
  if (!hasToken) return 'Khách vãng lai'
  const labels: Record<string, string> = {
    ADMIN: 'Quản trị viên',
    LANDLORD: 'Chủ nhà',
    MANAGER: 'Quản lý',
    TENANT: 'Khách thuê',
  }
  return labels[role] || role
}

// Bộ icon SVG (kiểu Lucide/Feather) cho sidebar
const ICONS: Record<string, React.ReactNode> = {
  home: (<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>),
  bell: (<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>),
  activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  search: (<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>),
  clipboard: (<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></>),
  building: (<><rect x="4" y="2" width="16" height="20" rx="1" /><path d="M9 22v-4h6v4" /></>),
  grid: (<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>),
  inbox: (<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>),
  sliders: (<><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>),
  file: (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>),
  chart: (<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>),
  card: (<><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>),
  tool: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  users: (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  dollar: (<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>),
  logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>),
  user: (<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  userCheck: (<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></>),
  mail: (<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>),
  chevronsLeft: (<><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></>),
  chevronsRight: (<><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></>),
}

const MENU_ICONS: Record<string, string> = {
  dashboard: 'home',
  notifications: 'bell',
  meterReadings: 'activity',
  searchRooms: 'search',
  myRequests: 'clipboard',
  building: 'building',
  room: 'grid',
  request: 'inbox',
  service: 'sliders',
  invoice: 'file',
  monthlyReport: 'chart',
  landlordPaymentReports: 'card',
  tenantInvoice: 'file',
  tenantPaymentReports: 'card',
  tenantContract: 'file',
  tenantMaintenanceReports: 'tool',
  managerMaintenanceReports: 'tool',
  tenant: 'users',
  contract: 'file',
  debt: 'dollar',
  checkout: 'logout',
  profile: 'user',
  audit: 'shield',
  admin: 'userCheck',
  emailDeliveryFailures: 'mail',
}

function MenuIcon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {ICONS[name] || ICONS.file}
    </svg>
  )
}

const PAGE_TITLES: Record<string, { title: string; category: string }> = {
  '/': { title: 'Tìm kiếm phòng trọ', category: 'Khám phá' },
  '/search-rooms': { title: 'Tìm kiếm phòng trọ', category: 'Khám phá' },
  '/dashboard': { title: 'Tổng quan', category: 'Hệ thống' },
  '/buildings': { title: 'Quản lý tòa nhà', category: 'Quản lý' },
  '/rooms': { title: 'Quản lý phòng', category: 'Quản lý' },
  '/services': { title: 'Dịch vụ tòa nhà', category: 'Cấu hình' },
  '/invoices': { title: 'Hoá đơn tháng', category: 'Tài chính' },
  '/monthly-report': { title: 'Báo cáo doanh thu & lấp đầy', category: 'Tài chính' },
  '/tenant/invoices': { title: 'Hóa đơn của tôi', category: 'Khách thuê' },
  '/tenant/payment-reports': {
    title: 'Báo cáo thanh toán',
    category: 'Khách thuê',
  },
  '/payment-reports': {
    title: 'Báo cáo thanh toán',
    category: 'Tài chính',
  },
  '/tenant/contracts': { title: 'Hợp đồng của tôi', category: 'Khách thuê' },
  '/tenant/maintenance-reports': { title: 'Báo hỏng & bảo trì', category: 'Khách thuê' },
  '/manager/maintenance-reports': { title: 'Quản lý báo hỏng', category: 'Quản lý' },
  '/landlord/requests': { title: 'Yêu cầu thuê & Xem phòng', category: 'Xử lý' },
  '/my-requests': { title: 'Yêu cầu thuê của tôi', category: 'Khách thuê' },
  '/tenants': { title: 'Danh sách người thuê', category: 'Quản lý' },
  '/contracts': { title: 'Quản lý hợp đồng', category: 'Quản lý' },
  '/debts': { title: 'Xem công nợ theo phòng và theo toà', category: 'Quản lý' },
  '/checkout': { title: 'Trả phòng & tất toán tiền cọc', category: 'Quản lý' },
  '/profile': { title: 'Hồ sơ cá nhân & CCCD', category: 'Tài khoản' },
  '/audit-logs': { title: 'Nhật ký hệ thống', category: 'Bảo mật' },
  '/admin': { title: 'Quản trị tài khoản', category: 'Hệ thống' },
  '/admin/email-delivery-failures': {
  title: 'Lịch sử email gửi thất bại',
  category: 'Bảo mật',
  },
  '/meter-readings': {
    title: 'Nhập chỉ số điện nước',
    category: 'Quản lý',
  },
  '/notifications': {
    title: 'Thông báo',
    category: 'Hệ thống',
  },
}

export const MainLayout: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const [hasToken, setHasToken] = useState(false)
  const [role, setRole] = useState<Role>('TENANT')
  const [username, setUsername] = useState('')
  const [pendingRequests, setPendingRequests] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Trên mobile, đóng menu khi chuyển trang
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [location.pathname, isMobile])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const r = localStorage.getItem('role') || 'TENANT'
    const u = localStorage.getItem('username') || ''
    setHasToken(Boolean(token))
    setRole(r)
    setUsername(u)

    // Load pending requests count for landlord
    if (token && r === 'LANDLORD') {
      fetch('/api/landlord/requests/pending-count', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.count === 'number') {
            setPendingRequests(data.count)
          }
        })
        .catch(() => {})
    }
  }, [location.pathname])

  const permissions = useMemo(() => {
    if (!hasToken) {
      return {
        dashboard: false,
        building: false,
        room: false,
        tenant: false,
        contract: false,
        service: false,
        invoice: false,
        monthlyReport: false,
        tenantInvoice: false,
        tenantContract: false,
        profile: false,
        audit: false,
        admin: false,
        landlordRequests: false,
        landlordPaymentReports: false,
        myRequests: false,
        searchRooms: true,
        meterReadings: false,
        debt: false,
        checkout: false,
      }
    }

    if (role === 'ADMIN') {
      return {
        dashboard: true,
        building: false,
        room: false,
        tenant: false,
        contract: false,
        service: false,
        invoice: false,
        monthlyReport: false,
        tenantInvoice: false,
        tenantContract: false,
        profile: true,
        audit: true,
        admin: true,
        landlordRequests: false,
        landlordPaymentReports: false,
        maintenanceReports: false,
        myRequests: false,
        searchRooms: true,
        meterReadings: false,
        debt: true,
        checkout: false,
      }
    }

    if (role === 'LANDLORD') {
      return {
        dashboard: true,
        building: true,
        room: true,
        tenant: false,
        contract: true,
        service: true,
        invoice: true,
        monthlyReport: true,
        tenantInvoice: false,
        tenantContract: false,
        profile: true,
        audit: false,
        admin: false,
        landlordRequests: true,
        landlordPaymentReports: true,
        maintenanceReports: false,
        myRequests: false,
        searchRooms: false,
        meterReadings: true,
        debt: true,
        checkout: true,
      }
    }

    if (role === 'MANAGER') {
      return {
        dashboard: true,
        building: true,
        room: true,
        tenant: false,
        contract: false,
        service: true,
        invoice: true,
        monthlyReport: true,
        tenantInvoice: false,
        tenantContract: false,
        profile: true,
        audit: false,
        admin: false,
        landlordRequests: true,
        landlordPaymentReports: false,
        maintenanceReports: true,
        myRequests: false,
        searchRooms: false,
        meterReadings: true,
        debt: true,
        checkout: false,
      }
    }

    // TENANT
    return {
      dashboard: true,
      building: false,
      room: false,
      tenant: false,
      contract: false,
      service: false,
      invoice: false,
      monthlyReport: false,
      tenantInvoice: true,
      tenantContract: true,
      profile: true,
      audit: false,
      admin: false,
      landlordRequests: false,
      landlordPaymentReports: false,
      maintenanceReports: false,
      myRequests: true,
      searchRooms: true,
      meterReadings: false,
      debt: false,
      checkout: false,
    }
  }, [role, hasToken])

  const menuItems = [
    {
      key: 'dashboard',
      title: 'Tổng quan',
      enabled: permissions.dashboard,
      path: '/dashboard',
    },
    {
      key: 'notifications',
      title: 'Thông báo',
      enabled: hasToken,
      path: '/notifications',
    },
    {
      key: 'meterReadings',
      title: 'Nhập chỉ số điện nước',
      enabled: permissions.meterReadings,
      path: '/meter-readings',
    },
    {
      key: 'searchRooms',
      title: 'Tìm phòng trọ',
      enabled: permissions.searchRooms,
      path: '/search-rooms',
    },
    {
      key: 'myRequests',
      title: 'Yêu cầu của tôi',
      enabled: permissions.myRequests,
      path: '/my-requests',
    },
    {
      key: 'building',
      title: 'Quản lý tòa nhà',
      enabled: permissions.building,
      path: '/buildings',
    },
    {
      key: 'room',
      title: 'Quản lý phòng',
      enabled: permissions.room,
      path: '/rooms',
    },
    {
      key: 'request',
      title: 'Yêu cầu thuê',
      enabled: permissions.landlordRequests,
      path: '/landlord/requests',
      badge: pendingRequests,
    },
    {
      key: 'service',
      title: 'Dịch vụ tòa nhà',
      enabled: permissions.service,
      path: '/services',
    },
    {
      key: 'invoice',
      title: 'Hoá đơn tháng',
      enabled: permissions.invoice,
      path: '/invoices',
    },
    {
      key: 'monthlyReport',
      title: 'Báo cáo doanh thu',
      enabled: permissions.monthlyReport,
      path: '/monthly-report',
    },
    {
      key: 'landlordPaymentReports',
      title: 'Báo cáo thanh toán',
      enabled: permissions.landlordPaymentReports,
      path: '/payment-reports',
    },
    {
      key: 'tenantInvoice',
      title: 'Hóa đơn của tôi',
      enabled: permissions.tenantInvoice,
      path: '/tenant/invoices',
    },
    {
      key: 'tenantPaymentReports',
      title: 'Báo cáo thanh toán',
      enabled: permissions.tenantInvoice,
      path: '/tenant/payment-reports',
    },
    {
      key: 'tenantContract',
      title: 'Hợp đồng của tôi',
      enabled: permissions.tenantContract,
      path: '/tenant/contracts',
    },
    {
      key: 'tenantMaintenanceReports',
      title: 'Báo hỏng & bảo trì',
      enabled: hasToken && role === 'TENANT',
      path: '/tenant/maintenance-reports',
    },
    {
    key: 'managerMaintenanceReports',
    title: 'Quản lý báo hỏng',
    enabled: permissions.maintenanceReports,
    path: '/manager/maintenance-reports',
  },
    {
      key: 'tenant',
      title: 'Người thuê',
      enabled: permissions.tenant,
      path: '/tenants',
    },
    {
      key: 'contract',
      title: 'Hợp đồng',
      enabled: permissions.contract,
      path: '/contracts',
    },
    {
      key: 'debt',
      title: 'Công nợ',
      enabled: permissions.debt,
      path: '/debts',
    },
    {
      key: 'checkout',
      title: 'Trả phòng',
      enabled: permissions.checkout,
      path: '/checkout',
    },
    {
      key: 'profile',
      title: 'Hồ sơ cá nhân',
      enabled: permissions.profile,
      path: '/profile',
    },
    {
      key: 'audit',
      title: 'Nhật ký hệ thống',
      enabled: permissions.audit,
      path: '/audit-logs',
    },
    {
      key: 'admin',
      title: 'Quản trị tài khoản',
      enabled: permissions.admin,
      path: '/admin',
    },
    {
      key: 'emailDeliveryFailures',
      title: 'Lịch sử email lỗi',
      enabled: permissions.admin,
      path: '/admin/email-delivery-failures',
    },
  ]

  const handleLogout = async () => {
    const confirmed = await showConfirm(
      'Đăng xuất?',
      'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
      'Đăng xuất',
    )
    if (!confirmed) return

    const token = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    if (token && refreshToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {})
    }

    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('role')
    localStorage.removeItem('username')

    setHasToken(false)
    navigate('/login')
  }

  const currentPath = location.pathname
  let pageMeta = PAGE_TITLES[currentPath]
  if (!pageMeta) {
    if (currentPath.startsWith('/listing/')) {
      pageMeta = { title: 'Chi tiết phòng trọ', category: 'Khám phá' }
    } else {
      pageMeta = { title: 'TroRoom', category: 'Quản lý' }
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#f8fafc',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a',
      }}
    >
      {/* ================= SIDEBAR (CỐ ĐỊNH BÊN TRÁI) ================= */}
      <aside
        style={{
          width: !isMobile && collapsed ? 64 : 250,
          height: '100vh',
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          boxSizing: 'border-box',
          zIndex: 30,
          transition: 'width 0.2s ease',
          ...(isMobile
            ? {
                position: 'fixed',
                left: 0,
                top: 0,
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.25s ease',
                boxShadow: sidebarOpen ? '0 0 24px rgba(0,0,0,0.18)' : 'none',
              }
            : {}),
        }}
      >
        {/* LOGO BRAND */}
        <div
          onClick={() => navigate(hasToken ? '/dashboard' : '/')}
          style={{
            height: 74,
            padding: !isMobile && collapsed ? '0' : '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: !isMobile && collapsed ? 'center' : 'flex-start',
            gap: 12,
            borderBottom: '1px solid #e2e8f0',
            boxSizing: 'border-box',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            TR
          </div>

          {!isMobile && collapsed ? null : (
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', letterSpacing: '-0.3px' }}>
                TroRoom
              </div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 1, fontWeight: 500 }}>
                Hệ thống quản lý
              </div>
            </div>
          )}
        </div>

        {/* MENU ITEMS */}
        <nav
          style={{
            flex: 1,
            padding: '16px 12px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 750,
              color: '#94a3b8',
              letterSpacing: '0.6px',
              margin: '0 12px 10px',
              textTransform: 'uppercase',
            }}
          >
            Chức năng
          </div>

          {menuItems
  .filter((item) => item.enabled)
  .map((item) => {
    const active =
      (item.path === '/search-rooms' &&
        (currentPath === '/' ||
          currentPath === '/search-rooms' ||
          currentPath.startsWith('/listing/'))) ||
      (item.path === '/dashboard' && currentPath === '/dashboard') ||
      (item.path === '/admin'
        ? currentPath === '/admin'
        : item.path !== '/dashboard' &&
          item.path !== '/search-rooms' &&
          (currentPath === item.path ||
            currentPath.startsWith(`${item.path}/`)))
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  style={{
                    width: '100%',
                    height: 42,
                    border: 'none',
                    borderRadius: 8,
                    padding: !isMobile && collapsed ? '0' : '0 14px',
                    marginBottom: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    justifyContent: !isMobile && collapsed ? 'center' : 'flex-start',
                    background: active ? '#eff6ff' : 'transparent',
                    color: active ? '#2563eb' : '#475569',
                    fontWeight: active ? 750 : 550,
                    fontSize: 13.5,
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = '#f1f5f9'
                      e.currentTarget.style.color = '#1e293b'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#475569'
                    }
                  }}
                >
                  <MenuIcon name={MENU_ICONS[item.key] || 'file'} />
                  {!isMobile && collapsed ? null : (
                    <>
                      <span
                        style={{
                          flex: 1,
                          marginLeft: 12,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textAlign: 'left',
                        }}
                      >
                        {item.title}
                      </span>
                      {item.badge && item.badge > 0 ? (
                        <span
                          style={{
                            minWidth: 18,
                            height: 18,
                            padding: '0 5px',
                            borderRadius: 9,
                            background: '#dc2626',
                            color: '#ffffff',
                            fontSize: 11,
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </>
                  )}
                </button>
              )
            })}
        </nav>

        {/* USER PROFILE & LOGOUT OR LOGIN BUTTONS */}
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            padding: !isMobile && collapsed ? '14px 8px' : '14px 14px',
            background: '#ffffff',
          }}
        >
          {hasToken ? (
            <>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '10px 12px',
                  marginBottom: 8,
                  display: !isMobile && collapsed ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ minWidth: 0, flex: 1, marginRight: 6 }}>
                  <div
                    style={{
                      color: '#1e293b',
                      fontSize: 13,
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {username || 'Tài khoản'}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>
                    {roleLabel(role, true)}
                  </div>
                </div>

                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 7px',
                    borderRadius: 4,
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontSize: 10.5,
                    fontWeight: 800,
                    border: '1px solid #bfdbfe',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  height: 36,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#dc2626',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef2f2'
                  e.currentTarget.style.borderColor = '#fecaca'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.borderColor = '#cbd5e1'
                }}
              >
                {!isMobile && collapsed ? 'ĐX' : 'Đăng xuất'}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => navigate('/login')}
                style={{
                  width: '100%',
                  height: 38,
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13.5,
                  fontWeight: 700,
                }}
              >
                Đăng nhập
              </button>
              <button
                onClick={() => navigate('/register')}
                style={{
                  width: '100%',
                  height: 36,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 650,
                }}
              >
                Đăng ký tài khoản
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile backdrop (đóng menu khi bấm ra ngoài) */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            zIndex: 25,
          }}
        />
      )}

      {/* ================= RIGHT MAIN AREA (TOPBAR + CONTENT) ================= */}
      <div
        style={{
          flex: 1,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* TOPBAR / HEADER */}
        <header
          style={{
            height: 74,
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: isMobile ? '0 16px' : '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            flexShrink: 0,
            zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Mở menu"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: 20,
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ☰
              </button>
            )}
            {!isMobile && (
              <button
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: 18,
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MenuIcon name={collapsed ? 'chevronsRight' : 'chevronsLeft'} />
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>
                TroRoom / {pageMeta.category}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pageMeta.title}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {!isMobile && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#f8fafc',
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#10b981',
                  }}
                />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>
                  Hệ thống ổn định
                </span>
              </div>
            )}

            {hasToken ? (
              <div
                onClick={() => navigate('/profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                  {username || 'Hồ sơ cá nhân'}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => navigate('/register')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Đăng ký
                </button>
              </div>
            )}
          </div>
        </header>

        {/* SCROLLABLE MAIN CONTENT */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            background: '#f8fafc',
            position: 'relative',
          }}
        >
          {/* SLIDE BANNER (HIỂN THỊ KHI Ở CÁC TRANG QUẢN TRỊ / TỔNG QUAN) */}
          {currentPath !== '/search-rooms' && currentPath !== '/' && !currentPath.startsWith('/listing/') && (
            <div style={{ padding: '20px 28px 0', maxWidth: 1400, margin: '0 auto', boxSizing: 'border-box' }}>
              <BannerCarousel />
            </div>
          )}

          {/* PAGE OUTLET CONTENT */}
          <div style={{ boxSizing: 'border-box', width: '100%' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default MainLayout
