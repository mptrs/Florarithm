/**
 * A thin wrapper over the GitHub Contents API — the whole sync transport.
 * Plain `fetch` straight from the browser to `api.github.com` (GitHub's API
 * answers CORS preflights, so no server sits in between) with a fine-grained
 * personal access token scoped to one repo. No SDK: three endpoints is not
 * worth a dependency.
 */

import { base64ToBytes, base64ToUtf8, bytesToBase64, utf8ToBase64 } from './base64'

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
  ) {
    super(message)
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
      throw new GitHubApiError(`${init?.method ?? 'GET'} ${path} kept failing`, response.status)
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

async function call(config: GitHubConfig, path: string, init?: Call): Promise<Response> {
  return request(config, `contents/${path}`, init)
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
  if (!response.ok) throw new GitHubApiError('GET repo failed', response.status)

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

export async function putFile(
  config: GitHubConfig,
  path: string,
  content: string,
  sha: string | null,
  message: string,
  branch: string,
): Promise<{ sha: string }> {
  const response = await call(config, path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: utf8ToBase64(content),
      branch,
      ...(sha ? { sha } : {}),
    }),
  })

  if (!response.ok) throw new GitHubApiError(`PUT ${path} failed`, response.status)

  const body = (await response.json()) as { content: ContentsResponse }
  return { sha: body.content.sha }
}

/**
 * The same two calls for a file that is not text.
 *
 * Separate rather than a flag on the pair above, because the difference is not
 * a flag: `getFile` decodes to a string, and a JPEG put through a UTF-8 decoder
 * comes back corrupted rather than wrong-looking. Both go through the Contents
 * API's ordinary JSON body, which is why photographs are kept under the 1 MB
 * that endpoint will encode — past that GitHub demands the Git Data API and a
 * three-step blob dance.
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

export async function putBinaryFile(
  config: GitHubConfig,
  path: string,
  bytes: ArrayBuffer,
  message: string,
  branch: string,
): Promise<void> {
  const attempt = () =>
    call(config, path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content: bytesToBase64(bytes), branch }),
    })

  // No `sha` is ever sent, so this create can never lose real content the way
  // `putFile` can — a 409 here is the branch ref moving under a plain create,
  // not two devices fighting over the same bytes. Retrying behind whatever
  // else just committed is always the right move.
  let response: Response
  for (let tries = 1; ; tries++) {
    try {
      response = await attempt()
      break
    } catch (error) {
      if (!(error instanceof GitHubConflictError) || tries === MAX_ATTEMPTS) throw error
      await wait(BASE_DELAY_MS * 2 ** tries)
    }
  }

  // A path that already exists comes back 422, which is not a failure here:
  // the file is immutable and named after the event it belongs to, so
  // "already there" is the outcome we wanted. Anything else is a real error.
  if (!response.ok && response.status !== 422) {
    throw new GitHubApiError(`PUT ${path} failed`, response.status)
  }
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
