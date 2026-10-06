import React from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  title?: string
  subtitle?: string
  className?: string
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  title = 'TroRoom',
  subtitle = 'Quản lý phòng trọ',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 32 : size === 'lg' ? 46 : 38
  const titleSize = size === 'sm' ? '18px' : size === 'lg' ? '24px' : '20px'
  const subSize = size === 'sm' ? '11px' : size === 'lg' ? '13px' : '12px'

  return (
    <div
      className={`troroom-logo-brand ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '10px' : '12px',
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 900,
          fontSize: size === 'sm' ? '15px' : size === 'lg' ? '20px' : '17px',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
          flexShrink: 0,
          letterSpacing: '-0.5px',
        }}
      >
        TR
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
        <span
          style={{
            fontSize: titleSize,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: '#0f172a',
            lineHeight: 1.15,
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span
            style={{
              fontSize: subSize,
              color: '#64748b',
              fontWeight: 500,
              marginTop: '2px',
              lineHeight: 1.2,
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}

export default Logo
