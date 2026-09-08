/**
 * Settings — sync, the two growing lists, and the manual backup.
 *
 * Sync is the real safety net now: a repository somewhere else, kept
 * current automatically. The manual export is what it was before M2 —
 * one JSON file, and it still round-trips everything — but it is no longer
 * the *only* copy, which is why it sits collapsed at the bottom rather than
 * nagging at the top.
 */

import { useEffect, useRef, useState } from 'react'
import { buildBackup, BackupParseError, readBackupFile, shareBackup } from '~/data/backup'
import { allVocabOf } from '~/data/selectors'
import {
  ensureVocabItem,
  markBackedUp,
  renameVocabItem,
  replaceEverything,
  setVocabArchived,
  useStore,
} from '~/data/store'
import { configureSync, getSyncConfig, syncNow, useSyncStatus } from '~/data/sync'
import { VOCAB_KINDS, type VocabKind } from '~/data/types'
import { daysSince, formatDate } from '~/lib/date'
import { label, plural } from '~/lib/format'
import { Banner } from '~/ui/Banner'
import { Button, IconButton } from '~/ui/Button'
import { useConfirm } from '~/ui/ConfirmDialog'
import { Field, TextField } from '~/ui/fields'
import { showToast } from '~/ui/toast'
import { Icon } from '~/ui/Icon'
import { Rows, ScreenHeader, Section, SectionHeading } from '~/ui/primitives'
import { Row } from '~/ui/rows'
import { SyncStatusPill } from '~/ui/SyncStatusPill'

export function SettingsScreen() {
  return (
    <div className="flex flex-col gap-10">
      <ScreenHeader title="Settings" />
      <SyncSection />
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
          <div className="flex gap-2.5">
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
          <div className="flex gap-2.5">
            <div className="flex h-control w-full max-w-sm items-center rounded-sm border border-line-strong bg-surface px-3.5 font-mono text-body text-ink-muted">
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
      <summary className="mb-4 flex cursor-pointer list-none items-center justify-between gap-2.5 border-b border-line pb-2.5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2.5">
          <Icon name="download" size={19} className="text-ink-faint" />
          <h2 className="font-display text-[1.3125rem] leading-7 font-medium">Backup</h2>
        </span>
        <Icon
          name="chevronDown"
          size={16}
          className="text-ink-muted transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="flex flex-col gap-4">
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

// --- growing lists ----------------------------------------------------------

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

      <div className="flex gap-2.5">
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
                className={
                  'min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-2 py-2 text-body ' +
                  (item.archived ? 'text-ink-faint line-through' : 'text-ink') +
                  ' hover:border-line focus:border-leaf focus:outline-none'
                }
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
    </div>
  )
}
