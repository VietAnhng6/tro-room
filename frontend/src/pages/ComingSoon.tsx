import { useNavigate } from 'react-router-dom'

export function ComingSoon({ title }: { title: string }) {
  const navigate = useNavigate()

  return (
    <div
      style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '30px 28px 60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 500,
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 20,
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
        }}
      >
        <h2 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
          {title}
        </h2>
        <p style={{ color: '#64748b', lineHeight: 1.6, margin: '0 0 24px', fontSize: 14 }}>
          Chức năng <strong>{title}</strong> đang trong quá trình hoàn thiện và sẽ sớm được cập nhật trong phiên bản tiếp theo.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            border: 0,
            borderRadius: 12,
            padding: '12px 22px',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            color: '#fff',
            fontWeight: 750,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
          }}
        >
          Quay về Tổng quan
        </button>
      </div>
    </div>
  )
}

export default ComingSoon
