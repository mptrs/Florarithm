/**
 * AI name suggestions, entirely in the browser.
 *
 * The genus-fitting part of the dice button used to be a hardcoded word list
 * per genus (see git history of `nameGenerator.ts`). That list ran out fast:
 * anything not on it fell back to a generic word that had nothing to do with
 * the plant. This module replaces the list with a small language model
 * (WebLLM, on WebGPU) that reasons about the actual genus instead of looking
 * it up — and, unlike a fixed list, can be funny about it.
 *
 * The lineage rule (a cutting inherits its parent's stem) stays mechanical —
 * that is bookkeeping, not a creative task, so it never goes to the model.
 *
 * The model runs on-device: no server, no API key, no network after the
 * first download (the browser caches the weights). There is no static
 * fallback list any more: if WebGPU is missing or the model can't come up
 * with anything usable, this resolves to `null` and the person types their
 * own name.
 */

import type { ChatCompletionMessageParam, MLCEngine } from '@mlc-ai/web-llm'
import { formatSpecies } from './format'
import { nextInLine } from './nameGenerator'

const MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'

const SYSTEM_PROMPT = `You invent funny English nicknames for houseplants in a personal plant logbook — the spirit of GitHub's random repository names ("adorable-doodle", "psychic-waffle"): a playful adjective plus a concrete noun, cheerful and a little absurd, never a bland description.

Ground the joke in something real about the plant's genus — its growth habit, leaf shape or texture, colour, or personality — the way a Monstera full of holes earns "Swiss Cheese", or a plant that shrugs off total neglect earns "Immortal Potato". A real name is fair game too when it's funny and it fits — a person, a character, a brand — the way a floppy, dramatic Ficus lyrata earns "Lazy Boy".

Never a generic word that could apply to any plant, and never a name that is accurate but has no joke in it.

Two English words as a rule (one is fine if it is genuinely funnier alone), capitalised like a name. Reply with the nickname alone: no explanation, no reasoning, no translation, no quotes, no parentheses, no punctuation — just the words, on their own.`

type SpeciesInfo = { genus: string; species: string; cultivar: string }

/** Real example turns, not prose — this is what teaches the reply *shape*, not just the idea. */
const FEW_SHOT: (SpeciesInfo & { name: string })[] = [
  { genus: 'Anthurium', species: 'andreanum', cultivar: '', name: 'Waxy Heart' },
  { genus: 'Monstera', species: 'deliciosa', cultivar: '', name: 'Swiss Cheese' },
  { genus: 'Alocasia', species: 'zebrina', cultivar: '', name: 'Sassy Elephant' },
  { genus: 'Zamioculcas', species: 'zamiifolia', cultivar: '', name: 'Immortal Potato' },
  { genus: 'Peperomia', species: 'caperata', cultivar: '', name: 'Grumpy Raisin' },
  { genus: 'Ficus', species: 'lyrata', cultivar: '', name: 'Lazy Boy' },
]

function buildPrompt(info: SpeciesInfo, avoid: readonly string[]): string {
  const label = formatSpecies(info) || 'an unlabelled houseplant'
  const avoidLine =
    avoid.length > 0 ? `Already taken, so avoid these: ${avoid.join(', ')}.` : 'No names are taken yet.'
  return `Species: ${label}\n${avoidLine}\nGive one English nickname.`
}

/** Strip the model's output down to a name, or null if nothing usable came back. */
function cleanName(raw: string, avoid: readonly string[]): string | null {
  const firstLine = raw.split('\n')[0] ?? ''
  // Small models like to append a reason ("Swiss Cheese (all those holes)")
  // despite being told not to — cut it off rather than trust the instruction
  // held. A spaced dash is treated the same way, but a mid-word hyphen like
  // "Show-off" is a real nickname and stays.
  const cutAt = firstLine.search(/[(),:;.]| [-–—] /)
  const candidate = (cutAt === -1 ? firstLine : firstLine.slice(0, cutAt))
    .replace(/^["'`*\s]+|["'`*\s]+$/g, '')
    .trim()
  if (!candidate) return null

  const words = candidate.split(/\s+/).slice(0, 2)
  // A small model occasionally strings tokens into one long non-word — reject
  // anything too long or without a vowel rather than hand over gibberish.
  const looksLikeAWord = (word: string) => word.length <= 14 && /[aeiouy]/i.test(word)
  if (!words.every(looksLikeAWord)) return null

  const name = words.map((word) => (word[0] ?? '').toUpperCase() + word.slice(1)).join(' ')
  if (!name) return null

  const taken = new Set(avoid.map((item) => item.toLowerCase()))
  return taken.has(name.toLowerCase()) ? nextInLine(name, new Set(avoid)) : name
}

export type LoadProgress = { text: string; progress: number }

let enginePromise: Promise<MLCEngine> | null = null
const progressListeners = new Set<(report: LoadProgress) => void>()
let latestProgress: LoadProgress | null = null

function broadcastProgress(report: LoadProgress) {
  latestProgress = report
  for (const listener of progressListeners) listener(report)
}

function getEngine(onProgress?: (report: LoadProgress) => void): Promise<MLCEngine> {
  if (onProgress) {
    if (latestProgress) onProgress(latestProgress)
    progressListeners.add(onProgress)
  }

  if (!enginePromise) {
    enginePromise = import('@mlc-ai/web-llm')
      .then(({ CreateMLCEngine }) =>
        CreateMLCEngine(MODEL_ID, { initProgressCallback: broadcastProgress }),
      )
      .catch((error) => {
        enginePromise = null
        throw error
      })
  }

  return enginePromise.finally(() => {
    if (onProgress) progressListeners.delete(onProgress)
  })
}

export function isAiNamingSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

const ATTEMPTS = 2

/**
 * Suggest a name, asking the in-browser model for anything that isn't a
 * mechanical lineage continuation. Resolves to `null` — never a made-up
 * fallback name — when WebGPU is unsupported or the model doesn't produce
 * anything usable after a couple of tries.
 */
export async function suggestNameAI(
  info: SpeciesInfo,
  taken: ReadonlySet<string>,
  parentName?: string | null,
  onProgress?: (report: LoadProgress) => void,
): Promise<string | null> {
  if (parentName) return nextInLine(parentName, taken)
  if (!isAiNamingSupported()) return null

  try {
    const engine = await getEngine(onProgress)
    const avoid = Array.from(taken)

    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const reply = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...FEW_SHOT.flatMap(
            (example): ChatCompletionMessageParam[] => [
              { role: 'user', content: buildPrompt(example, []) },
              { role: 'assistant', content: example.name },
            ],
          ),
          { role: 'user', content: buildPrompt(info, avoid) },
        ],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 12,
      })

      const cleaned = cleanName(reply.choices[0]?.message?.content ?? '', avoid)
      if (cleaned) return cleaned
    }

    return null
  } catch {
    return null
  }
}
