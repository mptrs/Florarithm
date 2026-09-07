/**
 * The stand-in for a photograph, drawn rather than photographed.
 *
 * A plant with no picture gets the plate rather than a grey box with a camera
 * in it, so it still looks like it belongs in the book. It matters twice as
 * much in the collection grid as it does on the plant page: one grey rectangle
 * is a gap, a dozen of them is a broken screen.
 *
 * It fills whatever box it is given, at any size — the strokes are the same
 * weight in a 40px thumbnail as in a full-width hero, which is the point of
 * drawing it rather than shipping an image.
 */
export function Plate() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 160"
      preserveAspectRatio="xMidYMid slice"
      className="size-full text-line-strong"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5">
        <path d="M120 148c-26 0-46-22-46-52 0-34 22-62 46-84 24 22 46 50 46 84 0 30-20 52-46 52Z" />
        <path d="M120 148V22" />
        <path d="M120 60c-10-6-20-10-32-11M120 60c10-6 20-10 32-11" />
        <path d="M120 92c-13-7-26-11-40-12M120 92c13-7 26-11 40-12" />
        <path d="M120 124c-11-6-22-9-34-10M120 124c11-6 22-9 34-10" />
      </g>
    </svg>
  )
}
