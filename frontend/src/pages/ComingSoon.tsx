function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 460, width: '100%', background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 18, padding: 32, textAlign: 'center',
        boxShadow: '0 18px 50px rgba(15,23,42,.08)',
      }}>
        <div style={{ fontSize: 38, marginBottom: 12 }}>🚧</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 23, color: '#0f172a' }}>{title}</h1>
        <p style={{ color: '#64748b', lineHeight: 1.6, margin: '0 0 22px' }}>
          Giao diện chức năng này sẽ được triển khai ở sprint tương ứng.
        </p>
        <button onClick={() => { window.location.href = '/dashboard' }} style={{
          border: 0, borderRadius: 10, padding: '11px 18px',
          background: 'linear-gradient(135deg,#2563eb,#4f46e5)', color: '#fff',
          fontWeight: 700, cursor: 'pointer',
        }}>← Về Dashboard</button>
      </div>
    </div>
  )
}
export default ComingSoon
