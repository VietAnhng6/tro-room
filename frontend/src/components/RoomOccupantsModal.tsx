import React, { useEffect, useState } from 'react'

export interface ContractItem {
  id: number
  contractCode: string
  roomId: number
  roomCode: string
  tenantName: string
  tenantPhone: string
  tenantCitizenId: string
  startDate: string
  endDate?: string | null
  depositAmount: number
  rentAmount: number
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
  note?: string | null
}

export interface RoommateItem {
  id: number
  roomId: number
  fullName: string
  phone: string
  citizenId: string
  startDate: string
  endDate?: string | null
  status: 'ACTIVE' | 'MOVED_OUT'
  note?: string | null
}

export interface RoomOccupantsSummary {
  roomId: number
  roomCode: string
  buildingId: number
  buildingName: string
  maxPeople: number
  currentOccupants: number
  availableSlots: number
  isFull: boolean
  mainContract: ContractItem | null
  activeRoommates: RoommateItem[]
  movedOutRoommates: RoommateItem[]
}

export interface OccupantHistoryItem {
  id: number
  roleType: 'MAIN_TENANT' | 'ROOMMATE'
  roleLabel: string
  fullName: string
  phone: string
  citizenId: string
  startDate: string
  endDate?: string | null
  status: string
  statusLabel: string
  note?: string | null
  stayDays: number
}

interface RoomOccupantsModalProps {
  roomId: number
  roomCode: string
  buildingName?: string
  maxPeople?: number
  onClose: () => void
  onUpdated?: () => void
}

const API = 'http://localhost:8080'

const formatMoney = (val: number) =>
  new Intl.NumberFormat('vi-VN').format(val) + ' đ'

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '-'
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  } catch {
    return dateStr
  }
}

