import { useEffect } from 'react'
import { dismissNotice, useDeck } from '@/store/deck.ts'

const DISMISS_AFTER = 5000

export function Toast() {
  const notice = useDeck((s) => s.notice)
  const id = notice?.id

  useEffect(() => {
    if (id === undefined) return
    const timer = window.setTimeout(() => dismissNotice(id), DISMISS_AFTER)
    return () => window.clearTimeout(timer)
  }, [id])

  if (!notice) return null

  return (
    <div className="toast" role="status" onClick={() => dismissNotice(notice.id)}>
      {notice.text}
    </div>
  )
}
