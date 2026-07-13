import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.join(root, 'i18n/locales/es')
const referenceDir = path.join(root, 'i18n/locales/en')
const model = process.env.GEMINI_I18N_MODEL || 'gemini-2.5-flash'
const apiKey = process.env.GEMINI_API_KEY
const targets = {
  pt: { name: 'Brazilian Portuguese', tag: 'pt-BR' },
  fr: { name: 'French', tag: 'fr-FR' },
  de: { name: 'German', tag: 'de-DE' },
  hi: { name: 'Hindi', tag: 'hi-IN' },
  zh: { name: 'Simplified Chinese', tag: 'zh-CN' },
  ar: { name: 'Modern Standard Arabic', tag: 'ar' },
}

if (!apiKey) throw new Error('GEMINI_API_KEY is required')

const requested = process.argv.slice(2)
const localeCodes = requested.length ? requested : Object.keys(targets)
for (const code of localeCodes) {
  if (!targets[code]) throw new Error(`Unsupported target locale: ${code}`)
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

function flatten(value, prefix = '', result = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, next, result)
    else result.set(next, child)
  }
  return result
}

function assignPath(target, dottedPath, value) {
  const parts = dottedPath.split('.')
  let current = target
  for (const part of parts.slice(0, -1)) current = current[part]
  current[parts.at(-1)] = value
}

function orderedVariables(message) {
  return [...String(message).matchAll(/\{([^{}]+)\}/g)]
    .map(match => match[1])
}

function variables(message) {
  return orderedVariables(message).sort()
}

function normalizePluralVariables(source, translation) {
  const sourceParts = source.split('|').map(part => part.trim())
  if (sourceParts.length < 2) return translation

  let translatedParts = translation.split('|').map(part => part.trim())
  if (translatedParts.length === 1) {
    translatedParts = sourceParts.map(() => translatedParts[0])
  }
  if (translatedParts.length !== sourceParts.length) return translation

  return translatedParts.map((part, partIndex) => {
    const expected = orderedVariables(sourceParts[partIndex])
    const actual = orderedVariables(part)
    if (actual.length === expected.length) {
      let variableIndex = 0
      return part.replace(/\{([^{}]+)\}/g, () => `{${expected[variableIndex++]}}`)
    }
    if (actual.length === 0 && expected.length > 0) {
      return `${expected.map(variable => `{${variable}}`).join(' ')} ${part}`.trim()
    }
    return part
  }).join(' | ')
}

