/**
 * The stand-in for a photograph, drawn rather than photographed.
 *
 * A plant with no picture gets the plate rather than a grey box with a camera
 * in it, so it still looks like it belongs in the book. It matters twice as
 * much in the collection grid as it does on the plant page: one grey rectangle
 * is a gap, a dozen of them is a broken screen.
 *
 * There is a portrait per genus for the genera this collection is made of, and
 * the drawn leaf behind them for everything else. The portrait is the small
 * picture that was already standing in for the photograph on the design
 * canvas: a wall, a shelf, a pot and the plant — because what a plate replaces
 * is a photograph of a plant on a shelf, and a line drawing of a leaf never
 * quite claimed to be one.
 *
 * A genus is the most any of these can honestly claim. Nothing here knows a
 * `crystallinum` from a `clarinervium`, and a portrait that pretended to would
 * be lying in a way a silhouette cannot. What it does say is true: this is an
 * Anthurium, it has heart-shaped leaves, it stands in a pot.
 *
 * What tells them apart is the habit, not the leaf — upright in a pot, hung
 * from above, spilling over a shelf edge, or climbing a pole. That reads at
 * 40px in a desktop row, where a leaf outline does not.
 *
 * Every drawing lives in the same 100×76 box and is sliced to whatever frame
 * it lands in — a 4:3 tile shows it whole, a 40px thumbnail keeps the middle
 * square, a wide hero keeps the middle band and crops the foot of the pot, the
 * way a photograph of the same shelf would. Colour comes from the `plate-*`
 * tokens, which carry both themes; nothing here branches on one.
 */

import type { ReactElement, ReactNode } from 'react'

// ── The parts every portrait is drawn from ───────────────────────────────────

/** A plain leaf, attached at the origin and reaching up-right from it. */
const LEAF = 'M0 0C7-13 24-15 32-6 26 5 9 9 0 0Z'
/** A heart, attached at the origin and standing above it. */
const HEART = 'M0 0C-10-6-16-16-12-24-8-31-2-30 0-26 2-30 8-31 12-24 16-16 10-6 0 0Z'
/** An arrowhead, the same way up. */
const ARROW = 'M0 0-8-11-5-27 0-33 5-27 8-11Z'
/** The pot, standing on the shelf, and its rim. */
const POT = 'M38 54h24l-3.2 17a3 3 0 0 1-3 2.6H44.2a3 3 0 0 1-3-2.6Z'
/** The same pot hung from above, higher up the wall and a size smaller. */
const HANGING_POT = 'M40 26h20l-2.6 14a3 3 0 0 1-3 2.6H45.6a3 3 0 0 1-3-2.6Z'

const GROUND = 'var(--color-plate-ground)'
const SHELF = 'var(--color-plate-shelf)'
const DEEP = 'var(--color-plate-leaf-deep)'
const MID = 'var(--color-plate-leaf)'
const LIGHT = 'var(--color-plate-leaf-light)'
const POT_FILL = 'var(--color-plate-pot)'
const RIM_FILL = 'var(--color-plate-pot-rim)'
const BARK = 'var(--color-plate-bark)'

/** Where a leaf goes: the point it is attached at, the angle it leaves at, and
 *  how big it is. Every leaf in every portrait is placed this way, so one leaf
 *  is one line to read. */
const at = (x: number, y: number, angle = 0, scale = 1) =>
  `translate(${x} ${y}) rotate(${angle}) scale(${scale})`

/**
 * The wall, the surface the pot stands on, and the safe area everything else
 * is drawn inside.
 *
 * The wall and the shelf are full-bleed: they are the picture's ground and
 * must reach whatever edge the frame has. The plant is not, and that is what
 * `KEEP` is for. A 4:3 tile shows the whole 100×76 box, a 40px thumbnail keeps
 * only the middle square, and the plant page's hero is twice as wide as it is
 * tall and keeps only a band across the middle. Drawn at full height, a plant
 * loses its top to one crop and its pot to another.
 *
 * So every portrait is drawn at full size and then set back into the band that
 * all three crops share — roughly y 14–62. It costs a little air in the tile
 * and buys a whole plant everywhere else.
 */
