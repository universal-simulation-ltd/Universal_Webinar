import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Send, Smile, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { MessageRow, ReactionRow } from '@/lib/database.types'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢'] as const

interface Props {
  messages: MessageRow[]
  reactions: ReactionRow[]
  currentAttendeeId: string | null
  isAdmin: boolean
  loading?: boolean
  readOnly?: boolean
  onSend?: (content: string) => Promise<void> | void
  onAddReaction?: (messageId: string, emoji: string) => Promise<void> | void
  onRemoveReaction?: (messageId: string, emoji: string) => Promise<void> | void
  onDeleteMessage?: (messageId: string) => Promise<void> | void
}

export function ChatPanel({
  messages,
  reactions,
  currentAttendeeId,
  isAdmin,
  loading,
  readOnly,
  onSend,
  onAddReaction,
  onRemoveReaction,
  onDeleteMessage,
}: Props) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendFailed, setSendFailed] = useState(false)
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  // Whether the reader is at (or near) the newest message. Only then does a
  // new message pull the list down — someone scrolled up to re-read a question
  // used to be yanked back to the bottom by every message that arrived.
  const pinnedToBottom = useRef(true)
  const sentByMe = useRef(false)
  const [unseen, setUnseen] = useState(0)
  const lastCount = useRef(messages.length)

  useEffect(() => {
    const el = listRef.current
    const added = messages.length - lastCount.current
    lastCount.current = messages.length
    if (!el) return
    if (pinnedToBottom.current || sentByMe.current) {
      el.scrollTop = el.scrollHeight
      sentByMe.current = false
      setUnseen(0)
    } else if (added > 0) {
      setUnseen((n) => n + added)
    }
  }, [messages.length])

  function handleScroll() {
    const el = listRef.current
    if (!el) return
    pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    if (pinnedToBottom.current) setUnseen(0)
  }

  function jumpToLatest() {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    pinnedToBottom.current = true
    setUnseen(0)
  }

  // Escape closes an open reaction picker.
  useEffect(() => {
    if (!openPickerFor) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPickerFor(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openPickerFor])

  const reactionsByMessage = useMemo(() => {
    const map = new Map<string, ReactionRow[]>()
    for (const r of reactions) {
      const arr = map.get(r.message_id) ?? []
      arr.push(r)
      map.set(r.message_id, arr)
    }
    return map
  }, [reactions])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!onSend) return
    const trimmed = draft.trim()
    if (!trimmed) return
    setSending(true)
    setSendFailed(false)
    try {
      sentByMe.current = true
      await onSend(trimmed)
      setDraft('')
    } catch {
      // Keep the draft so nothing typed is lost, and say so — a failed send
      // used to leave the message sitting in the box with no word at all.
      sentByMe.current = false
      setSendFailed(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative flex h-full flex-col">
      <div
        ref={listRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Chat messages"
        className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm"
      >
        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-8 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            No messages yet. Say hi.
          </p>
        ) : (
          messages.map((m) => (
            <ChatBubble
              key={m.id}
              message={m}
              reactions={reactionsByMessage.get(m.id) ?? []}
              currentAttendeeId={currentAttendeeId}
              isAdmin={isAdmin}
              pickerOpen={openPickerFor === m.id}
              onTogglePicker={() =>
                setOpenPickerFor((cur) => (cur === m.id ? null : m.id))
              }
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
              onDeleteMessage={onDeleteMessage}
            />
          ))
        )}
      </div>
      {unseen > 0 && (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 flex justify-center',
            !readOnly && onSend ? (sendFailed ? 'bottom-20' : 'bottom-16') : 'bottom-3',
          )}
        >
          <button
            type="button"
            onClick={jumpToLatest}
            className="pointer-events-auto rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white shadow-md hover:bg-brand-700"
          >
            {unseen === 1 ? '1 new message' : `${unseen} new messages`} ↓
          </button>
        </div>
      )}
      {!readOnly && onSend && (
        <form className="border-t border-slate-200 dark:border-slate-800 p-2.5" onSubmit={handleSend}>
          {sendFailed && (
            <p role="alert" className="mb-2 text-xs text-red-700 dark:text-red-400">
              That message didn't send. Check your connection and try again.
            </p>
          )}
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                if (sendFailed) setSendFailed(false)
              }}
              placeholder="Say something kind…"
              aria-label="Chat message"
              maxLength={1000}
              disabled={sending}
            />
            <Button
              type="submit"
              disabled={sending || draft.trim().length === 0}
              size="icon"
              title="Send"
              aria-label="Send"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

