/**
 * A field you can type into or look down.
 *
 * It replaced a `<datalist>`, which only ever answered the question "how is
 * the thing I am already spelling spelled?". Half the time you do not know the
 * name — you know the place when you see it, the medium when you see it, the
 * plant when you see it — so the list opens on focus, whole, and narrows as you
 * type rather than appearing only once you have.
 *
 * The list comes in labelled groups because a row can mean different things
 * from the same field: under Genus, picking "Monstera" fills in a genus, while
 * picking Gruyère fills in everything Gruyère is. The group label says which
 * before you tap, so neither needs a button of its own.
 *
 * Two modes, decided by whether `onChange` is given:
 * - free (`onChange`): what you type is the value, and a row just types it for
 *   you. Places, mediums, names — anything a new word is welcome in.
 * - pick (no `onChange`): typing only searches, and the value changes only by
 *   picking a row. The parent plant, which has to be a plant you have.
 */

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Field } from './fields'
import { Icon } from './Icon'

export type Suggestion = {
  key: string
  /** What the row matches on and, in a free field, what picking it types. */
  value: string
  /** The serif line, when it is not simply the value. */
  title?: string
  /** A genus, a species — anything a specimen label would set in italic. */
  italic?: boolean
  /** A second, smaller line: a full name, the kind of thing it is. */
  detail?: string
  detailItalic?: boolean
  /** A count or a code, in mono at the end of the row. */
  meta?: string
  leading?: ReactNode
  /** More text to match against — the detail is not matched unless it is
   *  repeated here. */
  search?: string
  /** Shown whatever is typed — "every plant matching", say. */
  always?: boolean
  /** A way out rather than a value: "not propagated from one of yours". */
  muted?: boolean
  selected?: boolean
  onPick?: () => void
}

export type SuggestGroup = {
  /** Empty for a group that is only a rule and its rows. */
  label: string
  items: readonly Suggestion[]
  /** Only before anything is typed — "used last" would only repeat rows. */
  untilTyping?: boolean
  /** Only once something is typed — too long a list to browse. */
  whileTyping?: boolean
}

type Props = {
  label?: string
  hint?: ReactNode
  'aria-label'?: string
  value: string
  onChange?: (value: string) => void
  groups: readonly SuggestGroup[]
  /** "Add as a new place": offered when what is typed is not on the list. */
  addLabel?: string
  placeholder?: string
  disabled?: boolean
  /** In front of the text: the search glyph, or a filter already chosen. */
  leading?: ReactNode
  /** Whether a chevron says the list is there to be looked down. */
  browse?: boolean
  /** Which edge the list hangs from, for a field in the right-hand column
   *  whose list is wider than itself. */
  align?: 'start' | 'end'
  /** Backspace in an empty field: takes back the last filter. */
  onBackspaceEmpty?: () => void
  fieldClassName?: string
}

type Row =
  | { kind: 'add'; id: string; index: number }
  | { kind: 'item'; id: string; index: number; item: Suggestion }

