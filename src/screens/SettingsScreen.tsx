/**
 * Settings — sync, the growing lists and the names, and the manual backup.
 *
 * Sync is the real safety net now: a repository somewhere else, kept
 * current automatically. The manual export is what it was before M2 —
 * one JSON file, and it still round-trips everything — but it is no longer
 * the *only* copy, which is why it sits collapsed at the bottom rather than
 * nagging at the top.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { buildBackup, BackupParseError, readBackupFile, shareBackup } from '~/data/backup'
import { allVocabOf, nameIndex, type GenusName } from '~/data/selectors'
import {
  ensureVocabItem,
  hangSachets,
  markBackedUp,
  renameName,
  renameVocabItem,
  replaceEverything,
  setQuarantinePlace,
  setVocabArchived,
  useStore,
} from '~/data/store'
import { configureSync, getSyncConfig, syncNow, useSyncStatus } from '~/data/sync'
import { ORDER_WORKDAYS } from '~/data/sachets'
import { DEFAULT_QUARANTINE_WEEKS } from '~/data/settling'
import { SACHET_DAYS, VOCAB_KINDS, type Plant, type VocabKind } from '~/data/types'
import { cn } from '~/lib/cn'
import { daysSince, formatDate } from '~/lib/date'
import { formatSpecies, label, plural } from '~/lib/format'
import { respell } from '~/lib/taxa'
import { Banner } from '~/ui/Banner'
import { Button, IconButton } from '~/ui/Button'
import { useConfirm } from '~/ui/ConfirmDialog'
import { Field, Label, TextField } from '~/ui/fields'
import { showToast } from '~/ui/toast'
import { Icon } from '~/ui/Icon'
import { Rows, ScreenHeader, Section, SectionHeading } from '~/ui/primitives'
import { Row } from '~/ui/rows'
import { SachetSheet, sachetSummary } from '~/ui/Sachets'
import { SyncStatusPill } from '~/ui/SyncStatusPill'

export function SettingsScreen() {
  return (
    <div className="flex flex-col gap-8">
      <ScreenHeader title="Settings" />
      <SyncSection />
      <SachetsSection />
      <ListsSection />
      <BackupSection />
    </div>
  )
}

// --- sync ---------------------------------------------------------------

/** `owner/repo`, optionally pasted as a full github.com URL. */
function parseOwnerRepo(value: string): { owner: string; repo: string } | null {
  const cleaned = value
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '')

  const [owner, repo, ...rest] = cleaned.split('/')
  return owner && repo && rest.length === 0 ? { owner, repo } : null
}

/** `github_pat_·······7Qa` — enough to recognise it, never enough to use it. */
function maskToken(token: string): string {
  // `github_pat_` and `ghp_` are the two prefixes GitHub actually issues —
  // matched as up to two underscore-delimited segments so the mask still
  // reads as recognisably a GitHub token rather than just its first word.
  const prefix = /^([a-z0-9]+_){1,2}/i.exec(token)?.[0] ?? token.slice(0, 4)
  return `${prefix}·······${token.slice(-3)}`
}

