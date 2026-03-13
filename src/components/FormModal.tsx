import type { ReactNode } from 'react'

type FormModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  maxWidthClass?: string
}

function FormModal({ open, title, onClose, children, maxWidthClass = 'max-w-5xl' }: FormModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 p-4">
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-900/45"
        onClick={onClose}
        type="button"
      />
      <div className="relative z-10 flex min-h-full items-center justify-center">
        <div className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-2xl border border-teal-100 bg-white p-4 shadow-xl md:p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <button
              className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export default FormModal
