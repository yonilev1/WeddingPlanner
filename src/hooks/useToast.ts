import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  kind: ToastKind
}

interface ToastState {
  toasts: Toast[]
  addToast: (message: string, kind?: ToastKind) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, kind = 'success') => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }))
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      3000
    )
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function useToast() {
  const { addToast } = useToastStore()
  return {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
  }
}