function SyncSection() {
  const status = useSyncStatus()
  const config = getSyncConfig()

  const [repoInput, setRepoInput] = useState(config ? `${config.owner}/${config.repo}` : '')
  const [tokenInput, setTokenInput] = useState('')
  const [replacingToken, setReplacingToken] = useState(!config)
  const [error, setError] = useState<string | null>(null)

  // On a cold page load, `config` is still `null` at this first render — it
  // only finishes reading from IndexedDB moments later. Without this, a
  // reload with sync already set up would show empty fields even though
  // sync itself keeps working fine in the background. The repository field
  // below is deliberately uncontrolled (`defaultValue`, like the vocab
  // rename fields), so `configLoaded` doubles as a `key` to force it to
  // remount with the now-known value once loading catches up.
  const [configLoaded, setConfigLoaded] = useState(!!config)
  useEffect(() => {
    if (configLoaded || !config) return
    setRepoInput(`${config.owner}/${config.repo}`)
    setReplacingToken(false)
    setConfigLoaded(true)
  }, [config, configLoaded])

  const saveRepo = async (value: string) => {
    const trimmed = value.trim()
    setRepoInput(trimmed)

    const unchanged = config && trimmed === `${config.owner}/${config.repo}`
    if (!trimmed || unchanged) return

    const owned = parseOwnerRepo(trimmed)
    if (!owned) {
      setError('Use the owner/repo shown on github.com, e.g. mptrs/florarithm-data.')
      return
    }
    if (!config?.token) {
      setError('Add a fine-grained access token first.')
      return
    }

    setError(null)
    await configureSync({ ...owned, token: config.token })
  }

  const saveToken = async () => {
    const token = tokenInput.trim()
    if (!token) return

    const owned = parseOwnerRepo(repoInput)
    if (!owned) {
      setError('Add the private repository first, as owner/repo.')
      return
    }

    setError(null)
    await configureSync({ ...owned, token })
    setTokenInput('')
    setReplacingToken(false)
  }

  return (
    <Section icon="sync" title="Sync">
      <SyncStatusPill status={status} variant="detailed" />

      <TextField
        key={configLoaded ? 'loaded' : 'loading'}
        label="Private repository"
        placeholder="owner/repo"
        defaultValue={repoInput}
        onBlur={(event) => void saveRepo(event.target.value)}
        fieldClassName="max-w-sm"
      />

      {replacingToken ? (
        <Field
          label="Access token"
          hint="Reaches this one repository and nothing else. Lose the phone and you revoke it on github.com; every other device carries on."
        >
          <div className="flex gap-2">
            <TextField
              type="password"
              autoComplete="off"
              placeholder="github_pat_…"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void saveToken()
              }}
              fieldClassName="max-w-sm flex-1"
            />
            <Button variant="outline" icon="check" onClick={() => void saveToken()}>
              Save
            </Button>
          </div>
        </Field>
      ) : (
        <Field label="Access token">
          <div className="flex gap-2">
            <div className="flex h-control w-full max-w-sm items-center rounded-sm border border-line-strong bg-surface px-4 font-mono text-body text-ink-muted">
              {maskToken(config?.token ?? '')}
            </div>
            <Button variant="outline" icon="pencil" onClick={() => setReplacingToken(true)}>
              Replace
            </Button>
          </div>
        </Field>
      )}

      {error ? <Banner tone="warning">{error}</Banner> : null}

      <Button
        variant="outline"
        icon="sync"
        disabled={!config || status.kind === 'syncing'}
        onClick={() => syncNow()}
      >
        Sync now
      </Button>
    </Section>
  )
}

// --- names ------------------------------------------------------------------

/**
 * Every genus and species the plants carry, renamed in one place.
 *
 * Not a list of its own the way places are: a genus is written on each plant,
 * so a typo made once is a genus of its own — its own drawer in the
 * collection, one more genus counted. Renaming here rewrites it on every
 * plant that carries it, and renaming onto a name already here merges them.
 *
 * Online, each name is checked against GBIF, and one spelled differently
 * there says so, with the fix one tap away. Offline the list is the same,
 * just without the hints.
 */
function NamesList() {
  const state = useStore()
  const genera = nameIndex(state.plants)
  const spellings = useSpellings(genera)
  const [open, setOpen] = useState<string | null>(null)

  if (genera.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <SectionHeading>Names</SectionHeading>
      <p className="max-w-prose text-[0.8125rem] leading-5 text-ink-muted text-pretty">
        Every genus and species your plants carry, spelled the way they are spelled. Fix one here
        and every plant with it follows. Names are checked against{' '}
        <a href="https://www.gbif.org" target="_blank" rel="noreferrer" className="text-leaf underline">
          GBIF
        </a>{' '}
        when you are online.
      </p>

      <Rows className="mt-1">
        {genera.map((genus) => (
          <GenusEntry
            key={genus.name}
            genus={genus}
            genera={genera}
            spellings={spellings}
            open={open === genus.name}
            onToggle={() => setOpen((current) => (current === genus.name ? null : genus.name))}
          />
        ))}
      </Rows>
    </div>
  )
}