interface ChatBubbleProps {
  message: MessageRow
  reactions: ReactionRow[]
  currentAttendeeId: string | null
  isAdmin: boolean
  pickerOpen: boolean
  onTogglePicker: () => void
  onAddReaction?: (messageId: string, emoji: string) => Promise<void> | void
  onRemoveReaction?: (messageId: string, emoji: string) => Promise<void> | void
  onDeleteMessage?: (messageId: string) => Promise<void> | void
}

function ChatBubble({
  message,
  reactions,
  currentAttendeeId,
  isAdmin,
  pickerOpen,
  onTogglePicker,
  onAddReaction,
  onRemoveReaction,
  onDeleteMessage,
}: ChatBubbleProps) {
  const mine =
    currentAttendeeId !== null && message.attendee_id === currentAttendeeId
  const deleted = message.deleted_at !== null

  const grouped = useMemo(() => {
    const counts = new Map<string, { count: number; mine: boolean }>()
    for (const r of reactions) {
      const entry = counts.get(r.emoji) ?? { count: 0, mine: false }
      entry.count += 1
      if (currentAttendeeId !== null && r.attendee_id === currentAttendeeId) {
        entry.mine = true
      }
      counts.set(r.emoji, entry)
    }
    return Array.from(counts.entries()).map(([emoji, { count, mine }]) => ({
      emoji,
      count,
      mine,
    }))
  }, [reactions, currentAttendeeId])

  function handlePickEmoji(emoji: string) {
    onTogglePicker()
    const existing = grouped.find((g) => g.emoji === emoji)
    if (existing?.mine) {
      onRemoveReaction?.(message.id, emoji)
    } else {
      onAddReaction?.(message.id, emoji)
    }
  }

  if (deleted) {
    return (
      <div className={mine ? 'text-right' : ''}>
        <span className="inline-block max-w-[85%] rounded-xl bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs italic text-slate-400">
          message removed
        </span>
      </div>
    )
  }

  return (
    <div className={cn('group', mine ? 'text-right' : 'text-left')}>
      <div
        className={cn(
          'mb-0.5 flex items-center gap-2 text-[11px] font-medium',
          mine ? 'justify-end text-slate-500 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400',
        )}
      >
        <span className="truncate max-w-[180px]">
          {message.author_name ?? 'Guest'}
        </span>
      </div>
      <div className={cn('inline-flex items-end gap-1', mine && 'flex-row-reverse')}>
        <div
          className={cn(
            'inline-block max-w-[85%] rounded-xl px-3 py-1.5 text-left text-[13px] leading-snug break-words',
            mine ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
          )}
        >
          {message.content}
        </div>
        {/* Hover-revealed on a mouse; always shown on touch screens (which
            have no hover, so the buttons were invisible there) and whenever
            keyboard focus is inside the message. */}
        <div className="relative flex items-center opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
          <button
            type="button"
            onClick={onTogglePicker}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
            title="React"
            aria-label="React to this message"
            aria-expanded={pickerOpen}
          >
            <Smile className="h-3.5 w-3.5" />
          </button>
          {isAdmin && onDeleteMessage && (
            <button
              type="button"
              onClick={() => onDeleteMessage(message.id)}
              className="rounded-full p-1 text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400"
              title="Delete (admin)"
              aria-label="Delete this message"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {pickerOpen && (
            <div
              className={cn(
                'absolute z-20 flex gap-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 shadow-md',
                mine ? 'right-full mr-1' : 'left-full ml-1',
                'top-1/2 -translate-y-1/2',
              )}
            >
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handlePickEmoji(emoji)}
                  className="hover:scale-125 transition-transform text-base leading-none p-0.5"
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {grouped.length > 0 && (
        <div
          className={cn(
            'mt-1 flex flex-wrap gap-1 text-xs',
            mine ? 'justify-end' : 'justify-start',
          )}
        >
          {grouped.map(({ emoji, count, mine: isMine }) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handlePickEmoji(emoji)}
              aria-pressed={isMine}
              aria-label={`${emoji} ${count}${isMine ? ', including yours' : ''}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition',
                isMine
                  ? 'border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              <span>{emoji}</span>
              <span className="text-[10px] font-medium">{count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

