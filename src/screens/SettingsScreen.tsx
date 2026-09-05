/**
 * Settings — the backup, and the three growing lists.
 *
 * Until the sync lands in M2, the export here is the only safety net there is,
 * which is why Today nags about it and this screen says so plainly.
 */

import { useRef, useState } from 'react'
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
import { VOCAB_KINDS, type VocabKind } from '~/data/types'
import { daysSince, formatDate } from '~/lib/date'
import { label, plural } from '~/lib/format'
import { Banner } from '~/ui/Banner'
import { Button, IconButton } from '~/ui/Button'
import { TextField } from '~/ui/fields'
import { Rows, ScreenHeader, SectionHeading } from '~/ui/primitives'
import { Row } from '~/ui/rows'

export function SettingsScreen() {
  return (
    <div className="flex flex-col gap-10">
      <ScreenHeader title="Settings" />
      <BackupSection />
      <ListsSection />
    </div>
  )
}

// --- backup -----------------------------------------------------------------

function BackupSection() {
  const state = useStore()
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      const confirmed = window.confirm(
        `Replace everything on this device?\n\n` +
          `In the file: ${backup.plants.length} plants, ${backup.events.length} events.\n` +
          `Here now: ${state.plants.length} plants, ${state.events.length} events.\n\n` +
          `This cannot be undone.`,
      )
      if (!confirmed) return

      await replaceEverything({
        plants: backup.plants,
        events: backup.events,
        vocab: backup.vocab,
      })
    } catch (cause) {
      setError(cause instanceof BackupParseError ? cause.message : 'That file could not be read.')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>Backup</SectionHeading>

      <Banner tone={days === null || days >= 14 ? 'warning' : 'info'} icon="clock">
        {state.lastBackupAt === null
          ? 'Never backed up. Your collection lives only in this browser.'
          : `Last backup ${formatDate(state.lastBackupAt)} · ${plural(days ?? 0, 'day')} ago`}
      </Banner>

      <p className="max-w-prose text-[0.9375rem] leading-6 text-ink-muted text-pretty">
        One JSON file with every plant, every logged event and the three lists below. On iPhone the
        share sheet offers &ldquo;Save to Files&rdquo;, which is how it reaches iCloud Drive.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button variant="accent" disabled={busy} onClick={exportNow}>
          Export everything
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}>
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

      <p className="max-w-prose text-[0.8125rem] leading-5 text-ink-muted text-pretty">
        Importing replaces everything here with what is in the file. Safari also clears storage for
        sites left untouched for seven days, so a long holiday is exactly when this matters.
      </p>
    </section>
  )
}

// --- growing lists ----------------------------------------------------------

function ListsSection() {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <SectionHeading>Lists</SectionHeading>
        <p className="max-w-prose text-[0.9375rem] leading-6 text-ink-muted text-pretty">
          Renaming an entry moves every plant and every logged event with it. Entries are archived
          rather than deleted, so an event from years back still resolves to something readable.
        </p>
      </div>

      {VOCAB_KINDS.map((kind) => (
        <VocabList key={kind} kind={kind} />
      ))}
    </section>
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
    </div>
  )
}
