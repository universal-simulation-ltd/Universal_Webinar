import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import {
  type CustomQuestion,
  type CustomQuestionType,
  newQuestion,
  MAX_QUESTIONS,
  MAX_LABEL_LEN,
} from '@/lib/customQuestions'

// Host-side editor for a webinar's custom registration questions. Controlled:
// the parent owns the `CustomQuestion[]` and persists it (on create via the
// insert payload, on edit via update_webinar_by_token). Deliberately minimal —
// text / paragraph / dropdown, optional-or-required, and options for dropdowns.

interface Props {
  value: CustomQuestion[]
  onChange: (questions: CustomQuestion[]) => void
  /** Disable all controls while a save is in flight. */
  disabled?: boolean
}

const TYPE_LABELS: Record<CustomQuestionType, string> = {
  text: 'Short text',
  textarea: 'Paragraph',
  select: 'Dropdown',
}

const selectClass =
  'flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition'

export default function CustomQuestionsEditor({ value, onChange, disabled }: Props) {
  const update = (id: string, patch: Partial<CustomQuestion>) =>
    onChange(value.map((q) => (q.id === id ? { ...q, ...patch } : q)))

  const remove = (id: string) => onChange(value.filter((q) => q.id !== id))

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= value.length) return
    const copy = [...value]
    ;[copy[index], copy[next]] = [copy[next], copy[index]]
    onChange(copy)
  }

  const add = () => {
    if (value.length >= MAX_QUESTIONS) return
    onChange([...value, newQuestion()])
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-700">Registration questions</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Ask registrants a few extra questions when they sign up. Their answers appear in your
          registrations list.
        </p>
      </div>

      {value.length > 0 && (
        <ul className="space-y-3">
          {value.map((q, i) => (
            <li key={q.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col pt-2 text-slate-300">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={disabled || i === 0}
                    onClick={() => move(i, -1)}
                    className="disabled:opacity-30 hover:text-slate-500"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 space-y-2.5">
                  <Input
                    aria-label={`Question ${i + 1} label`}
                    value={q.label}
                    maxLength={MAX_LABEL_LEN}
                    disabled={disabled}
                    onChange={(e) => update(q.id, { label: e.target.value })}
                    placeholder="e.g. What's your company?"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      aria-label={`Question ${i + 1} type`}
                      value={q.type}
                      disabled={disabled}
                      onChange={(e) => update(q.id, { type: e.target.value as CustomQuestionType })}
                      className={`${selectClass} h-9 w-auto py-1 text-sm`}
                    >
                      {(Object.keys(TYPE_LABELS) as CustomQuestionType[]).map((t) => (
                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={q.required}
                        disabled={disabled}
                        onChange={(e) => update(q.id, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => remove(q.id)}
                      className="ml-auto inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                  {q.type === 'select' && (
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Options (one per line)</Label>
                      <textarea
                        aria-label={`Question ${i + 1} options`}
                        value={(q.options ?? []).join('\n')}
                        disabled={disabled}
                        onChange={(e) =>
                          update(q.id, {
                            options: e.target.value.split('\n').map((o) => o.trim()).filter(Boolean),
                          })
                        }
                        rows={3}
                        placeholder={'Option one\nOption two'}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {value.length < MAX_QUESTIONS && (
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={disabled}>
          <Plus className="mr-1.5 h-4 w-4" /> Add a question
        </Button>
      )}
    </div>
  )
}
