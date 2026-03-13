type PaginationProps = {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

function Pagination({ currentPage, totalItems, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  if (totalItems <= pageSize) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-teal-100 px-4 py-3 text-xs">
      <span className="text-slate-500">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          className="rounded-lg border border-teal-200 px-2.5 py-1 font-medium text-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          Previous
        </button>
        <button
          className="rounded-lg border border-teal-200 px-2.5 py-1 font-medium text-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default Pagination
