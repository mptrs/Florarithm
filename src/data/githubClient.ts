/**
 * A thin wrapper over the GitHub API — the whole sync transport. Plain
 * `fetch` straight from the browser to `api.github.com` (GitHub's API answers
 * CORS preflights, so no server sits in between) with a fine-grained personal
 * access token scoped to one repo. No SDK: a handful of endpoints is not
 * worth a dependency.
 *
 * Reading uses the Contents API, which hands back a file's bytes in one
 * request. Writing does not: see `commitFiles`.
 */

import { base64ToBytes, base64ToUtf8, bytesToBase64 } from './base64'

export type GitHubConfig = { owner: string; repo: string; token: string }

export type RemoteFile = { content: string; sha: string }
export type RemoteBytes = { bytes: ArrayBuffer; sha: string }
export type DirEntry = { name: string; sha: string }

/** The `fetch` itself threw — offline, DNS, a captive portal. */
export class GitHubNetworkError extends Error {}

/** 401, or a 403 that isn't a rate limit — the token is missing, wrong or
 *  revoked. This is the mockup's ember "Fix" state. */
export class GitHubAuthError extends Error {}

/** 409 on a write: the file's `sha` moved since it was last fetched, because
 *  something else wrote to it first. */
export class GitHubConflictError extends Error {}

/** Anything else unexpected (5xx, an unforeseen 4xx). */
export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** What GitHub itself said, when it said anything. A bare status is not
     *  enough to act on: a 422 from the Git Data API is "Reference already
     *  exists" or "not a fast forward" or "tree entry is invalid", and those
     *  are three different problems wearing one number. */
    readonly detail?: string,
  ) {
    super(detail ? `${message}: ${detail}` : message)
  }
}

/** GitHub answers every error with `{ "message": ... }`. Read it if it is
 *  there, and never let reading it be the thing that fails. */
async function detailOf(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.clone().json()) as { message?: unknown }
    return typeof body.message === 'string' ? body.message : undefined
  } catch {
    return undefined
  }
}

const API = 'https://api.github.com'

function headers(config: GitHubConfig, extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${config.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  }
}

type Call = { method?: string; body?: string; headers?: Record<string, string> }

/**
 * Transient failures are the norm, not the exception.
 *
 * One sync round writes `meta.json`, `plants.json` and a file per month in
 * quick succession — several commits to the same branch within a second or
 * two. GitHub answers a fair share of those with a 5xx, a 429, or a
 * secondary rate limit, none of which mean anything is wrong: the same
 * request a moment later succeeds. Without a wait-and-retry that surfaced as
 * "sync failed" on a perfectly ordinary edit, which then went away when the
 * person pressed the button again — the retry they were performing by hand.
 */
const MAX_ATTEMPTS = 4
const BASE_DELAY_MS = 300

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function backoffMs(response: Response, attempt: number): number {
  // GitHub says how long to wait when it knows; otherwise back off
  // exponentially. `retry-after` is capped so a rate limit measured in
  // minutes fails fast instead of hanging the round trip.
  const retryAfter = Number(response.headers.get('retry-after'))
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, 5000)
  return BASE_DELAY_MS * 2 ** (attempt - 1)
}

/** A 403 is three different things wearing one status code: an exhausted
 *  primary rate limit, a secondary rate limit from writing too fast, or "this
 *  token cannot touch this repo" — which is exactly what a 401 means. Only
 *  the last is worth telling the person about. */
async function isRateLimited(response: Response): Promise<boolean> {
  if (response.headers.get('x-ratelimit-remaining') === '0') return true
  if (response.headers.get('retry-after')) return true

  const body = await response
    .clone()
    .text()
    .catch(() => '')
  return /secondary rate limit|abuse detection/i.test(body)
}

/** Worth trying again as-is: nothing about the request was wrong. */
async function isTransient(response: Response): Promise<boolean> {
  if (response.status >= 500) return true
  if (response.status === 429) return true
  return response.status === 403 && (await isRateLimited(response))
}

/** `path` is relative to `/repos/{owner}/{repo}` — `''` for the repo itself,
 *  `contents/plants.json` for a file. */
async function request(config: GitHubConfig, path: string, init?: Call): Promise<Response> {
  const base = `${API}/repos/${config.owner}/${config.repo}`
  const url = path ? `${base}/${path}` : base

  for (let attempt = 1; ; attempt++) {
    let response: Response
    try {
      response = await fetch(url, { ...init, headers: headers(config, init?.headers) })
    } catch (cause) {
      throw new GitHubNetworkError('Could not reach GitHub.', { cause })
    }

    if (await isTransient(response)) {
      if (attempt < MAX_ATTEMPTS) {
        await wait(backoffMs(response, attempt))
        continue
      }
      throw new GitHubApiError(
        `${init?.method ?? 'GET'} ${path} kept failing`,
        response.status,
        await detailOf(response),
      )
    }

    if (response.status === 401 || response.status === 403) {
      throw new GitHubAuthError('The token was refused.')
    }
    if (response.status === 409) {
      throw new GitHubConflictError('Someone else wrote to this file first.')
    }

    return response
  }
}