export const RoomOccupantsModal: React.FC<RoomOccupantsModalProps> = ({
  roomId,
  roomCode,
  buildingName,
  maxPeople: initialMaxPeople = 4,
  onClose,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [successMsg, setSuccessMsg] = useState<string>('')

  // Summary state
  const [summary, setSummary] = useState<RoomOccupantsSummary | null>(null)

  // Contract form modal state
  const [showContractModal, setShowContractModal] = useState<boolean>(false)
  const [contractForm, setContractForm] = useState({
    tenantName: '',
    tenantPhone: '',
    tenantCitizenId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    depositAmount: 0,
    rentAmount: 0,
    note: '',
  })
  const [submittingContract, setSubmittingContract] = useState<boolean>(false)

  // Roommate form modal state (Add / Edit)
  const [showRoommateModal, setShowRoommateModal] = useState<boolean>(false)
  const [editingRoommateId, setEditingRoommateId] = useState<number | null>(null)
  const [roommateForm, setRoommateForm] = useState({
    fullName: '',
    phone: '',
    citizenId: '',
    startDate: new Date().toISOString().split('T')[0],
    note: '',
  })
  const [submittingRoommate, setSubmittingRoommate] = useState<boolean>(false)

  // Move-out modal state
  const [movingOutRoommate, setMovingOutRoommate] = useState<RoommateItem | null>(null)
  const [moveOutDate, setMoveOutDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [moveOutNote, setMoveOutNote] = useState<string>('')
  const [submittingMoveOut, setSubmittingMoveOut] = useState<boolean>(false)

  // Delete confirm state
  const [deletingRoommate, setDeletingRoommate] = useState<RoommateItem | null>(null)
  const [submittingDelete, setSubmittingDelete] = useState<boolean>(false)

  // History Tab Filter State
  const [historyList, setHistoryList] = useState<OccupantHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState<boolean>(false)
  const [historyFilterFrom, setHistoryFilterFrom] = useState<string>('')
  const [historyFilterTo, setHistoryFilterTo] = useState<string>('')
  const [historyFilterStatus, setHistoryFilterStatus] = useState<string>('ALL')
  const [historyKeyword, setHistoryKeyword] = useState<string>('')

  const token = localStorage.getItem('accessToken')
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // Load summary data
  const loadSummary = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/rooms/${roomId}/occupants`, { headers })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message || 'Không thể tải thông tin người ở của phòng.')
      }
      const data: RoomOccupantsSummary = await res.json()
      setSummary(data)

      // Sync form if contract exists
      if (data.mainContract) {
        setContractForm({
          tenantName: data.mainContract.tenantName,
          tenantPhone: data.mainContract.tenantPhone,
          tenantCitizenId: data.mainContract.tenantCitizenId,
          startDate: data.mainContract.startDate,
          endDate: data.mainContract.endDate || '',
          depositAmount: data.mainContract.depositAmount,
          rentAmount: data.mainContract.rentAmount,
          note: data.mainContract.note || '',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu.')
    } finally {
      setLoading(false)
    }
  }

  // Load History data
  const loadHistory = async () => {
    setHistoryLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (historyFilterFrom) params.append('from', historyFilterFrom)
      if (historyFilterTo) params.append('to', historyFilterTo)
      if (historyFilterStatus && historyFilterStatus !== 'ALL')
        params.append('status', historyFilterStatus)
      if (historyKeyword) params.append('keyword', historyKeyword)

      const url = `${API}/api/rooms/${roomId}/occupants/history?${params.toString()}`
      const res = await fetch(url, { headers })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message || 'Không thể tải lịch sử người ở.')
      }
      const data: OccupantHistoryItem[] = await res.json()
      setHistoryList(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi tải lịch sử người ở.')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
  }, [roomId])

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab, historyFilterStatus])

  const showNotification = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => {
      setSuccessMsg('')
    }, 4500)
  }

  // Handle Save Contract Signer
  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!contractForm.tenantName.trim()) {
      setError('Vui lòng nhập họ tên người đứng tên hợp đồng.')
      return
    }
    if (!/^0\d{9}$/.test(contractForm.tenantPhone.trim())) {
      setError('Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.')
      return
    }
    if (!/^(\d{9}|\d{12})$/.test(contractForm.tenantCitizenId.trim())) {
      setError('Số CCCD/CMND phải gồm 9 hoặc 12 chữ số hợp lệ.')
      return
    }
    if (!contractForm.startDate) {
      setError('Vui lòng chọn ngày bắt đầu hợp đồng.')
      return
    }

    setSubmittingContract(true)
    try {
      const res = await fetch(`${API}/api/rooms/${roomId}/contract`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tenantName: contractForm.tenantName.trim(),
          tenantPhone: contractForm.tenantPhone.trim(),
          tenantCitizenId: contractForm.tenantCitizenId.trim(),
          startDate: contractForm.startDate,
          endDate: contractForm.endDate || null,
          depositAmount: Number(contractForm.depositAmount) || 0,
          rentAmount: Number(contractForm.rentAmount) || 0,
          note: contractForm.note.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.message || 'Không thể lưu thông tin người đứng tên hợp đồng.')
      }

      setShowContractModal(false)
      showNotification('Đã cập nhật thông tin người đứng tên hợp đồng thành công.')
      loadSummary()
      onUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi lưu hợp đồng.')
    } finally {
      setSubmittingContract(false)
    }
  }

  // Handle Open Add Roommate
  const handleOpenAddRoommate = () => {
    setError('')
    if (summary && summary.isFull) {
      setError(
        `Phòng ${summary.roomCode} đã đạt sức chứa tối đa (${summary.maxPeople} người). Không thể thêm người ở ghép mới!`
      )
      return
    }
    setEditingRoommateId(null)
    setRoommateForm({
      fullName: '',
      phone: '',
      citizenId: '',
      startDate: new Date().toISOString().split('T')[0],
      note: '',
    })
    setShowRoommateModal(true)
  }

  // Handle Open Edit Roommate
  const handleOpenEditRoommate = (rm: RoommateItem) => {
    setError('')
    setEditingRoommateId(rm.id)
    setRoommateForm({
      fullName: rm.fullName,
      phone: rm.phone,
      citizenId: rm.citizenId,
      startDate: rm.startDate,
      note: rm.note || '',
    })
    setShowRoommateModal(true)
  }

  // Handle Save Roommate (Add / Edit)
  const handleSaveRoommate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!roommateForm.fullName.trim()) {
      setError('Vui lòng nhập họ và tên người ở ghép.')
      return
    }
    if (!/^0\d{9}$/.test(roommateForm.phone.trim())) {
      setError('Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.')
      return
    }
    if (!/^(\d{9}|\d{12})$/.test(roommateForm.citizenId.trim())) {
      setError('Số CCCD/CMND phải gồm 9 hoặc 12 chữ số hợp lệ.')
      return
    }
    if (!roommateForm.startDate) {
      setError('Vui lòng chọn ngày bắt đầu ở cùng.')
      return
    }

    setSubmittingRoommate(true)
    try {
      const isEdit = editingRoommateId !== null
      const url = isEdit
        ? `${API}/api/rooms/${roomId}/roommates/${editingRoommateId}`
        : `${API}/api/rooms/${roomId}/roommates`
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          fullName: roommateForm.fullName.trim(),
          phone: roommateForm.phone.trim(),
          citizenId: roommateForm.citizenId.trim(),
          startDate: roommateForm.startDate,
          note: roommateForm.note.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.message || 'Không thể lưu thông tin người ở ghép.')
      }

      setShowRoommateModal(false)
      showNotification(
        isEdit
          ? 'Đã cập nhật thông tin người ở ghép thành công.'
          : 'Đã thêm người ở ghép vào phòng thành công.'
      )
      loadSummary()
      onUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi lưu thông tin người ở ghép.')
    } finally {
      setSubmittingRoommate(false)
    }
  }

  // Handle Open Move Out
  const handleOpenMoveOut = (rm: RoommateItem) => {
    setError('')
    setMovingOutRoommate(rm)
    setMoveOutDate(new Date().toISOString().split('T')[0])
    setMoveOutNote('')
  }

  // Handle Submit Move Out
  const handleSubmitMoveOut = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!movingOutRoommate) return
    setError('')

    if (!moveOutDate) {
      setError('Vui lòng chọn ngày chuyển đi.')
      return
    }
    if (moveOutDate < movingOutRoommate.startDate) {
      setError(
        `Ngày chuyển đi không thể trước ngày bắt đầu ở cùng (${formatDate(movingOutRoommate.startDate)}).`
      )
      return
    }

    setSubmittingMoveOut(true)
    try {
      const res = await fetch(
        `${API}/api/rooms/${roomId}/roommates/${movingOutRoommate.id}/move-out`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            moveOutDate,
            note: moveOutNote.trim(),
          }),
        }
      )

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.message || 'Không thể ghi nhận chuyển đi.')
      }

      setMovingOutRoommate(null)
      showNotification(
        `Đã ghi nhận người ở ghép ${movingOutRoommate.fullName} chuyển đi vào ngày ${formatDate(moveOutDate)}.`
      )
      loadSummary()
      onUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi ghi nhận chuyển đi.')
    } finally {
      setSubmittingMoveOut(false)
    }
  }

  // Handle Delete Roommate
  const handleDeleteRoommate = async () => {
    if (!deletingRoommate) return
    setError('')
    setSubmittingDelete(true)
    try {
      const res = await fetch(
        `${API}/api/rooms/${roomId}/roommates/${deletingRoommate.id}`,
        {
          method: 'DELETE',
          headers,
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message || 'Không thể xóa người ở ghép.')
      }

      setDeletingRoommate(null)
      showNotification(`Đã xóa người ở ghép ${deletingRoommate.fullName}.`)
      loadSummary()
      onUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi xóa người ở ghép.')
    } finally {
      setSubmittingDelete(false)
    }
  }

  const maxCapacity = summary?.maxPeople ?? initialMaxPeople
  const currentTotal = summary?.currentOccupants ?? 0
  const isFullCapacity = currentTotal >= maxCapacity
  const capacityPercent = Math.min(100, Math.round((currentTotal / maxCapacity) * 100))

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 960,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.3px',
                }}
              >
                Danh sách người ở - Phòng {roomCode}
              </h2>
              {buildingName && (
                <span
                  style={{
                    background: '#e2e8f0',
                    color: '#334155',
                    fontSize: 12,
                    fontWeight: 650,
                    padding: '3px 10px',
                    borderRadius: 999,
                  }}
                >
                  {buildingName}
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Quản lý người đứng tên hợp đồng, người ở ghép và lịch sử người ở theo thời gian (S3-02)
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#f1f5f9',
              color: '#475569',
              width: 34,
              height: 34,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 16,
              transition: 'background 0.2s',
            }}
            title="Đóng modal"
          >
            ✕
          </button>
        </div>

        {/* CAPACITY STATUS BAR */}
        <div
          style={{
            padding: '12px 24px',
            background: isFullCapacity ? '#fffbeb' : '#f0fdf4',
            borderBottom: isFullCapacity ? '1px solid #fef3c7' : '1px solid #dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
            <div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isFullCapacity ? '#92400e' : '#166534',
                }}
              >
                Sức chứa hiện tại: {currentTotal} / {maxCapacity} người
              </span>
              <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
                ({summary?.mainContract ? '1 người đứng tên' : '0 người đứng tên'} +{' '}
                {summary?.activeRoommates?.length || 0} người ở ghép)
              </span>
            </div>

            <div
              style={{
                width: 120,
                height: 8,
                background: '#e2e8f0',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${capacityPercent}%`,
                  height: '100%',
                  background: isFullCapacity ? '#f59e0b' : '#22c55e',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <div>
            {isFullCapacity ? (
              <span
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #fde68a',
                }}
              >
                Đã đạt giới hạn tối đa
              </span>
            ) : (
              <span
                style={{
                  background: '#dcfce7',
                  color: '#166534',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #bbf7d0',
                }}
              >
                Còn trống {maxCapacity - currentTotal} chỗ
              </span>
            )}
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 24px',
            background: '#ffffff',
          }}
        >
          <button
            onClick={() => setActiveTab('current')}
            style={{
              padding: '14px 20px',
              border: 'none',
              background: 'none',
              fontSize: 14,
              fontWeight: activeTab === 'current' ? 750 : 600,
              color: activeTab === 'current' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'current' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Người ở hiện tại
            <span
              style={{
                background: activeTab === 'current' ? '#eff6ff' : '#f1f5f9',
                color: activeTab === 'current' ? '#2563eb' : '#64748b',
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {currentTotal}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '14px 20px',
              border: 'none',
              background: 'none',
              fontSize: 14,
              fontWeight: activeTab === 'history' ? 750 : 600,
              color: activeTab === 'history' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'history' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Lịch sử người ở theo thời gian
          </button>
        </div>

        {/* NOTIFICATIONS / ERROR BANNER */}
        {error && (
          <div
            style={{
              margin: '14px 24px 0',
              padding: '12px 16px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              color: '#b91c1c',
              fontSize: 13.5,
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              margin: '14px 24px 0',
              padding: '12px 16px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              color: '#15803d',
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            {successMsg}
          </div>
        )}

        {/* MODAL BODY */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
              Đang tải thông tin người ở...
            </div>
          ) : activeTab === 'current' ? (
            /* TAB 1: NGƯỜI Ở HIỆN TẠI */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* PHẦN 1: NGƯỜI ĐỨNG TÊN HỢP ĐỒNG (1 NGƯỜI DUY NHẤT) */}
              <div
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  padding: 18,
                  background: '#f8fafc',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 14,
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          background: '#2563eb',
                          color: '#ffffff',
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 4,
                          letterSpacing: '0.5px',
                        }}
                      >
                        NGƯỜI ĐỨNG TÊN HỢP ĐỒNG (1 NGƯỜI)
                      </span>
                      <span style={{ fontSize: 13, color: '#64748b' }}>
                        Người chịu trách nhiệm thanh toán hóa đơn và nhận lại tiền cọc
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setError('')
                      setShowContractModal(true)
                    }}
                    style={{
                      border: '1px solid #2563eb',
                      background: summary?.mainContract ? '#ffffff' : '#2563eb',
                      color: summary?.mainContract ? '#2563eb' : '#ffffff',
                      borderRadius: 8,
                      padding: '7px 14px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {summary?.mainContract ? 'Cập nhật thông tin' : 'Thiết lập người đứng tên'}
                  </button>
                </div>

                {summary?.mainContract ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 16,
                      background: '#ffffff',
                      padding: 16,
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Họ và tên</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                        {summary.mainContract.tenantName}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Số điện thoại</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginTop: 2 }}>
                        {summary.mainContract.tenantPhone}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Số CCCD / CMND</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginTop: 2 }}>
                        {summary.mainContract.tenantCitizenId}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Ngày bắt đầu hợp đồng</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginTop: 2 }}>
                        {formatDate(summary.mainContract.startDate)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Tiền đặt cọc</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#059669', marginTop: 2 }}>
                        {formatMoney(summary.mainContract.depositAmount)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Mã hợp đồng</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginTop: 2 }}>
                        {summary.mainContract.contractCode}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '24px 16px',
                      borderRadius: 10,
                      textAlign: 'center',
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <div style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>
                      Chưa có người đứng tên hợp đồng
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                      Nhấn nút "Thiết lập người đứng tên" ở trên để ghi nhận hợp đồng thuê phòng.
                    </div>
                  </div>
                )}
              </div>

              {/* PHẦN 2: DANH SÁCH NGƯỜI Ở GHÉP (ROOMMATES) */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      Danh sách người ở ghép ({summary?.activeRoommates?.length || 0} người)
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748b' }}>
                      Cơ sở để tính đúng các khoản dịch vụ khoán theo đầu người
                    </p>
                  </div>

                  <button
                    onClick={handleOpenAddRoommate}
                    disabled={isFullCapacity}
                    style={{
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      background: isFullCapacity ? '#cbd5e1' : '#16a34a',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isFullCapacity ? 'not-allowed' : 'pointer',
                      boxShadow: isFullCapacity ? 'none' : '0 2px 6px rgba(22, 163, 74, 0.25)',
                    }}
                    title={
                      isFullCapacity
                        ? `Phòng đã đạt tối đa ${maxCapacity} người, không thể thêm mới.`
                        : 'Thêm người ở ghép mới vào phòng'
                    }
                  >
                    + Thêm người ở ghép
                  </button>
                </div>

                {isFullCapacity && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      padding: '10px 14px',
                      borderRadius: 8,
                      color: '#92400e',
                      fontSize: 12.5,
                      marginBottom: 12,
                    }}
                  >
                    Lưu ý: Phòng đã đủ số lượng người ở tối đa ({maxCapacity}/{maxCapacity} người). Để thêm người mới, cần ghi nhận chuyển đi cho người ở hiện tại.
                  </div>
                )}

                {/* TABLE NGƯỜI Ở GHÉP */}
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#ffffff',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, width: 45 }}>STT</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Họ và tên</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Số điện thoại</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Số CCCD</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Ngày bắt đầu ở</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Ghi chú</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, width: 220 }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary?.activeRoommates && summary.activeRoommates.length > 0 ? (
                        summary.activeRoommates.map((rm, idx) => (
                          <tr
                            key={rm.id}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                          >
                            <td style={{ padding: '12px 14px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                              #{idx + 1}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 750, color: '#0f172a' }}>
                              {rm.fullName}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#334155', fontWeight: 600 }}>
                              {rm.phone}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#334155', fontWeight: 600 }}>
                              {rm.citizenId}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#475569' }}>
                              {formatDate(rm.startDate)}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#64748b', maxWidth: 160 }}>
                              {rm.note || '-'}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleOpenMoveOut(rm)}
                                  style={{
                                    border: '1px solid #fed7aa',
                                    background: '#fff7ed',
                                    color: '#ea580c',
                                    borderRadius: 6,
                                    padding: '5px 10px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                  title="Ghi nhận ngày rời phòng của người ở ghép"
                                >
                                  Chuyển đi
                                </button>
                                <button
                                  onClick={() => handleOpenEditRoommate(rm)}
                                  style={{
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#334155',
                                    borderRadius: 6,
                                    padding: '5px 8px',
                                    fontSize: 12,
                                    fontWeight: 650,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Sửa
                                </button>
                                <button
                                  onClick={() => setDeletingRoommate(rm)}
                                  style={{
                                    border: '1px solid #fecaca',
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    borderRadius: 6,
                                    padding: '5px 8px',
                                    fontSize: 12,
                                    fontWeight: 650,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                            Chưa có người ở ghép trong phòng này. Nhấn "+ Thêm người ở ghép" để bắt đầu ghi nhận.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: LỊCH SỬ NGƯỜI Ở THEO KHOẢNG THỜI GIAN */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* FILTER BAR */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={historyFilterFrom}
                    onChange={(e) => setHistoryFilterFrom(e.target.value)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 13,
                      background: '#ffffff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={historyFilterTo}
                    onChange={(e) => setHistoryFilterTo(e.target.value)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 13,
                      background: '#ffffff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Trạng thái
                  </label>
                  <select
                    value={historyFilterStatus}
                    onChange={(e) => setHistoryFilterStatus(e.target.value)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 13,
                      background: '#ffffff',
                    }}
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="ACTIVE">Đang ở</option>
                    <option value="MOVED_OUT">Đã chuyển đi</option>
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Tìm kiếm
                  </label>
                  <input
                    type="text"
                    placeholder="Họ tên, SĐT, CCCD..."
                    value={historyKeyword}
                    onChange={(e) => setHistoryKeyword(e.target.value)}
                    style={{
                      width: '100%',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 13,
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={loadHistory}
                    style={{
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      borderRadius: 6,
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Lọc lịch sử
                  </button>
                  <button
                    onClick={() => {
                      setHistoryFilterFrom('')
                      setHistoryFilterTo('')
                      setHistoryFilterStatus('ALL')
                      setHistoryKeyword('')
                    }}
                    style={{
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      borderRadius: 6,
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Đặt lại
                  </button>
                </div>
              </div>

              {/* HISTORY TABLE */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#ffffff',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, width: 45 }}>STT</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Họ và tên</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Vai trò</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Số điện thoại</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Số CCCD</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Thời gian ở</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>Trạng thái</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading ? (
                      <tr>
                        <td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
                          Đang tải dữ liệu lịch sử người ở...
                        </td>
                      </tr>
                    ) : historyList.length > 0 ? (
                      historyList.map((item, idx) => (
                        <tr
                          key={`${item.roleType}-${item.id}`}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                        >
                          <td style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                            #{idx + 1}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 750, color: '#0f172a' }}>
                            {item.fullName}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {item.roleType === 'MAIN_TENANT' ? (
                              <span
                                style={{
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  fontSize: 11.5,
                                  fontWeight: 750,
                                }}
                              >
                                Đứng tên hợp đồng
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: '#f3e8ff',
                                  color: '#7e22ce',
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  fontSize: 11.5,
                                  fontWeight: 750,
                                }}
                              >
                                Người ở ghép
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', color: '#334155', fontWeight: 600 }}>
                            {item.phone}
                          </td>
                          <td style={{ padding: '12px', color: '#334155', fontWeight: 600 }}>
                            {item.citizenId}
                          </td>
                          <td style={{ padding: '12px', color: '#475569' }}>
                            <div>
                              {formatDate(item.startDate)} - {item.endDate ? formatDate(item.endDate) : 'Hiện tại'}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 1 }}>
                              (Tổng {item.stayDays} ngày)
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {item.status === 'ACTIVE' ? (
                              <span
                                style={{
                                  background: '#dcfce7',
                                  color: '#166534',
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                  fontSize: 11.5,
                                  fontWeight: 750,
                                }}
                              >
                                Đang ở
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: '#f1f5f9',
                                  color: '#475569',
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                  fontSize: 11.5,
                                  fontWeight: 750,
                                }}
                              >
                                Đã chuyển đi
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', color: '#64748b' }}>
                            {item.note || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                          Không tìm thấy lịch sử người ở nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            background: '#f8fafc',
          }}
        >
          <button
            onClick={onClose}
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              borderRadius: 8,
              padding: '9px 20px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>

      {/* SUB-MODAL 1: THIẾT LẬP NGƯỜI ĐỨNG TÊN HỢP ĐỒNG */}
      {showContractModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 560,
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                Thiết lập người đứng tên hợp đồng
              </h3>
              <button
                onClick={() => setShowContractModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContract} style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Họ và tên người đứng tên <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={contractForm.tenantName}
                    onChange={(e) => setContractForm({ ...contractForm, tenantName: e.target.value })}
                    style={{
                      width: '100%',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '9px 12px',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Số điện thoại <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="0912345678"
                      value={contractForm.tenantPhone}
                      onChange={(e) => setContractForm({ ...contractForm, tenantPhone: e.target.value })}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '9px 12px',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Số CCCD / CMND <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="001201012345"
                      value={contractForm.tenantCitizenId}
                      onChange={(e) => setContractForm({ ...contractForm, tenantCitizenId: e.target.value })}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '9px 12px',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Ngày bắt đầu hợp đồng <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={contractForm.startDate}
                      onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '9px 12px',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Ngày kết thúc dự kiến
                    </label>
                    <input
                      type="date"
                      value={contractForm.endDate}
                      onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '9px 12px',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Tiền đặt cọc (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100000}
                      value={contractForm.depositAmount}
                      onChange={(e) => setContractForm({ ...contractForm, depositAmount: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '9px 12px',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Giá thuê thỏa thuận (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100000}
                      value={contractForm.rentAmount}
                      onChange={(e) => setContractForm({ ...contractForm, rentAmount: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '9px 12px',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Ghi chú
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ghi chú điều khoản hợp đồng..."
                    value={contractForm.note}
                    onChange={(e) => setContractForm({ ...contractForm, note: e.target.value })}
                    style={{
                      width: '100%',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '9px 12px',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    borderRadius: 8,
                    padding: '9px 18px',
                    fontSize: 13.5,
                    fontWeight: 650,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingContract}
                  style={{
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    borderRadius: 8,
                    padding: '9px 20px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: submittingContract ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingContract ? 'Đang lưu...' : 'Lưu hợp đồng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: THÊM / SỬA NGƯỜI Ở GHÉP */}
      {showRoommateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 520,
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                {editingRoommateId ? 'Sửa thông tin người ở ghép' : 'Thêm người ở ghép mới'}
              </h3>
              <button
                onClick={() => setShowRoommateModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoommate} style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Họ và tên người ở ghép <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Trần Thị B"
                    value={roommateForm.fullName}
                    onChange={(e) => setRoommateForm({ ...roommateForm, fullName: e.target.value })}
                    style={{
                      width: '100%',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '9px 12px',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Số điện thoại <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="0987654321"
                      value={roommateForm.phone}
                      onChange={(e) => setRoommateForm({ ...roommateForm, phone: e.target.value })}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '9px 12px',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Số CCCD / CMND <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="079201012345"
                      value={roommateForm.citizenId}
                      onChange={(e) => setRoommateForm({ ...roommateForm, citizenId: e.target.value })}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '9px 12px',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Ngày bắt đầu ở cùng <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={roommateForm.startDate}
                    onChange={(e) => setRoommateForm({ ...roommateForm, startDate: e.target.value })}
                    style={{
                      width: '100%',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '9px 12px',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Ghi chú
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Quan hệ với người đứng tên, xe cộ..."
                    value={roommateForm.note}
                    onChange={(e) => setRoommateForm({ ...roommateForm, note: e.target.value })}
                    style={{
                      width: '100%',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '9px 12px',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setShowRoommateModal(false)}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    borderRadius: 8,
                    padding: '9px 18px',
                    fontSize: 13.5,
                    fontWeight: 650,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingRoommate}
                  style={{
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    borderRadius: 8,
                    padding: '9px 20px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: submittingRoommate ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingRoommate ? 'Đang lưu...' : editingRoommateId ? 'Cập nhật' : 'Thêm người ở ghép'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: GHI NHẬN CHUYỂN ĐI */}
      {movingOutRoommate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 480,
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#fff7ed',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#c2410c' }}>
                Ghi nhận người ở ghép chuyển đi
              </h3>
              <button
                onClick={() => setMovingOutRoommate(null)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitMoveOut} style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Họ và tên người ở ghép:</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {movingOutRoommate.fullName} ({movingOutRoommate.phone})
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                    Ngày vào ở: {formatDate(movingOutRoommate.startDate)}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Ngày chuyển đi <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={moveOutDate}
                    onChange={(e) => setMoveOutDate(e.target.value)}
                    style={{
                      width: '100%',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '9px 12px',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'block' }}>
                    Từ kỳ hóa đơn sau ngày này, các khoản dịch vụ khoán theo đầu người sẽ giảm tương ứng.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Lý do / Ghi chú chuyển đi
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Lý do rời phòng..."
                    value={moveOutNote}
                    onChange={(e) => setMoveOutNote(e.target.value)}
                    style={{
                      width: '100%',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '9px 12px',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setMovingOutRoommate(null)}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    borderRadius: 8,
                    padding: '9px 18px',
                    fontSize: 13.5,
                    fontWeight: 650,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingMoveOut}
                  style={{
                    border: 'none',
                    background: '#ea580c',
                    color: '#ffffff',
                    borderRadius: 8,
                    padding: '9px 20px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: submittingMoveOut ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingMoveOut ? 'Đang xử lý...' : 'Xác nhận chuyển đi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 4: XÁC NHẬN XÓA */}
      {deletingRoommate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 440,
              padding: 22,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 800, color: '#dc2626' }}>
              Xác nhận xóa người ở ghép
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, color: '#475569', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa bản ghi người ở ghép <strong>{deletingRoommate.fullName}</strong> ({deletingRoommate.phone}) khỏi danh sách phòng không?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setDeletingRoommate(null)}
                style={{
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13.5,
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteRoommate}
                disabled={submittingDelete}
                style={{
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  borderRadius: 8,
                  padding: '8px 18px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: submittingDelete ? 'not-allowed' : 'pointer',
                }}
              >
                {submittingDelete ? 'Đang xóa...' : 'Xóa bản ghi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomOccupantsModal
