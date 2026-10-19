
import Swal from 'sweetalert2'

const swal = Swal.mixin({
  confirmButtonColor: '#2563eb',
  cancelButtonColor: '#64748b',
  buttonsStyling: true,
})

export const showSuccess = (title: string, text?: string) =>
  swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Đã hiểu',
  })

export const showError = (title: string, text?: string) =>
  swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Đóng',
  })

export const showWarning = (title: string, text?: string) =>
  swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonText: 'Đã hiểu',
  })

export const showConfirm = async (
  title: string,
  text: string,
  confirmButtonText = 'Đồng ý',
) => {
  const result = await swal.fire({
    icon: 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Hủy',
    reverseButtons: true,
    focusCancel: true,
  })

  return result.isConfirmed
}

export const showToast = (
  title: string,
  icon: 'success' | 'error' | 'warning' | 'info' = 'success',
) =>
  swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  })
