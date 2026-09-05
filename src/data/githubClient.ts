/**
 * A thin wrapper over the GitHub Contents API — the whole sync transport.
 * Plain `fetch` straight from the browser to `api.github.com` (GitHub's API
 * answers CORS preflights, so no server sits in between) with a fine-grained
 * personal access token scoped to one repo. No SDK: three endpoints is not
 * worth a dependency.
 */

import { base64ToUtf8, utf8ToBase64 } from './base64'

export type GitHubConfig = { owner: string; repo: string; token: string }

export type RemoteFile = { content: string; sha: string }
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

/** `path` is relative to `/repos/{owner}/{repo}` — `''` for the repo itself,
 *  `contents/plants.json` for a file. */
async function request(config: GitHubConfig, path: string, init?: Call): Promise<Response> {
  const base = `${API}/repos/${config.owner}/${config.repo}`
  const url = path ? `${base}/${path}` : base

  let response: Response
  try {
    response = await fetch(url, { ...init, headers: headers(config, init?.headers) })
  } catch (cause) {
    throw new GitHubNetworkError('Could not reach GitHub.', { cause })
  }

  if (response.status === 401 || isPermissionDenied(response)) {
    throw new GitHubAuthError('The token was refused.')
  }
  if (response.status === 409) {
    throw new GitHubConflictError('Someone else wrote to this file first.')
  }

  return response
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

/** A 403 is either "no rate limit left" (transient, not an auth problem) or
 *  "this token cannot touch this repo" (exactly what 401 means). GitHub tells
 *  the two apart with this header. */
function isPermissionDenied(response: Response): boolean {
  return response.status === 403 && response.headers.get('x-ratelimit-remaining') !== '0'
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

/** `null` for "the directory doesn't exist yet" — the normal shape of a
 *  brand-new repo, not an error. */
export async function listDir(config: GitHubConfig, path: string): Promise<DirEntry[] | null> {
  const response = await call(config, path)
  if (response.status === 404) return null
  if (!response.ok) throw new GitHubApiError(`GET ${path} failed`, response.status)

  const body = (await response.json()) as ContentsListEntry[]
  return body.filter((entry) => entry.type === 'file').map(({ name, sha }) => ({ name, sha }))
}
