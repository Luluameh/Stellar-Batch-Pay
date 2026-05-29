"use client"

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// #360: Pagination is now fully controlled. Previously the page
// buttons had NO onClick handlers, so clicking any number did
// nothing and the table was permanently pinned to page 1.
interface PaginationProps {
  currentPage: number
  totalPages: number
  itemsShown?: string
  onPageChange: (page: number) => void
  className?: string
}

/**
 * Build a compact page-button list that always includes 1, the last
 * page, and the [currentPage-1, currentPage, currentPage+1] window
 * around the active page. Gaps are represented by `null`.
 */
function pageWindow(currentPage: number, totalPages: number): Array<number | null> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const out: Array<number | null> = []
  const push = (n: number) => { if (!out.includes(n)) out.push(n) }
  push(1)
  if (currentPage - 1 > 2) out.push(null)
  for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) push(p)
  if (currentPage + 1 < totalPages - 1) out.push(null)
  push(totalPages)
  return out
}

export function Pagination({
  currentPage,
  totalPages,
  itemsShown,
  onPageChange,
  className,
}: PaginationProps) {
  const goto = (n: number) => {
    if (n < 1 || n > totalPages || n === currentPage) return
    onPageChange(n)
  }

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-[#1F2937]/50", className)}>
      <div className="text-sm text-gray-400">
        {itemsShown ? (
          <>Showing <span className="text-gray-300 font-medium">{itemsShown}</span> batches</>
        ) : (
          <>Page <span className="text-gray-300 font-medium">{currentPage}</span> of {totalPages}</>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-[#121827] border-[#1F2937] text-gray-500 hover:text-white"
          disabled={currentPage === 1}
          onClick={() => goto(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1.5">
          {pageWindow(currentPage, totalPages).map((page, idx) =>
            page === null ? (
              <div key={`ellipsis-${idx}`} className="px-1 text-gray-500" aria-hidden="true">
                <MoreHorizontal className="h-4 w-4" />
              </div>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                onClick={() => goto(page)}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
                className={cn(
                  "h-9 w-9 rounded-md font-medium text-sm transition-all",
                  currentPage === page
                    ? "bg-[#00D98B] hover:bg-[#00D98B]/90 text-white border-transparent"
                    : "bg-[#121827] border-[#1F2937] text-gray-400 hover:text-white"
                )}
              >
                {page}
              </Button>
            ),
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-[#121827] border-[#1F2937] text-gray-500 hover:text-white"
          disabled={currentPage === totalPages}
          onClick={() => goto(currentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
