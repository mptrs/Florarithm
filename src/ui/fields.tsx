/**
 * Form controls.
 *
 * One cohesive module, because they only make sense together: they share the
 * label, the height, the ring and the 16px floor. Every control here is
 * `h-control` (48px) and `text-body` (16px) — anything smaller and Safari zooms
 * the page in on focus and never zooms back out.
 *
 * `SuggestField` is the one that matters most. Places, mediums and fertilizers
 * are growing lists: what you type for the first plant is there to pick for the
 * second. That is the difference between an app you fill in and an app you use.
 */

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '~/lib/cn'
import { Icon } from './Icon'

const CONTROL = cn(
  'h-control w-full rounded-sm border border-line-strong bg-surface px-3.5 text-body text-ink',
  'placeholder:text-ink-faint',
  'focus:border-leaf focus:outline-none',
)

// --- wrapper ----------------------------------------------------------------

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-label uppercase text-ink-muted">
      {children}
    </label>
  )
}

export function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label?: string
  /** One line under the control explaining a rule, not repeating the label. */
  hint?: ReactNode
  htmlFor?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {hint ? <p className="text-[0.8125rem] leading-5 text-ink-muted">{hint}</p> : null}
    </div>
  )
}

// --- text -------------------------------------------------------------------

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: string
  hint?: ReactNode
  /** Placement only. */
  fieldClassName?: string
}

export function TextField({ label, hint, fieldClassName, className, ...rest }: TextFieldProps) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id} className={fieldClassName}>
      <input id={id} type="text" className={cn(CONTROL, className)} {...rest} />
    </Field>
  )
}

/**
 * A text input backed by a growing list. Typing and picking both work, which is
 * what `<datalist>` gives natively in Safari on both devices.
 */
export function SuggestField({
  label,
  hint,
  options,
  fieldClassName,
  className,
  ...rest
}: TextFieldProps & { options: readonly string[] }) {
  const id = useId()
  const listId = `${id}-options`

  return (
    <Field label={label} hint={hint} htmlFor={id} className={fieldClassName}>
      <input id={id} type="text" list={listId} className={cn(CONTROL, className)} {...rest} />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </Field>
  )
}

/** A number with its unit shown inside the field, so the value stays numeric. */
export function NumberField({
  label,
  hint,
  unit,
  fieldClassName,
  className,
  ...rest
}: TextFieldProps & { unit?: string }) {
  const id = useId()

  return (
    <Field label={label} hint={hint} htmlFor={id} className={fieldClassName}>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={cn(CONTROL, 'font-mono', unit ? 'pr-12' : '', className)}
          {...rest}
        />
        {unit ? (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[0.875rem] text-ink-faint">
            {unit}
          </span>
        ) : null}
      </div>
    </Field>
  )
}

export function DateField({ label, hint, fieldClassName, className, ...rest }: TextFieldProps) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id} className={fieldClassName}>
      <input id={id} type="date" className={cn(CONTROL, 'font-mono', className)} {...rest} />
    </Field>
  )
}

// --- choice -----------------------------------------------------------------

export function SelectField({
  label,
  hint,
  fieldClassName,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: ReactNode
  fieldClassName?: string
}) {
  const id = useId()

  return (
    <Field label={label} hint={hint} htmlFor={id} className={fieldClassName}>
      <div className="relative">
        <select id={id} className={cn(CONTROL, 'appearance-none pr-11', className)} {...rest}>
          {children}
        </select>
        <Icon
          name="chevronDown"
          className="pointer-events-none absolute inset-y-0 right-3.5 my-auto text-ink-muted"
        />
      </div>
    </Field>
  )
}

export type SegmentedOption<T extends string> = { value: T; label: string }

/** For a short, fixed set where seeing all the options at once is the point. */
export function SegmentedField<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  className,
}: {
  label?: string
  hint?: ReactNode
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex h-control overflow-hidden rounded-sm border border-line-strong"
      >
        {options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 text-body transition-colors',
              index > 0 ? 'border-l border-line-strong' : '',
              value === option.value ? 'bg-ink font-semibold text-paper' : 'text-ink',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Field>
  )
}

/** A switch. The whole row is the hit area, so the 32px track is fine. */
export function ToggleField({
  label,
  hint,
  checked,
  onChange,
  className,
}: {
  label: string
  hint?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="flex min-h-control items-center justify-between gap-4 text-left"
      >
        <span className="text-body text-ink">{label}</span>
        <span
          className={cn(
            'flex h-8 w-13 shrink-0 items-center rounded-full px-[3px] transition-colors',
            checked ? 'justify-end bg-leaf' : 'justify-start bg-line-strong',
          )}
        >
          <span className="size-6.5 rounded-full bg-surface" />
        </span>
      </button>
      {hint ? <p className="text-[0.8125rem] leading-5 text-ink-muted">{hint}</p> : null}
    </div>
  )
}

/** A checkbox row, for the "flushed the pot first" kind of question. */
export function CheckField({
  label,
  checked,
  onChange,
  className,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('flex h-touch items-center gap-3 text-left', className)}
    >
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-sm border transition-colors',
          checked ? 'border-water bg-water text-on-accent' : 'border-line-strong',
        )}
      >
        {checked ? <Icon name="check" size={15} className="stroke-[3]" /> : null}
      </span>
      <span className="text-body text-ink">{label}</span>
    </button>
  )
}

export function SearchField({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative', className)}>
      <Icon
        name="search"
        size={17}
        className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-ink-faint"
      />
      <input type="search" className={cn(CONTROL, 'pl-11')} {...rest} />
    </div>
  )
}
