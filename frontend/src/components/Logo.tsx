import React from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  title?: string
  subtitle?: string
  className?: string
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  title = 'itro',
  subtitle,
  className = '',
}) => {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36
  const titleSize = size === 'sm' ? '18px' : size === 'lg' ? '26px' : '22px'
  const subSize = size === 'sm' ? '11px' : size === 'lg' ? '13px' : '12px'

  return (
    <div
      className={`itro-logo-brand ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '8px' : '12px',
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: size === 'sm' ? '8px' : '10px',
          background: 'linear-gradient(135deg, #eb6b40 0%, #f97316 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: size === 'sm' ? '15px' : size === 'lg' ? '22px' : '18px',
          boxShadow: '0 4px 12px rgba(235, 107, 64, 0.28)',
          flexShrink: 0,
        }}
      >
        🏠
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
        <span
          style={{
            fontSize: titleSize,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: '#1e293b',
            lineHeight: 1.1,
          }}
        >
          {title.toLowerCase() === 'itro' ? (
            <>
              <span style={{ color: '#eb6b40' }}>i</span>Tro
            </>
          ) : (
            title
          )}
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
