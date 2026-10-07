import React, { useEffect, useState } from 'react'

interface SlideItem {
  id: number
  badge: string
  title: string
  description: string
  gradient: string
  textColor: string
  badgeBg: string
  badgeColor: string
}

const SLIDES: SlideItem[] = [
  {
    id: 1,
    badge: 'Hệ thống quản lý TroRoom',
    title: 'Hệ thống Quản lý và Tìm kiếm Phòng trọ Thông minh',
    description:
      'Quản lý danh sách phòng, tòa nhà, dịch vụ và hợp đồng dễ dàng. Tự động hóa quy trình thuê phòng và kiểm soát hoạt động vận hành hiệu quả.',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)',
    textColor: '#ffffff',
    badgeBg: 'rgba(255, 255, 255, 0.2)',
    badgeColor: '#ffffff',
  },
  {
    id: 2,
    badge: 'Dịch vụ và Chi phí',
    title: 'Tính toán Minh bạch và Cấu hình Linh hoạt',
    description:
      'Quản lý đơn giá điện, nước, internet, vệ sinh theo từng tòa nhà hoặc áp dụng riêng cho từng phòng với độ chính xác cao.',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)',
    textColor: '#ffffff',
    badgeBg: 'rgba(255, 255, 255, 0.2)',
    badgeColor: '#ffffff',
  },
  {
    id: 3,
    badge: 'Kết nối Khách thuê và Chủ nhà',
    title: 'Gửi Yêu cầu Thuê và Đặt lịch Xem phòng Trực tuyến',
    description:
      'Khách thuê dễ dàng khám phá phòng trống, đặt lịch hẹn xem phòng và nhận phản hồi trực tiếp từ Chủ nhà nhanh chóng.',
    gradient: 'linear-gradient(135deg, #5b21b6 0%, #6d28d9 60%, #7c3aed 100%)',
    textColor: '#ffffff',
    badgeBg: 'rgba(255, 255, 255, 0.2)',
    badgeColor: '#ffffff',
  },
]

export const BannerCarousel: React.FC = () => {
  const [current, setCurrent] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (isHovered) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [isHovered])

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % SLIDES.length)
  }

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)
  }

  const slide = SLIDES[current]

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        background: slide.gradient,
        color: slide.textColor,
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
        transition: 'background 0.5s ease',
        minHeight: 130,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '22px 28px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: 6,
                background: slide.badgeBg,
                color: slide.badgeColor,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.2px',
              }}
            >
              {slide.badge}
            </span>
          </div>

          <h2
            style={{
              margin: '0 0 6px 0',
              fontSize: 19,
              fontWeight: 800,
              lineHeight: 1.3,
              letterSpacing: '-0.3px',
            }}
          >
            {slide.title}
          </h2>

          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              opacity: 0.92,
              maxWidth: 820,
            }}
          >
            {slide.description}
          </p>
        </div>
      </div>

      {/* Controls: Prev/Next & Dots */}
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          padding: '0 28px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrent(idx)}
              style={{
                width: current === idx ? 22 : 7,
                height: 7,
                borderRadius: 4,
                border: 'none',
                background: current === idx ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                padding: 0,
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={prevSlide}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: 'none',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold',
            }}
          >
            ‹
          </button>
          <button
            onClick={nextSlide}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: 'none',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold',
            }}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}

export default BannerCarousel
