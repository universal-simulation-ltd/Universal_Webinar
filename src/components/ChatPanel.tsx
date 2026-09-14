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
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  // Stick to bottom when new messages arrive.
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

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
    try {
      await onSend(trimmed)
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={listRef}
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
      {!readOnly && onSend && (
        <form className="border-t border-slate-200 dark:border-slate-800 p-2.5" onSubmit={handleSend}>
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Say something kind…"
              maxLength={1000}
              disabled={sending}
            />
            <Button
              type="submit"
              disabled={sending || draft.trim().length === 0}
              size="icon"
              title="Send"
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
        <div className="relative flex items-center opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={onTogglePicker}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
            title="React"
          >
            <Smile className="h-3.5 w-3.5" />
          </button>
          {isAdmin && onDeleteMessage && (
            <button
              type="button"
              onClick={() => onDeleteMessage(message.id)}
              className="rounded-full p-1 text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400"
              title="Delete (admin)"
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