function assertBatch(sourceEntries, translatedEntries) {
  if (!Array.isArray(translatedEntries)) throw new Error('Model response is not an array')
  const translated = new Map(translatedEntries.map(item => [item.key, item.translation]))
  if (translated.size !== sourceEntries.length) {
    throw new Error(`Expected ${sourceEntries.length} translations, received ${translated.size}`)
  }
  for (const item of sourceEntries) {
    let value = translated.get(item.key)
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing translation for ${item.key}`)
    value = normalizePluralVariables(item.es, value)
    translated.set(item.key, value)
    const expectedVariables = variables(item.es)
    const expectedVariablesInOrder = orderedVariables(item.es)
    const actualVariables = variables(value)
    if (actualVariables.length === expectedVariables.length
      && JSON.stringify(actualVariables) !== JSON.stringify(expectedVariables)) {
      let index = 0
      value = value.replace(/\{([^{}]+)\}/g, () => `{${expectedVariablesInOrder[index++]}}`)
      translated.set(item.key, value)
    }
    if (JSON.stringify(variables(value)) !== JSON.stringify(expectedVariables)) {
      throw new Error(`Interpolation mismatch for ${item.key}`)
    }
  }
  return translated
}

function translationPrompt(target, domain, entries) {
  return `You are the localization editor for WARO, restaurant operations and POS software originally built for Colombia.

Translate every entry into ${target.name} (${target.tag}). Spanish is the semantic source; English is a secondary clarification only.

Editorial rules:
- Write natural, concise product UI for restaurant owners and staff, not literal machine translation.
- Preserve every {interpolation}, Vue I18n escape such as {'@'}, ellipsis, symbol and intentional line break exactly.
- Never translate WARO, WaRo, DIAN, NIT, POS, KDS, INC, IVA, CUFE, UUID, client_uuid, Matias, Casa de Software, or currency codes such as COP.
- Never translate user-provided values, identifiers, fiscal codes, or technical field names.
- In restaurant context: comanda means kitchen/order ticket; arqueo means cash reconciliation; bodega means stockroom/warehouse, never winery; despacho means order dispatch; mesa means restaurant table.
- Keep terminology consistent across all entries in the ${domain} domain.
- For Arabic, use Modern Standard Arabic, RTL prose, and Latin digits for POS operations.
- Return only the requested JSON array. Do not omit or add keys.

Entries:
${JSON.stringify(entries)}`
}

async function requestBatch(target, domain, entries, attempt = 0) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(90_000),
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: translationPrompt(target, domain, entries) }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                key: { type: 'STRING' },
                translation: { type: 'STRING' },
              },
              required: ['key', 'translation'],
            },
          },
        },
      }),
    })
  } catch (error) {
    if (attempt < 7 && (error.name === 'TimeoutError' || error.name === 'AbortError' || error.name === 'TypeError')) {
      await delay(Math.min(60_000, 2_000 * 2 ** attempt))
      return requestBatch(target, domain, entries, attempt + 1)
    }
    throw error
  }

  if (!response.ok) {
    const detail = await response.text()
    if (attempt < 7 && [429, 500, 502, 503, 504].includes(response.status)) {
      await delay(Math.min(60_000, 2_000 * 2 ** attempt))
      return requestBatch(target, domain, entries, attempt + 1)
    }
    throw new Error(`Gemini request failed (${response.status}): ${detail.slice(0, 500)}`)
  }

  try {
    const payload = await response.json()
    const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('')
    return assertBatch(entries, JSON.parse(text))
  } catch (error) {
    if (attempt < 4) {
      await delay(1_000 * (attempt + 1))
      return requestBatch(target, domain, entries, attempt + 1)
    }
    if (entries.length > 1) {
      const middle = Math.ceil(entries.length / 2)
      const first = await requestBatch(target, domain, entries.slice(0, middle))
      const second = await requestBatch(target, domain, entries.slice(middle))
      return new Map([...first, ...second])
    }
    throw error
  }
}

async function translateFile(code, file) {
  const targetPath = path.join(root, 'i18n/locales', code, file)
  const progressPath = `${targetPath}.progress`
  try {
    JSON.parse(await fs.readFile(targetPath, 'utf8'))
    console.log(`${code}/${file} (existing, skipped)`)
    return
  } catch {
    // Missing or invalid catalog: generate it.
  }

  let source = JSON.parse(await fs.readFile(path.join(sourceDir, file), 'utf8'))
  const reference = JSON.parse(await fs.readFile(path.join(referenceDir, file), 'utf8'))
  const sourceLeaves = flatten(source)
  const referenceLeaves = flatten(reference)
  const entries = [...sourceLeaves].map(([key, es]) => ({ key, es, en: referenceLeaves.get(key) ?? '' }))
  let nextEntry = 0

  try {
    const progress = JSON.parse(await fs.readFile(progressPath, 'utf8'))
    if (Number.isInteger(progress.nextEntry) && progress.nextEntry >= 0 && progress.nextEntry <= entries.length) {
      source = progress.value
      nextEntry = progress.nextEntry
      console.log(`${code}/${file} (resuming at ${nextEntry}/${entries.length})`)
    }
  } catch {
    // No valid checkpoint: start the file from the source catalog.
  }

  for (let start = nextEntry; start < entries.length; start += 60) {
    const batch = entries.slice(start, start + 60)
    const translated = await requestBatch(targets[code], file.replace('.json', ''), batch)
    for (const item of batch) assignPath(source, item.key, translated.get(item.key).trim())
    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.writeFile(progressPath, `${JSON.stringify({ nextEntry: start + batch.length, value: source })}\n`)
    console.log(`${code}/${file}: ${Math.min(start + batch.length, entries.length)}/${entries.length}`)
    await delay(300)
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.writeFile(targetPath, `${JSON.stringify(source, null, 2)}\n`)
  await fs.rm(progressPath, { force: true })
  console.log(`${code}/${file} (complete)`)
}

const files = (await fs.readdir(sourceDir)).filter(file => file.endsWith('.json')).sort()
for (const code of localeCodes) {
  for (const file of files) await translateFile(code, file)
}