/**
 * A read through the Contents API.
 *
 * A repository with no commits in it answers *every* Contents request with
 * 409 "This repository is empty" rather than 404 — the same status a write
 * conflict uses. Reading a file cannot conflict with anything, so a 409 here
 * only ever means the repo has nothing in it yet, which is precisely the
 * "not there" the callers already handle. Left alone, the very first sync
 * into a fresh repo died with "someone else wrote to this file first."
 */
async function call(config: GitHubConfig, path: string, init?: Call): Promise<Response> {
  try {
    return await request(config, `contents/${path}`, init)
  } catch (error) {
    if (error instanceof GitHubConflictError) return new Response(null, { status: 404 })
    throw error
  }
}

/**
 * The branch to commit to. Needed explicitly rather than left to the API to
 * infer: a `PUT contents` with no `branch` resolves against the repository's
 * default ref, and a repo with zero commits has no ref yet to resolve — that
 * PUT comes back 404 even though the repo and the token are both fine. A
 * repo's `default_branch` is set at creation time, before any commit exists,
 * so this is safe to call before the very first sync too.
 */
export async function getDefaultBranch(config: GitHubConfig): Promise<string> {
  const response = await request(config, '')
  if (!response.ok) {
    throw new GitHubApiError('GET repo failed', response.status, await detailOf(response))
  }

  const body = (await response.json()) as { default_branch: string }
  return body.default_branch
}

type ContentsResponse = { content: string; sha: string; type: string }
type ContentsListEntry = { name: string; sha: string; type: string }

export async function getFile(config: GitHubConfig, path: string): Promise<RemoteFile | null> {
  const response = await call(config, path)
  if (response.status === 404) return null
  if (!response.ok) throw new GitHubApiError(`GET ${path} failed`, response.status)

  const body = (await response.json()) as ContentsResponse
  return { content: base64ToUtf8(body.content), sha: body.sha }
}

/**
 * Every change of one sync round, as a single commit.
 *
 * The Contents API was the obvious transport and the wrong one: it commits
 * per file, so one ordinary round trip — `meta.json`, `plants.json`, a file
 * per month, a photograph or two — was half a dozen commits racing each
 * other onto one branch within a second. GitHub answers that race with 409s
 * even when, as here, there is only ever one device writing. The conflicts
 * were never between two people; they were this app against itself.
 *
 * The Git Data API builds the whole round as one tree and moves the branch
 * once. Nothing races, because there is only one write. It is also atomic:
 * a round either lands whole or not at all, so the repo is never left
 * holding an event whose photograph never arrived.
 */
export type FileToCommit = { path: string; text: string } | { path: string; bytes: ArrayBuffer }

type Ref = { object: { sha: string } }

/**
 * What this device last put on the end of the branch: the commit it made, and
 * the head it made that commit on top of.
 *
 * Reading a ref back is not read-your-writes. GitHub serves ref reads from
 * replicas, and for a second or two after a push one of them can still hand
 * back the *previous* head. Sync then builds its next commit on a parent that
 * is already a commit behind, and the branch update is refused as "not a fast
 * forward" — a 422 on an ordinary edit, on a collection only one device is
 * writing to. Waiting and re-reading does not help, because every re-read can
 * come from the same lagging replica.
 *
 * So the fix is not to wait: it is to notice. If the ref read hands back the
 * exact commit we built on last time, we are looking at a stale replica of a
 * branch we ourselves moved, and we already know where it actually points.
 */
const lastPush = new Map<string, { parent: string | null; commit: string }>()

function branchKey(config: GitHubConfig, branch: string): string {
  return `${config.owner}/${config.repo}#${branch}`
}

/** The branch head, or `null` for a repository with no commits at all —
 *  which GitHub reports as a 409 rather than a 404. */
async function getHead(config: GitHubConfig, branch: string): Promise<string | null> {
  const reported = await readHead(config, branch)
  const ours = lastPush.get(branchKey(config, branch))

  // Either the replica has caught up (it reports our commit, or something
  // newer that another device pushed), or it is still showing the parent we
  // built that commit on — the one case where we know better than it does.
  if (ours && reported === ours.parent) return ours.commit
  return reported
}

async function readHead(config: GitHubConfig, branch: string): Promise<string | null> {
  let response: Response
  try {
    response = await request(config, `git/ref/heads/${branch}`)
  } catch (error) {
    if (error instanceof GitHubConflictError) return null
    throw error
  }

  if (response.status === 404) return null
  if (!response.ok) throw new GitHubApiError('GET ref failed', response.status, await detailOf(response))

  const body = (await response.json()) as Ref
  return body.object.sha
}