/** Keyed `Genus` or `Genus epithet`, holding how GBIF spells the part that
 *  is spelled differently. */
type Spellings = ReadonlyMap<string, string>

function GenusEntry({
  genus,
  genera,
  spellings,
  open,
  onToggle,
}: {
  genus: GenusName
  genera: readonly GenusName[]
  spellings: Spellings
  open: boolean
  onToggle: () => void
}) {
  const [renaming, setRenaming] = useState<{ species?: string; to: string } | null>(null)
  const fix = spellings.get(genus.name)

  if (renaming && renaming.species === undefined) {
    return (
      <RenameName
        kind="Genus"
        from={genus.name}
        initial={renaming.to}
        plants={genus.plants}
        existing={(to) => genera.find((other) => other.name === to && other !== genus)?.plants}
        onRename={(to) => renameName({ genus: genus.name }, to)}
        onDone={() => setRenaming(null)}
      />
    )
  }

  return (
    <>
      <div className="flex min-h-13 items-center gap-3 border-b border-line py-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="warm flex min-w-0 flex-1 items-center gap-3 self-stretch text-left"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-display text-[1.125rem] leading-6 italic">{genus.name}</span>
            {fix ? <SpelledAs name={fix} /> : null}
          </span>
          <span className="shrink-0 font-mono text-micro text-ink-faint">{genus.plants.length}</span>
          {fix ? null : (
            <Icon
              name="chevronDown"
              size={18}
              className={cn('shrink-0 text-ink-faint transition-transform', open && 'rotate-180')}
            />
          )}
        </button>
        {fix ? (
          <Button size="sm" aria-label={`Fix ${genus.name}`} onClick={() => setRenaming({ to: fix })}>
            Fix
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="border-b border-line pl-4">
          {genus.species.map((species) => (
            <SpeciesEntry
              key={species.name}
              genus={genus}
              species={species.name}
              plants={species.plants}
              fix={spellings.get(`${genus.name} ${species.name}`)}
              renaming={renaming?.species === species.name ? renaming.to : null}
              onRename={(to) => setRenaming({ species: species.name, to })}
              onDone={() => setRenaming(null)}
            />
          ))}
          {genus.unnamed > 0 ? (
            <div className="flex min-h-13 items-center gap-3 border-b border-line py-2 last:border-b-0">
              <span className="flex-1 text-[0.875rem] text-ink-faint">Crosses and unnamed</span>
              <span className="font-mono text-micro text-ink-faint">{genus.unnamed}</span>
              {/* Where the other rows have their button, so the counts line up. */}
              <span aria-hidden className="w-control shrink-0" />
            </div>
          ) : null}
          <div className="py-2">
            <Button size="sm" variant="quiet" icon="pencil" onClick={() => setRenaming({ to: genus.name })}>
              Rename {genus.name}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}

function SpeciesEntry({
  genus,
  species,
  plants,
  fix,
  renaming,
  onRename,
  onDone,
}: {
  genus: GenusName
  species: string
  plants: readonly Plant[]
  fix: string | undefined
  renaming: string | null
  onRename: (to: string) => void
  onDone: () => void
}) {
  if (renaming !== null) {
    return (
      <RenameName
        kind="Species"
        from={species}
        initial={renaming}
        plants={plants}
        existing={(to) => genus.species.find((other) => other.name === to && other.name !== species)?.plants}
        within={genus.name}
        onRename={(to) => renameName({ genus: genus.name, species }, to)}
        onDone={onDone}
      />
    )
  }

  return (
    <div className="flex min-h-13 items-center gap-3 border-b border-line py-2">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-display text-[1.0625rem] leading-[1.375rem] italic">{species}</span>
        {fix ? <SpelledAs name={fix} /> : null}
      </span>
      <span className="shrink-0 font-mono text-micro text-ink-faint">{plants.length}</span>
      {fix ? (
        <Button size="sm" aria-label={`Fix ${species}`} onClick={() => onRename(fix)}>
          Fix
        </Button>
      ) : (
        <IconButton icon="pencil" variant="quiet" label={`Rename ${species}`} onClick={() => onRename(species)} />
      )}
    </div>
  )
}

function SpelledAs({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2 text-[0.8125rem] leading-[1.125rem] text-ember">
      <Icon name="pencil" size={13} />
      <span>
        GBIF spells it <i className="font-display text-[0.875rem]">{name}</i>
      </span>
    </span>
  )
}

/**
 * The row turned into its own editor. What happens is said before it is
 * done — and most of all when the new spelling is a name already here,
 * because that merges two groups into one and is not taken back by renaming
 * again.
 */
function RenameName({
  kind,
  from,
  initial,
  plants,
  existing,
  within,
  onRename,
  onDone,
}: {
  kind: 'Genus' | 'Species'
  from: string
  initial: string
  plants: readonly Plant[]
  existing: (to: string) => readonly Plant[] | undefined
  /** The genus a species is renamed inside. */
  within?: string
  onRename: (to: string) => Promise<number>
  onDone: () => void
}) {
  const id = useId()
  const [to, setTo] = useState(initial)
  const spelled = to.trim()
  const joins = spelled ? existing(spelled) : undefined
  const unchanged = !spelled || spelled === from

  const rename = async () => {
    const count = await onRename(spelled)
    showToast(`${plural(count, 'plant')} renamed`)
    onDone()
  }

  return (
    <div className="flex flex-col gap-4 border-b border-line py-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>
          {kind}, now spelled{' '}
          <i className="font-display text-[0.875rem] font-normal tracking-normal normal-case">{from}</i>
        </Label>
        <input
          id={id}
          autoFocus
          value={to}
          onChange={(event) => setTo(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !unchanged) void rename()
            if (event.key === 'Escape') onDone()
          }}
          spellCheck={false}
          autoComplete="off"
          className="warm h-control w-full rounded-sm border border-line-strong bg-surface px-4 font-display text-[1.125rem] italic text-ink focus:border-leaf focus:outline-none"
        />
      </div>

      {unchanged ? null : (
        <div className="flex flex-col gap-3 rounded-md bg-sunk p-4">
          <p className="text-[0.9375rem] leading-[1.375rem] text-ink text-pretty">
            {joins ? (
              <>
                <i className="font-display text-base">{spelled}</i> is already{' '}
                {within ? (
                  <>
                    a species of <i className="font-display text-base">{within}</i>
                  </>
                ) : (
                  'a genus'
                )}{' '}
                here, with {plural(joins.length, 'plant')}.{' '}
                {plants.length === 1 ? 'This one joins it.' : `These ${plants.length} join it.`}
              </>
            ) : plants.length === 1 ? (
              'This plant changes.'
            ) : (
              `These ${plants.length} plants change.`
            )}
          </p>
          <div className="flex flex-col border-t border-line">
            {plants.map((plant) => (
              <div
                key={plant.code}
                className="flex items-baseline gap-3 border-b border-line py-2 last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate font-display text-[1.0625rem] font-medium">
                  {plant.name || plant.code}
                </span>
                <span className="shrink-0 font-display text-[0.875rem] text-ink-muted italic">
                  {formatSpecies(plant)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button onClick={onDone}>Cancel</Button>
        <Button variant="accent" icon="check" disabled={unchanged} onClick={() => void rename()}>
          {`Rename ${plural(plants.length, 'plant')}`}
        </Button>
      </div>
    </div>
  )
}

/**
 * GBIF's spelling of each genus and species here that it spells differently.
 * One question per name, two at a time, and only about names not asked about
 * this month (see `KEPT` in taxa.ts); nothing is asked offline, and a name
 * GBIF is unsure of gets no hint.
 */
function useSpellings(genera: readonly GenusName[]): Spellings {
  const [spellings, setSpellings] = useState<Spellings>(new Map())
  const asked = genera
    .flatMap((genus) => [genus.name, ...genus.species.map((species) => `${genus.name} ${species.name}`)])
    .join('|')

  useEffect(() => {
    if (!navigator.onLine || !asked) return
    let current = true
    const names = asked.split('|')

    void (async () => {
      const found = new Map<string, string>()
      for (let i = 0; i < names.length && current; i += 2) {
        await Promise.all(
          names.slice(i, i + 2).map(async (name) => {
            const [genus = '', species = ''] = name.split(' ')
            const spelling = await respell(genus, species).catch(() => null)
            if (!spelling) return
            // A species is only flagged for its own epithet: a genus spelled
            // wrong is flagged on the genus, once, not again on every species.
            const fix = species ? spelling.species : spelling.genus
            if (fix && fix !== (species || genus)) found.set(name, fix)
          }),
        )
        if (current) setSpellings(new Map(found))
      }
    })()

    return () => {
      current = false
    }
  }, [asked])

  return spellings
}

// --- backup -----------------------------------------------------------------

function BackupSection() {
  const state = useStore()
  const syncStatus = useSyncStatus()
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { confirm, dialog: confirmDialog } = useConfirm()

  // A repository is attached the moment `kind` leaves `unconfigured` — but
  // attached isn't the same as working: `error` means sync stopped reaching
  // it, so it's no longer a safety net even though a repo is configured.
  // `trustworthy` is the one that should decide what this section says and
  // how urgent the export button looks.
  const configured = syncStatus.kind !== 'unconfigured'
  const trustworthy = configured && syncStatus.kind !== 'error'
  const days = state.lastBackupAt === null ? null : daysSince(state.lastBackupAt)

  const exportNow = async () => {
    setBusy(true)
    setError(null)
    try {
      // Only record a backup that actually left the app — a cancelled share
      // sheet must not reset the clock.
      if (await shareBackup(buildBackup(state))) await markBackedUp()
    } finally {
      setBusy(false)
    }
  }

  const importFrom = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const backup = await readBackupFile(file)

      const confirmed = await confirm({
        title: 'Replace everything on this device?',
        message:
          `In the file: ${backup.plants.length} plants, ${backup.events.length} events.\n` +
          `Here now: ${state.plants.length} plants, ${state.events.length} events.\n\n` +
          `This cannot be undone.`,
        confirmLabel: 'Replace',
        danger: true,
      })
      if (!confirmed) return

      await replaceEverything({
        plants: backup.plants,
        events: backup.events,
        vocab: backup.vocab,
      })
      // The sachets ride in the same file. Written as a local change rather
      // than restored quietly, so the other device's copy is compared against
      // the moment of the import and not against a stamp from the export.
      await hangSachets(
        backup.sachets ? { week: backup.sachets.week, hungOn: backup.sachets.hungOn } : null,
      )
      showToast('Replaced')
    } catch (cause) {
      setError(cause instanceof BackupParseError ? cause.message : 'That file could not be read.')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    // Chrome gives an open <details> an internal wrapper around everything
    // after <summary> (it's what animates the expand/collapse), so a `gap`
    // set here only ever lands between the summary and that wrapper — never
    // between the elements inside it. The real rhythm has to live on a
    // wrapper div we own.
    <details className="group">
      <summary
        className={cn(
          'warm group/summary mb-2 flex cursor-pointer list-none items-center justify-between gap-2',
          'border-b border-line pb-2 hover:border-line-strong [&::-webkit-details-marker]:hidden',
        )}
      >
        <span className="flex items-center gap-2">
          <Icon
            name="download"
            size={19}
            className="warm text-ink-faint group-hover/summary:text-ink-muted"
          />
          <h2 className="font-display text-[1.3125rem] leading-7 font-medium">Backup</h2>
        </span>
        <Icon
          name="chevronDown"
          size={16}
          className="text-ink-muted transition duration-200 ease-grow group-open:rotate-180 group-hover/summary:text-ink"
        />
      </summary>

      <div className="flex flex-col gap-6">
        {syncStatus.kind === 'error' ? (
          <Banner tone="warning" icon="alert">
            Sync isn&rsquo;t reaching your repository right now, so it isn&rsquo;t a safety net at
            the moment — this export is the up-to-date copy until that&rsquo;s fixed above.
          </Banner>
        ) : trustworthy ? (
          <Banner tone="info" icon="check">
            Sync already keeps a live copy in your private repository — that&rsquo;s the real
            safety net. Export is just for a copy you hold yourself: handy before a risky change,
            or to take the collection somewhere sync doesn&rsquo;t reach.
          </Banner>
        ) : (
          <Banner tone={days === null || days >= 14 ? 'warning' : 'info'} icon="clock">
            {state.lastBackupAt === null
              ? "Never backed up. Without sync set up above, this browser is the only place your collection exists — and Safari clears storage for sites left untouched for seven days."
              : `Last backup ${formatDate(state.lastBackupAt)} · ${plural(days ?? 0, 'day')} ago. Still the only copy, until sync is set up above.`}
          </Banner>
        )}

        {/* Explanation and the buttons it explains stay close together — the
            gap-2 here is deliberately tighter than the gap-4 around this
            block, so the pairing reads before the grouping does. */}
        <div className="flex flex-col gap-2">
          <p className="max-w-prose text-[0.9375rem] leading-6 text-ink-muted text-pretty">
            One JSON file with every plant, every logged event and the two lists above — a copy
            in your own hands, on top of whatever else keeps this collection safe. On iPhone the
            share sheet offers &ldquo;Save to Files&rdquo;, which is how it reaches iCloud Drive.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              variant={trustworthy ? 'outline' : 'accent'}
              icon="download"
              disabled={busy}
              onClick={exportNow}
            >
              Export everything
            </Button>
            <Button
              variant="outline"
              icon="upload"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              Import from a file
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importFrom(file)
              }}
            />
          </div>

          {error ? <Banner tone="warning">{error}</Banner> : null}
        </div>

        <p className="max-w-prose text-[0.8125rem] leading-5 text-ink-muted text-pretty">
          Importing replaces everything currently on this device — plants, events and lists all
          get overwritten by what&rsquo;s in the file.
        </p>
      </div>

      {confirmDialog}
    </details>
  )
}

// --- sachets ----------------------------------------------------------------

/**
 * The two fields that make up the whole of this: which week is hanging, and
 * since when. There is no switch — an empty record is off and a filled one is
 * on, because a reminder that is configured but silent is two states saying
 * one thing.
 */
function SachetsSection() {
  const { sachets } = useStore()
  const [open, setOpen] = useState(false)
  const { confirm, dialog: confirmDialog } = useConfirm()

  const takeDown = async () => {
    const confirmed = await confirm({
      title: 'No sachets hanging?',
      message: 'Today stops mentioning them until you hang new ones.',
      confirmLabel: 'Take them down',
      danger: true,
    })
    if (confirmed) await hangSachets(null)
  }

  return (
    <Section icon="pest" title="Sachets">
      <p className="max-w-prose text-[0.9375rem] leading-6 text-ink-muted text-pretty">
        Predatory mites against thrips, hung through the whole collection rather than in one plant.
        They stop releasing after {SACHET_DAYS} days. Today asks you to order the next ones{' '}
        {ORDER_WORKDAYS} working days before that, so a weekend cannot make them late.
      </p>

      {sachets ? (
        // Two buttons and two lines of text do not fit one row at 375px, so the
        // row becomes a stack there and is a row again from `sm`.
        <Row className="flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-mono text-code">WEEK {sachets.week}</span>
            <span className="text-[0.8125rem] text-ink-muted">{sachetSummary(sachets)}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={() => setOpen(true)}>
              Change
            </Button>
            <Button size="sm" variant="quiet" onClick={takeDown}>
              Take down
            </Button>
          </div>
        </Row>
      ) : (
        <div>
          <Button variant="accent" icon="plus" onClick={() => setOpen(true)}>
            Sachets are hanging
          </Button>
        </div>
      )}

      {/* Correcting what is written down, not hanging a batch — so the fields
          open on the record rather than on today. */}
      <SachetSheet
        mode={sachets ? 'correct' : 'hang'}
        open={open}
        sachets={sachets}
        onClose={() => setOpen(false)}
      />
      {confirmDialog}
    </Section>
  )
}

// --- growing lists ----------------------------------------------------------

/**
 * The one place that is a quarantine, and how many weeks a newcomer stays
 * there. A place, because quarantine is where a plant stands rather than
 * something it is: carry it down and that is the end of it. See `settling.ts`.
 */
function QuarantinePlace() {
  const state = useStore()
  const places = allVocabOf(state, 'location').filter((item) => !item.archived)
  const chosen = places.find((item) => (item.quarantineWeeks ?? 0) > 0) ?? null
  const weeks = chosen?.quarantineWeeks ?? DEFAULT_QUARANTINE_WEEKS
  const select =
    'warm h-touch rounded-md border border-line-strong bg-surface px-3 text-body text-ink hover:border-ink-faint focus:border-leaf focus:outline-none'

  if (places.length === 0) return null

  return (
    <div className="flex flex-col gap-2 pt-2">
      <Label>Quarantine</Label>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.9375rem] text-ink-muted">
        <select
          aria-label="Quarantine place"
          value={chosen?.id ?? ''}
          onChange={(event) => void setQuarantinePlace(event.target.value || null, weeks)}
          className={cn(select, 'min-w-40')}
        >
          <option value="">None</option>
          {places.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {chosen ? (
          <>
            <span>for</span>
            <select
              aria-label="Weeks in quarantine"
              value={weeks}
              onChange={(event) => void setQuarantinePlace(chosen.id, Number(event.target.value))}
              className={cn(select, 'font-mono')}
            >
              {[1, 2, 3, 4, 5, 6, 8].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
            <span>{weeks === 1 ? 'week' : 'weeks'}</span>
          </>
        ) : null}
      </div>
      <p className="max-w-prose text-[0.8125rem] leading-5 text-ink-faint text-pretty">
        A plant standing there is counted from the day it came in, and Today says when it can come
        down.
      </p>
    </div>
  )
}

function ListsSection() {
  return (
    <Section icon="rows" title="Lists" gap="groups">
      <p className="max-w-prose text-[0.9375rem] leading-6 text-ink-muted text-pretty">
        Renaming an entry moves every plant and every logged event with it. Entries are archived
        rather than deleted, so an event from years back still resolves to something readable.
      </p>

      {VOCAB_KINDS.map((kind) => (
        <VocabList key={kind} kind={kind} />
      ))}

      <NamesList />
    </Section>
  )
}

function VocabList({ kind }: { kind: VocabKind }) {
  const state = useStore()
  const items = allVocabOf(state, kind)
  const [adding, setAdding] = useState('')

  const add = async () => {
    if (!adding.trim()) return
    await ensureVocabItem(kind, adding)
    setAdding('')
  }

  return (
    <div className="flex flex-col gap-2">
      <SectionHeading>{`${label(kind)}s`}</SectionHeading>

      <div className="flex gap-2">
        <TextField
          aria-label={`New ${label(kind).toLowerCase()}`}
          placeholder={`Add a ${label(kind).toLowerCase()}`}
          value={adding}
          onChange={(event) => setAdding(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void add()
          }}
          fieldClassName="flex-1 max-w-sm"
        />
        <IconButton icon="plus" label={`Add ${label(kind).toLowerCase()}`} onClick={add} />
      </div>

      {items.length === 0 ? (
        <p className="text-[0.9375rem] text-ink-muted">
          Nothing yet — the first one you type into a plant lands here.
        </p>
      ) : (
        <Rows>
          {items.map((item) => (
            <Row key={item.id} className="gap-3">
              <input
                defaultValue={item.name}
                aria-label={`Rename ${item.name}`}
                onBlur={(event) => {
                  const next = event.target.value.trim()
                  if (next && next !== item.name) void renameVocabItem(item.id, next)
                  else event.target.value = item.name
                }}
                className={cn(
                  'warm -ml-2 min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-2 py-2 text-body',
                  item.archived ? 'text-ink-faint line-through' : 'text-ink',
                  'hover:border-line-strong focus:border-leaf focus:outline-none',
                )}
              />
              <Button
                size="sm"
                variant="quiet"
                onClick={() => void setVocabArchived(item.id, !item.archived)}
              >
                {item.archived ? 'Restore' : 'Archive'}
              </Button>
            </Row>
          ))}
        </Rows>
      )}

      {kind === 'location' ? <QuarantinePlace /> : null}
    </div>
  )
}
