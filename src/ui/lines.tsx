/**
 * Fields written on a line, the way a herbarium label is written.
 *
 * The plant's own sheets — what it is, where it lives, where it came from —
 * set their fields as blanks to write on rather than boxes: the value on a
 * hairline, its name printed small underneath. A box on a surface-coloured
 * sheet is a surface on a surface; a line is what a label has. The name of the
 * plant is set large, in the serif, because that is how the label sets it.
 *
 * The same controls as `fields.tsx` underneath — a real input, the 16px floor,
 * the leaf focus — with only the face changed. `SuggestField` takes the same
 * face with `face="line"`, so every list the box fields had is still here.
 */

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "~/lib/cn";
import { Icon } from "./Icon";

export type LineSize = "big" | "mid" | "body";

/** The type a line is written in, by size. The name of the plant is `big`. */
export const LINE_TYPE: Record<LineSize, string> = {
  big: "font-display text-[1.875rem] leading-10 font-medium tracking-[-0.015em]",
  mid: "font-display text-[1.3125rem] leading-7 font-medium",
  body: "text-body",
};

/** The hairline and what it does on hover and focus — one rule for every line. */
export const LINE_FACE = cn(
  "relative flex w-full items-end gap-2 border-b border-line-strong bg-transparent pb-2",
  "warm hover:border-ink-faint focus-within:border-leaf focus-within:shadow-[0_1px_0_var(--color-leaf)]",
);

/** The small printed caption under a line. */
export function Caption({
  children,
  htmlFor,
  id,
}: {
  children: ReactNode;
  htmlFor?: string;
  id?: string;
}) {
  const className =
    "text-[0.6875rem] leading-4 font-semibold tracking-[0.1em] text-ink-faint uppercase";
  // A label only where there is a control to name; a set of options is named
  // by `aria-labelledby` pointing here instead.
  return htmlFor ? (
    <label id={id} htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ) : (
    <span id={id} className={className}>
      {children}
    </span>
  );
}

/** A line and its caption, and a hint under both when a rule needs saying. */
export function LineField({
  caption,
  htmlFor,
  captionId,
  hint,
  className,
  children,
}: {
  caption?: string;
  htmlFor?: string;
  captionId?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      {children}
      {caption ? (
        <Caption htmlFor={htmlFor} id={captionId}>
          {caption}
        </Caption>
      ) : null}
      {hint ? (
        <p className="text-[0.8125rem] leading-5 text-ink-muted text-pretty">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type LineInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  caption?: string;
  hint?: ReactNode;
  size?: LineSize;
  /** `cm`, `€`: after the value, in the caption's grey. */
  unit?: string;
  /** Figures: a pot size, a price. */
  mono?: boolean;
  invalid?: boolean;
  fieldClassName?: string;
};

export function LineInput({
  caption,
  hint,
  size = "body",
  unit,
  mono = false,
  invalid = false,
  fieldClassName,
  className,
  ...rest
}: LineInputProps) {
  const id = useId();
  return (
    <LineField
      caption={caption}
      htmlFor={id}
      hint={hint}
      className={fieldClassName}
    >
      <div
        className={cn(LINE_FACE, invalid && "border-ember hover:border-ember")}
      >
        <input
          id={id}
          aria-invalid={invalid || undefined}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-faint",
            LINE_TYPE[size],
            mono && "font-mono text-body",
            className,
          )}
          {...rest}
        />
        {unit ? (
          <span className="shrink-0 text-[0.875rem] text-ink-faint">
            {unit}
          </span>
        ) : null}
      </div>
    </LineField>
  );
}

/** A few lines of prose — a note — written on ruled paper rather than in a box. */
export function LineTextArea({
  caption,
  fieldClassName,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  caption?: string;
  fieldClassName?: string;
}) {
  const id = useId();
  return (
    <LineField caption={caption} htmlFor={id} className={fieldClassName}>
      <div className={LINE_FACE}>
        <textarea
          id={id}
          rows={3}
          className={cn(
            "min-w-0 flex-1 resize-none bg-transparent text-body leading-6 text-ink outline-none placeholder:text-ink-faint",
            className,
          )}
          {...rest}
        />
      </div>
    </LineField>
  );
}

type LineSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  caption: string;
  size?: LineSize;
  fieldClassName?: string;
};

export function LineSelect({
  caption,
  size = "body",
  fieldClassName,
  className,
  children,
  ...rest
}: LineSelectProps) {
  const id = useId();
  return (
    <LineField caption={caption} htmlFor={id} className={fieldClassName}>
      <div className={LINE_FACE}>
        <select
          id={id}
          className={cn(
            "min-w-0 flex-1 appearance-none bg-transparent pr-6 text-ink outline-none",
            LINE_TYPE[size],
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <Icon
          name="chevronDown"
          size={16}
          className="pointer-events-none absolute right-0 bottom-3 text-ink-faint"
        />
      </div>
    </LineField>
  );
}

/**
 * A short fixed set, printed on the label to be ticked: the system, the
 * status, trade or gift. Radios, so the arrow keys walk them.
 *
 * `clearable` lets the ticked one be unticked — Trade and Gift are a choice
 * you can leave empty, and empty is what "bought" is.
 */
export function LineOptions<T extends string>({
  caption,
  options,
  value,
  onChange,
  clearable = false,
  className,
}: {
  caption?: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
  clearable?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="radiogroup"
        aria-labelledby={caption ? id : undefined}
        className="flex flex-wrap gap-x-6 gap-y-1"
      >
        {options.map((option) => {
          const on = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(on && clearable ? null : option.value)}
              className={cn(
                "warm group flex min-h-touch items-center gap-2 text-[0.9375rem]",
                on ? "font-semibold text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-4 shrink-0 rounded-full transition-[border-width] duration-150",
                  on
                    ? "border-[5px] border-ink"
                    : "border-[1.5px] border-line-strong group-hover:border-ink-faint",
                )}
              />
              {option.label}
            </button>
          );
        })}
      </div>
      {caption ? <Caption id={id}>{caption}</Caption> : null}
    </div>
  );
}

/** A fact that is simply true or not: from tissue culture. */
export function LineCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="warm group flex min-h-touch items-center gap-3 text-[0.9375rem] text-ink"
    >
      <span
        aria-hidden
        className={cn(
          "flex size-[1.125rem] shrink-0 items-center justify-center rounded-sm border-[1.5px]",
          checked
            ? "border-leaf bg-leaf text-on-accent"
            : "border-line-strong bg-surface group-hover:border-ink-faint",
        )}
      >
        {checked ? (
          <Icon name="check" size={13} className="stroke-[3]" />
        ) : null}
      </span>
      {label}
    </button>
  );
}

/**
 * The sheet number: the plant's code, printed where a label prints its own.
 * Before the plant exists it shows the three letters the genus will give it
 * and dots for the four that are drawn on Add.
 */
export function CodeLine({ code, prefix }: { code?: string; prefix?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[0.6875rem] font-semibold tracking-[0.1em] text-ink-faint uppercase">
        No.
      </span>
      <span className="font-mono text-[0.9375rem] font-medium tracking-[0.1em] text-ink">
        {code ?? (
          <>
            {prefix || "···"}-<span className="text-ink-faint">····</span>
          </>
        )}
      </span>
      <span className="text-[0.8125rem] text-ink-faint">
        {code ? "on the sticker" : "drawn when you add it"}
      </span>
    </div>
  );
}