export function SuggestField({
  label,
  hint,
  'aria-label': ariaLabel,
  value,
  onChange,
  groups,
  addLabel,
  placeholder,
  disabled,
  leading,
  browse = true,
  align = 'start',
  onBackspaceEmpty,
  fieldClassName,
}: Props) {
  const id = useId()
  const listId = `${id}-list`
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  /** What has been typed since the list opened; null until something has, so
   *  a field that already holds a value still opens on the whole list. */
  const [query, setQuery] = useState<string | null>(null)
  const [active, setActive] = useState(-1)

  const free = onChange !== undefined
  const needle = (query ?? '').trim().toLowerCase()
  const typing = needle !== ''

  const shown = groups
    .filter((group) => (typing ? !group.untilTyping : !group.whileTyping))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.always || !typing || matches(item, needle)),
    }))
    .filter((group) => group.items.length > 0)

  const exact = groups.some((group) =>
    group.items.some((item) => item.value.trim().toLowerCase() === needle),
  )
  const offerAdd = free && addLabel !== undefined && typing && !exact

  // Numbered straight through the groups, so the arrow keys walk one list.
  const addRow: Row | null = offerAdd ? { kind: 'add', id: `${id}-add`, index: 0 } : null
  let next = addRow ? 1 : 0
  const grouped = shown.map((group, g) => ({
    ...group,
    rows: group.items.map(
      (item, i): Row & { kind: 'item' } => ({
        kind: 'item',
        id: `${id}-${g}-${i}`,
        index: next++,
        item,
      }),
    ),
  }))
  const rows: Row[] = [...(addRow ? [addRow] : []), ...grouped.flatMap((group) => group.rows)]
  const visible = open && rows.length > 0

  function show() {
    if (disabled) return
    setOpen(true)
    setQuery(null)
    setActive(-1)
  }

  function close() {
    setOpen(false)
    setQuery(null)
    setActive(-1)
  }

  function pick(row: Row) {
    if (row.kind === 'add') {
      onChange?.((query ?? value).trim())
    } else if (row.item.onPick) {
      row.item.onPick()
    } else if (free) {
      onChange(row.item.value)
    }
    close()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) return show()
      const step = event.key === 'ArrowDown' ? 1 : -1
      // -1 is the field itself: arrowing past either end comes back to it.
      setActive((current) => {
        const span = rows.length + 1
        return ((current + 1 + step + span) % span) - 1
      })
      return
    }
    const chosen = visible ? rows[active] : undefined
    if (event.key === 'Enter' && chosen) {
      // Picking, not submitting the form the field happens to sit in.
      event.preventDefault()
      pick(chosen)
      return
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'Backspace' && event.currentTarget.value === '' && onBackspaceEmpty) {
      onBackspaceEmpty()
    }
  }

  // In pick mode the text is a search while the list is open and the chosen
  // value's name while it is closed; free, the text is the value throughout.
  const text = free ? value : open ? (query ?? '') : value

  const control = (
    <div
      className={cn(
        'relative flex h-control w-full items-center gap-2 rounded-sm border bg-surface px-4',
        'warm',
        disabled
          ? 'cursor-not-allowed border-line bg-transparent'
          : open
            ? 'border-leaf'
            : 'border-line-strong hover:border-ink-faint focus-within:border-leaf',
        leading ? 'pl-3' : '',
      )}
      onClick={() => {
        if (document.activeElement !== input.current) input.current?.focus()
        else if (!open) show()
      }}
    >
      {leading}
      <input
        ref={input}
        id={id}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible && active >= 0 ? rows[active]?.id : undefined}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={text}
        placeholder={!free && open && value ? value : placeholder}
        onFocus={show}
        onBlur={close}
        onChange={(event) => {
          const next = event.target.value
          setOpen(true)
          setQuery(next)
          setActive(-1)
          if (free) onChange(next)
        }}
        onKeyDown={onKeyDown}
        className={cn(
          'h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none',
          'placeholder:text-ink-faint disabled:cursor-not-allowed disabled:text-ink-faint',
        )}
      />
      {browse ? (
        <Icon
          name="chevronDown"
          className={cn(
            'pointer-events-none shrink-0 text-ink-muted transition-transform duration-200 ease-grow',
            visible && 'rotate-180',
          )}
        />
      ) : null}

      {visible ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          // Keeps the focus in the field while a row is pressed, so the
          // press lands before the blur closes the list under it.
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            'absolute top-full z-30 mt-1 max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain',
            'rounded-lg border border-line bg-surface py-1 shadow-lg',
            'w-full min-w-[min(20rem,calc(100vw-2.5rem))]',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {addRow ? (
            <>
              <Option row={addRow} active={active === addRow.index} onPick={pick}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-leaf-tint text-leaf">
                  <Icon name="plus" size={16} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-display text-[1.125rem] leading-[1.375rem] font-medium">
                    “{(query ?? '').trim()}”
                  </span>
                  <span className="text-[0.8125rem] font-semibold text-leaf">{addLabel}</span>
                </span>
              </Option>
              {shown.length > 0 ? <div className="my-1 h-px bg-line" /> : null}
            </>
          ) : null}

          {grouped.map((group, g) => (
            <div key={`${group.label}-${g}`} role="group" aria-label={group.label || undefined}>
              {g > 0 ? <div className="my-1 h-px bg-line" /> : null}
              {group.label ? (
                <div className="px-4 pt-3 pb-1 text-[0.6875rem] leading-4 font-semibold tracking-[0.09em] text-ink-faint uppercase">
                  {group.label}
                </div>
              ) : null}
              {group.rows.map((row) => {
                const { item } = row
                return (
                <Option
                  key={item.key}
                  row={row}
                  active={active === row.index}
                  selected={item.selected}
                  onPick={pick}
                >
                  {item.leading}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={cn(
                        item.muted
                          ? 'text-[0.9375rem] text-ink-muted'
                          : 'truncate font-display text-[1.125rem] leading-[1.375rem] font-medium',
                        item.italic && 'italic',
                      )}
                    >
                      {item.muted ? item.title ?? item.value : <Marked text={item.title ?? item.value} needle={needle} />}
                    </span>
                    {item.detail ? (
                      <span
                        className={cn(
                          'truncate text-[0.8125rem] leading-[1.125rem] text-ink-muted',
                          item.detailItalic && 'font-display text-[0.875rem] italic',
                        )}
                      >
                        <Marked text={item.detail} needle={needle} />
                      </span>
                    ) : null}
                  </span>
                  {item.selected ? (
                    <Icon name="check" size={18} className="shrink-0 text-leaf" />
                  ) : null}
                  {item.meta ? (
                    <span className="shrink-0 font-mono text-micro text-ink-faint">{item.meta}</span>
                  ) : null}
                </Option>
                )
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )

  return (
    // `min-w-0`: an input has a width of its own (twenty characters) that a
    // flex row honours unless told not to, which squeezed the select beside
    // the cultivar down to "Nor".
    <Field label={label} hint={hint} htmlFor={id} className={cn('min-w-0', fieldClassName)}>
      {control}
    </Field>
  )
}

function Option({
  row,
  active,
  selected,
  onPick,
  children,
}: {
  row: Row
  active: boolean
  selected?: boolean
  onPick: (row: Row) => void
  children: ReactNode
}) {
  return (
    <div
      id={row.id}
      role="option"
      aria-selected={selected ?? false}
      onClick={() => onPick(row)}
      className={cn(
        'flex min-h-13 cursor-pointer items-center gap-3 px-4 py-2 text-ink',
        active ? 'bg-sunk' : 'hover:bg-sunk',
      )}
    >
      {children}
    </div>
  )
}

/** The typed part, set heavier, so you can see why each row is there. */
function Marked({ text, needle }: { text: string; needle: string }) {
  const at = needle ? text.toLowerCase().indexOf(needle) : -1
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <b className="font-semibold text-ink">{text.slice(at, at + needle.length)}</b>
      {text.slice(at + needle.length)}
    </>
  )
}

function matches(item: Suggestion, needle: string): boolean {
  // Not the detail: "Place" under every place would match everything you
  // type that starts "pla". A row that should match its second line says so
  // in `search`.
  return [item.value, item.title, item.search]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

// --- the vocabulary lists ---------------------------------------------------

export type Usage = { name: string; count: number }

/**
 * The two groups every place-like list opens on: the last couple you used, so
 * the common case is one tap, then all of them with how many plants each
 * holds — which is how you tell "Plant cabinet" from "Plant shelf" at a glance.
 */
export function usageGroups(
  all: readonly Usage[],
  recent: readonly string[],
  current: string,
  allLabel: string,
): SuggestGroup[] {
  const same = (a: string) => a.trim().toLowerCase() === current.trim().toLowerCase()
  const row = (usage: Usage): Suggestion => ({
    key: usage.name,
    value: usage.name,
    meta: plants(usage.count),
    selected: same(usage.name),
  })
  const byName = new Map(all.map((usage) => [usage.name, usage]))
  const last = recent.flatMap((name) => {
    const usage = byName.get(name)
    return usage ? [row(usage)] : []
  })

  return [
    // Not worth a group of its own until the full list is long enough to
    // have to look down.
    ...(all.length > 4 && last.length > 0
      ? [{ label: 'Used last', items: last, untilTyping: true }]
      : []),
    { label: allLabel, items: all.map(row) },
  ]
}

export function plants(count: number): string {
  return `${count} ${count === 1 ? 'plant' : 'plants'}`
}
