import React from 'react'

interface PaginationProps {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  itemLabel?: string
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20],
  itemLabel = 'mục',
}: PaginationProps) {
  if (totalItems <= 0) return null

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(totalItems, currentPage * pageSize)

  // Visible page numbers calculation
  const getPageNumbers = () => {
    const pages: number[] = []
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
        pages.push(i)
      }
    }
    return pages
  }

  const visiblePages = getPageNumbers()

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 18,
        padding: '14px 20px',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 2px 8px rgba(15,23,42,.03)',
        fontSize: 14,
      }}
    >
      <div style={{ color: '#475569' }}>
        Hiển thị <strong>{startItem}</strong> - <strong>{endItem}</strong> trên tổng số{' '}
        <strong>{totalItems}</strong> {itemLabel}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          style={{
            padding: '7px 14px',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            background: currentPage <= 1 ? '#f8fafc' : '#fff',
            color: currentPage <= 1 ? '#94a3b8' : '#1e293b',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            fontWeight: 650,
            fontSize: 13,
          }}
        >
          ← Trang trước
        </button>

        {visiblePages.map((p, i) => {
          const prev = visiblePages[i - 1]
          return (
            <React.Fragment key={p}>
              {prev && p - prev > 1 && (
                <span style={{ padding: '0 4px', color: '#94a3b8' }}>…</span>
              )}
              <button
                type="button"
                onClick={() => onPageChange(p)}
                style={{
                  minWidth: 36,
                  height: 36,
                  padding: '0 8px',
                  border: p === currentPage ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: 8,
                  background: p === currentPage ? '#2563eb' : '#fff',
                  color: p === currentPage ? '#fff' : '#334155',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            </React.Fragment>
          )
        })}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          style={{
            padding: '7px 14px',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            background: currentPage >= totalPages ? '#f8fafc' : '#fff',
            color: currentPage >= totalPages ? '#94a3b8' : '#1e293b',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            fontWeight: 650,
            fontSize: 13,
          }}
        >
          Trang sau →
        </button>

        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value))
              onPageChange(1)
            }}
            style={{
              padding: '7px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              background: '#fff',
              fontSize: 13,
              color: '#1e293b',
              cursor: 'pointer',
              marginLeft: 8,
              outline: 'none',
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / trang
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