const KEEP = 0.727
const KEEP_X = 13.6
const KEEP_Y = 8.2

function Room({ children, shelf = 60 }: { children: ReactNode; shelf?: number | null }) {
  const line = shelf === null ? null : shelf * KEEP + KEEP_Y

  return (
    <>
      <rect width="100" height="76" fill={GROUND} />
      {line === null ? null : <rect y={line} width="100" height={76 - line} fill={SHELF} />}
      <g transform={`translate(${KEEP_X} ${KEEP_Y}) scale(${KEEP})`}>{children}</g>
    </>
  )
}

/** Stems, always the same weight and colour: they are the one part of a plant
 *  that is drawn rather than filled. */
function Stems({ d, width = 1.3 }: { d: readonly string[]; width?: number }) {
  return (
    <g stroke="var(--color-plate-stem)" strokeWidth={width} fill="none" strokeLinecap="round">
      {d.map((path) => (
        <path key={path} d={path} />
      ))}
    </g>
  )
}

function Pot({ d = POT, rim }: { d?: string; rim?: { x: number; y: number; w: number } }) {
  const bar = rim ?? { x: 35.2, y: 49, w: 29.6 }
  return (
    <>
      <path d={d} fill={POT_FILL} />
      <rect x={bar.x} y={bar.y} width={bar.w} height="6.2" rx="2" fill={RIM_FILL} />
    </>
  )
}

/** One leaf, placed — and, where a genus is bought for its markings, the
 *  markings with it. They are drawn inside the leaf's own frame rather than on
 *  the picture, which is the only way a splash cannot end up floating beside
 *  the leaf it belongs to. */
function Leaf({
  shape,
  fill,
  x,
  y,
  angle = 0,
  scale = 1,
  splashed = false,
}: {
  shape: string
  fill: string
  x: number
  y: number
  angle?: number
  scale?: number
  splashed?: boolean
}) {
  if (!splashed) return <path d={shape} fill={fill} transform={at(x, y, angle, scale)} />

  return (
    <g transform={at(x, y, angle, scale)}>
      <path d={shape} fill={fill} />
      <g fill={LIGHT} opacity="0.9">
        <ellipse cx="-6" cy="-15" rx="2.6" ry="1.6" transform="rotate(-34 -6 -15)" />
        <ellipse cx="5" cy="-19" rx="2.2" ry="1.4" transform="rotate(28 5 -19)" />
        <ellipse cx="-2" cy="-23" rx="1.8" ry="1.2" />
      </g>
    </g>
  )
}

// ── The genera ───────────────────────────────────────────────────────────────

