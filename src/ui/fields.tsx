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

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '~/lib/cn'
import { Icon } from './Icon'

/**
 * What every control in the app is drawn as, minus its height.
 *
 * Split from the height because a textarea is the one control that is not
 * `h-control` high, and `cn` joins rather than merges — a taller class passed
 * in alongside `h-control` is a coin toss decided by CSS order, not by which
 * one was written last (see `lib/cn.ts`).
 */
const CONTROL_FACE = cn(
  'w-full rounded-sm border border-line-strong bg-surface px-3.5 text-body text-ink',
  'placeholder:text-ink-faint',
  // Hover firms the border, focus turns it leaf. Both set `border-color`, and
  // focus wins because Tailwind emits it after hover — so a focused field
  // stays leaf while the cursor is over it.
  'warm hover:border-ink-faint',
  'focus:border-leaf focus:outline-none',
)

/**
 * The standard control.
 *
 * Exported because one of them is not an `<input>` at all: the date field is a
 * button that opens the app's own picker, and it has to be indistinguishable
 * from the fields either side of it.
 */
export const CONTROL = cn('h-control', CONTROL_FACE)

// --- wrapper ----------------------------------------------------------------

export function Label({
  children,
  htmlFor,
  id,
}: {
  children: ReactNode
  htmlFor?: string
  id?: string
}) {
  return (
    <label id={id} htmlFor={htmlFor} className="text-label uppercase text-ink-muted">
      {children}
    </label>
  )
}

export function Field({
  label,
  hint,
  htmlFor,
  labelId,
  className,
  children,
}: {
  label?: string
  /** One line under the control explaining a rule, not repeating the label. */
  hint?: ReactNode
  htmlFor?: string
  /** For a control `<label for>` cannot reach — a button, say — which names
   *  itself with `aria-labelledby` pointing back here instead. */
  labelId?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? <Label id={labelId} htmlFor={htmlFor}>{label}</Label> : null}
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

/**
 * Several lines rather than one, for anything a person writes in sentences.
 *
 * The same border, ground and 16px floor as every other control — only the
 * height is its own, since a note is not one line high.
 */
export function TextAreaField({
  label,
  hint,
  fieldClassName,
  className,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> & {
  label?: string
  hint?: ReactNode
  fieldClassName?: string
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id} className={fieldClassName}>
      <textarea
        id={id}
        className={cn(CONTROL_FACE, 'h-28 resize-none py-3 leading-6', className)}
        {...rest}
      />
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
              'warm flex-1 text-body',
              index > 0 ? 'border-l border-line-strong' : '',
              value === option.value
                ? 'bg-ink font-semibold text-paper hover:bg-ink-deep'
                : 'text-ink hover:bg-sunk',
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
        className="group flex min-h-control items-center justify-between gap-4 text-left"
      >
        <span className="text-body text-ink">{label}</span>
        <span
          className={cn(
            'warm flex h-8 w-13 shrink-0 items-center rounded-full px-[3px]',
            checked
              ? 'bg-leaf group-hover:bg-leaf-deep'
              : 'bg-line-strong group-hover:bg-ink-faint',
          )}
        >
          {/* 52px track, 3px of padding either side, a 26px knob: 20px of
              travel. It used to swap `justify-start` for `justify-end`, which
              is not a property anything can animate, so the knob arrived
              before the colour did. */}
          <span
            className={cn(
              'size-6.5 rounded-full bg-surface transition-transform duration-200 ease-grow',
              'motion-reduce:transition-none',
              checked ? 'translate-x-5' : 'translate-x-0',
            )}
          />
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
      className={cn('group flex h-touch items-center gap-3 text-left', className)}
    >
      <span
        className={cn(
          'warm flex size-6 shrink-0 items-center justify-center rounded-sm border',
          checked
            ? 'border-water bg-water text-on-accent group-hover:border-water-deep group-hover:bg-water-deep'
            : 'border-line-strong group-hover:border-ink-faint group-hover:bg-sunk',
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