async function post<T>(config: GitHubConfig, path: string, body: unknown): Promise<T> {
  const response = await request(config, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new GitHubApiError(`POST ${path} failed`, response.status, await detailOf(response))
  }
  return (await response.json()) as T
}

async function treeOfCommit(config: GitHubConfig, sha: string): Promise<string> {
  const response = await request(config, `git/commits/${sha}`)
  if (!response.ok) {
    throw new GitHubApiError('GET commit failed', response.status, await detailOf(response))
  }

  const body = (await response.json()) as { tree: { sha: string } }
  return body.tree.sha
}

/** How many times to rebuild the commit on top of a head that moved while we
 *  were building it. With one device this never happens; with two it is the
 *  one place a conflict can still occur, and it is a re-do, not a failure. */
const COMMIT_ATTEMPTS = 3

export async function commitFiles(
  config: GitHubConfig,
  branch: string,
  files: readonly FileToCommit[],
  message: string,
): Promise<void> {
  if (files.length === 0) return

  for (let attempt = 1; ; attempt++) {
    const head = await getHead(config, branch)

    // A photograph has to become a blob of its own: a tree entry can carry
    // text inline, but not bytes that aren't valid UTF-8.
    const entries = await Promise.all(
      files.map(async (file) => {
        const base = { path: file.path, mode: '100644' as const, type: 'blob' as const }
        if ('text' in file) return { ...base, content: file.text }

        const blob = await post<{ sha: string }>(config, 'git/blobs', {
          content: bytesToBase64(file.bytes),
          encoding: 'base64',
        })
        return { ...base, sha: blob.sha }
      }),
    )

    const tree = await post<{ sha: string }>(config, 'git/trees', {
      ...(head ? { base_tree: await treeOfCommit(config, head) } : {}),
      tree: entries,
    })

    const commit = await post<{ sha: string }>(config, 'git/commits', {
      message,
      tree: tree.sha,
      parents: head ? [head] : [],
    })

    // A branch with no commits yet has no ref to move — it has to be created.
    const response = head
      ? await request(config, `git/refs/heads/${branch}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sha: commit.sha }),
        })
      : await request(config, 'git/refs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
        })

    if (response.ok) {
      lastPush.set(branchKey(config, branch), { parent: head, commit: commit.sha })
      return
    }

    // 422 is the Git Data API's one status for several unrelated refusals, so
    // it is GitHub's own sentence that says which: "not a fast forward" means
    // the head moved and the commit should be rebuilt on top of wherever it
    // went, while an invalid tree entry will say so no matter how often it is
    // tried. Anything else is not worth three round trips.
    const detail = (await detailOf(response)) ?? ''
    const worthRebuilding =
      response.status === 422 && /fast.?forward|already exists/i.test(detail)

    if (!worthRebuilding || attempt === COMMIT_ATTEMPTS) {
      throw new GitHubApiError('Updating the branch failed', response.status, detail)
    }

    // Whatever we believed about this branch was wrong, or we would not be
    // here — drop it and read the ref for real on the next attempt.
    lastPush.delete(branchKey(config, branch))
    // Seconds, not milliseconds. Whatever moved the branch — a replica still
    // catching up, or genuinely another device — is not going to have
    // finished within a couple of hundred milliseconds.
    await wait(1000 * 2 ** attempt)
  }
}

/**
 * Reading a file that is not text.
 *
 * Separate from `getFile` rather than a flag on it, because the difference is
 * not a flag: `getFile` decodes to a string, and a JPEG put through a UTF-8
 * decoder comes back corrupted rather than wrong-looking. This goes through
 * the Contents API's ordinary JSON body, which is why photographs are kept
 * under the 1 MB that endpoint will encode.
 */
export async function getBinaryFile(
  config: GitHubConfig,
  path: string,
): Promise<RemoteBytes | null> {
  const response = await call(config, path)
  if (response.status === 404) return null
  if (!response.ok) throw new GitHubApiError(`GET ${path} failed`, response.status)

  const body = (await response.json()) as ContentsResponse
  return { bytes: base64ToBytes(body.content), sha: body.sha }
}

/** `null` for "the directory doesn't exist yet" — the normal shape of a
 *  brand-new repo, not an error. */
export async function listDir(config: GitHubConfig, path: string): Promise<DirEntry[] | null> {
  const response = await call(config, path)
  if (response.status === 404) return null
  if (!response.ok) throw new GitHubApiError(`GET ${path} failed`, response.status)

  const body = (await response.json()) as ContentsListEntry[]
  return body.filter((entry) => entry.type === 'file').map(({ name, sha }) => ({ name, sha }))
}