const GENUS_PLATES: Record<string, ReactElement> = {
  /** Three hearts held upright on their own stalks. */
  anthurium: (
    <Room shelf={62}>
      <Stems d={['M50 54C44 46 38 40 32 34', 'M50 54C56 46 62 40 68 34', 'M50 54 50 30']} />
      <Leaf shape={HEART} fill={MID} x={32} y={34} angle={-24} scale={0.92} />
      <Leaf shape={HEART} fill={LIGHT} x={68} y={34} angle={22} scale={0.88} />
      <Leaf shape={HEART} fill={DEEP} x={50} y={30} />
      <Pot />
    </Room>
  ),

  /** Arrowheads on stems long enough to hold them above everything else. */
  alocasia: (
    <Room shelf={58}>
      <Stems
        d={['M50 54C44 42 40 32 36 24', 'M50 54C56 42 60 32 64 22', 'M50 54 50 18']}
        width={1.6}
      />
      <Leaf shape={ARROW} fill={MID} x={36} y={24} angle={-18} scale={0.95} />
      <Leaf shape={ARROW} fill={LIGHT} x={64} y={22} angle={16} scale={0.92} />
      <Leaf shape={ARROW} fill={DEEP} x={50} y={18} scale={1.02} />
      <Pot />
    </Room>
  ),

  /** Four broad leaves thrown wide — the one that takes up a whole corner. */
  monstera: (
    <Room>
      <Stems
        d={[
          'M50 54C46 40 38 30 26 22',
          'M50 54C54 38 62 28 74 20',
          'M50 54C50 40 49 28 49 16',
          'M50 54C44 44 34 38 22 38',
        ]}
        width={1.4}
      />
      <Leaf shape={LEAF} fill={MID} x={26} y={22} angle={196} scale={0.82} />
      <Leaf shape={LEAF} fill={LIGHT} x={74} y={20} angle={-28} scale={0.8} />
      <Leaf shape={LEAF} fill={DEEP} x={49} y={16} angle={-84} scale={0.74} />
      <Leaf shape={LEAF} fill={LIGHT} x={22} y={38} angle={170} scale={0.66} />
      <Pot />
    </Room>
  ),

  /** Hearts again, but on a stem that has decided to go somewhere: one up, the
   *  rest leaning out and over. Upright is an Anthurium; leaning is this. */
  philodendron: (
    <Room shelf={61}>
      <Stems
        d={[
          'M50 54C48 44 46 36 44 28',
          'M50 54C54 46 59 40 65 35',
          'M65 35C71 36 76 41 80 48',
          'M80 48C82 53 82 57 80 61',
        ]}
      />
      <Leaf shape={HEART} fill={DEEP} x={44} y={28} angle={-12} scale={0.95} />
      <Leaf shape={HEART} fill={MID} x={65} y={35} angle={34} scale={0.86} />
      <Leaf shape={HEART} fill={LIGHT} x={80} y={48} angle={118} scale={0.74} />
      <Leaf shape={HEART} fill={MID} x={80} y={61} angle={166} scale={0.66} />
      <Pot />
    </Room>
  ),

  /** Hung from above, and trailing past the shelf it never stood on. */
  epipremnum: (
    <Room shelf={null}>
      <Stems d={['M50 -40 50 22']} width={1} />
      <Pot d={HANGING_POT} rim={{ x: 37.6, y: 22, w: 24.8 }} />
      <Stems d={['M44 42C40 54 40 64 42 76', 'M57 42C61 54 62 66 60 76']} />
      <Leaf shape={HEART} fill={MID} x={41} y={52} angle={-104} scale={0.58} />
      <Leaf shape={HEART} fill={DEEP} x={40} y={63} angle={-88} scale={0.52} />
      <Leaf shape={HEART} fill={LIGHT} x={42} y={74} angle={-112} scale={0.48} />
      <Leaf shape={HEART} fill={LIGHT} x={60} y={53} angle={104} scale={0.58} />
      <Leaf shape={HEART} fill={MID} x={62} y={65} angle={86} scale={0.52} />
      <Leaf shape={HEART} fill={DEEP} x={60} y={75} angle={110} scale={0.46} />
      <Leaf shape={HEART} fill={DEEP} x={43} y={21} angle={-32} scale={0.6} />
      <Leaf shape={HEART} fill={LIGHT} x={57} y={20} angle={30} scale={0.6} />
    </Room>
  ),

  /** Standing on the shelf and pouring over its front edge, every leaf
   *  splashed — the one thing a Scindapsus is bought for. */
  scindapsus: (
    <Room shelf={57}>
      <Pot />
      <Stems d={['M42 53C32 56 27 63 27 73', 'M58 53C68 56 73 63 73 73']} />
      <Leaf shape={HEART} fill={MID} x={30} y={60} angle={-108} scale={0.58} splashed />
      <Leaf shape={HEART} fill={DEEP} x={27} y={71} angle={-92} scale={0.5} />
      <Leaf shape={HEART} fill={LIGHT} x={70} y={61} angle={108} scale={0.58} splashed />
      <Leaf shape={HEART} fill={MID} x={73} y={72} angle={92} scale={0.5} />
      <Leaf shape={HEART} fill={DEEP} x={44} y={47} angle={-30} scale={0.78} splashed />
      <Leaf shape={HEART} fill={MID} x={57} y={46} angle={28} scale={0.78} splashed />
      <Leaf shape={HEART} fill={LIGHT} x={50} y={41} angle={-2} scale={0.68} splashed />
    </Room>
  ),

  /** Up a pole, in leaves cut to the midrib: the Monstera that stayed small. */
  rhaphidophora: (
    <Room>
      <rect x="47" y="8" width="6" height="46" rx="3" fill={BARK} />
      <Stems d={['M50 46 40 43', 'M50 35 60 32', 'M50 25 40 22', 'M50 15 60 13']} width={1.2} />
      {/* The same leaf Monstera is drawn with, at half the size. That is not a
          shortcut — it is what the plant is, and what it is sold as. */}
      <Leaf shape={LEAF} fill={MID} x={40} y={43} angle={188} scale={0.46} />
      <Leaf shape={LEAF} fill={LIGHT} x={60} y={32} angle={-14} scale={0.44} />
      <Leaf shape={LEAF} fill={DEEP} x={40} y={22} angle={182} scale={0.42} />
      <Leaf shape={LEAF} fill={MID} x={60} y={13} angle={-20} scale={0.4} />
      <Pot />
    </Room>
  ),

  /** Paired oval leaves down two long strands, and the umbel hanging under
   *  them — the only plate with a flower in it, because it is the only one of
   *  these you notice by its flower. */
  hoya: (
    <Room shelf={59}>
      <Pot />
      <Stems d={['M45 52C34 52 25 58 21 69', 'M56 52C68 52 77 58 82 67']} width={1.2} />
      {[
        [31, 55, -34],
        [22, 64, -14],
        [67, 56, 32],
        [78, 64, 14],
        [45, 45, -42],
        [56, 44, 40],
      ].map(([x, y, tilt]) => (
        <g key={`${x},${y}`} transform={`translate(${x} ${y}) rotate(${tilt})`}>
          <ellipse cx="-5.6" cy="0" rx="5.2" ry="3.4" fill={MID} />
          <ellipse cx="5.6" cy="0" rx="5.2" ry="3.4" fill={DEEP} />
        </g>
      ))}
      {/* The umbel: a peduncle off the left strand and a ball of florets, each
          one a circle, because that is what it looks like and drawing it as a
          blob would only look like a mistake. */}
      <Stems d={['M27 58C28 62 29 64 30 66']} width={1.1} />
      {[0, 51, 103, 154, 206, 257, 309].map((angle) => (
        <circle
          key={angle}
          cx={30 + 4.4 * Math.cos((angle * Math.PI) / 180)}
          cy={70 + 4.4 * Math.sin((angle * Math.PI) / 180)}
          r="2.2"
          fill={LIGHT}
        />
      ))}
      <circle cx="30" cy="70" r="1.8" fill={RIM_FILL} />
    </Room>
  ),
}

/** Everything the app has never drawn: a plant in a pot, and nothing said
 *  about which. It is drawn in the same room as the eight because a grid where
 *  half the plates are pictures and half are outlines reads as half of it
 *  failing to load — and because "a plant, in a pot" is the one claim that is
 *  true of everything on the shelf. */
const ANY = (
  <Room>
    <Stems d={['M50 54C46 44 42 38 36 31', 'M50 54C54 44 58 38 64 31', 'M50 54 50 27']} />
    <Leaf shape={LEAF} fill={MID} x={36} y={31} angle={192} scale={0.62} />
    <Leaf shape={LEAF} fill={LIGHT} x={64} y={31} angle={-24} scale={0.6} />
    <Leaf shape={LEAF} fill={DEEP} x={50} y={27} angle={-84} scale={0.56} />
    <Pot />
  </Room>
)

/** `Anthurium ` and `anthurium` are the same shelf. */
export function Plate({ genus = '' }: { genus?: string }) {
  const drawing = GENUS_PLATES[genus.trim().toLowerCase()] ?? ANY

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 76"
      preserveAspectRatio="xMidYMid slice"
      className="size-full text-line-strong"
    >
      {drawing}
    </svg>
  )
}
