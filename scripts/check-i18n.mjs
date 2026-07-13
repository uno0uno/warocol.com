import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { baseCompile } from '@intlify/message-compiler'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const localeRoot = path.join(root, 'i18n/locales')
const definitionsSource = fs.readFileSync(path.join(root, 'utils/appLocales.ts'), 'utf8')
const localeCodes = [...definitionsSource.matchAll(/\{ code: '([a-z]+)'/g)].map(match => match[1])
const enabledCodes = [...definitionsSource.matchAll(/\{ code: '([a-z]+)'[^\n]+enabled: true/g)].map(match => match[1])
const files = [...definitionsSource.matchAll(/^\s+'([^']+\.json)',?$/gm)].map(match => match[1])
const reviewStatus = JSON.parse(fs.readFileSync(path.join(root, 'i18n/review-status.json'), 'utf8'))
const errors = []
const checkAll = process.argv.includes('--all')
const localeFlagIndex = process.argv.indexOf('--locale')
const requestedLocale = localeFlagIndex >= 0 ? process.argv[localeFlagIndex + 1] : undefined

if (requestedLocale && !localeCodes.includes(requestedLocale)) {
  throw new Error(`Unsupported locale: ${requestedLocale}`)
}

const checkedCodes = checkAll
  ? localeCodes
  : requestedLocale
    ? [requestedLocale]
    : enabledCodes

function flatten(value, prefix = '', result = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, next, result)
    else result.set(next, child)
  }
  return result
}

function variables(message) {
  return [...String(message).matchAll(/\{([^{}]+)\}/g)]
    .map(match => match[1])
    .filter(value => value !== "'@'")
    .sort()
}

for (const code of localeCodes) {
  if (!(code in reviewStatus)) errors.push(`${code}: missing review status`)
  if (enabledCodes.includes(code) && !reviewStatus[code]?.reviewed) {
    errors.push(`${code}: enabled before human review approval`)
  }

  if (!checkedCodes.includes(code)) continue

  for (const file of files) {
    const sourcePath = path.join(localeRoot, 'es', file)
    const targetPath = path.join(localeRoot, code, file)
    if (!fs.existsSync(targetPath)) {
      errors.push(`${code}/${file}: missing file`)
      continue
    }

    let source
    let target
    try {
      source = flatten(JSON.parse(fs.readFileSync(sourcePath, 'utf8')))
      target = flatten(JSON.parse(fs.readFileSync(targetPath, 'utf8')))
    } catch (error) {
      errors.push(`${code}/${file}: invalid JSON (${error.message})`)
      continue
    }

    for (const key of source.keys()) if (!target.has(key)) errors.push(`${code}/${file}: missing key ${key}`)
    for (const key of target.keys()) if (!source.has(key)) errors.push(`${code}/${file}: unexpected key ${key}`)

    for (const [key, value] of target) {
      if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`${code}/${file}:${key}: value must be a non-empty string`)
        continue
      }
      const expectedVariables = JSON.stringify(variables(source.get(key)))
      const actualVariables = JSON.stringify(variables(value))
      if (expectedVariables !== actualVariables) {
        errors.push(`${code}/${file}:${key}: interpolation mismatch ${actualVariables} != ${expectedVariables}`)
      }
      try {
        const compiled = baseCompile(value, { onError: error => { throw error } })
        if (compiled.errors?.length) throw compiled.errors[0]
      } catch (error) {
        errors.push(`${code}/${file}:${key}: invalid Vue I18n message (${error.message})`)
      }
    }
  }
}

if (errors.length) {
  console.error(`i18n validation failed with ${errors.length} error(s):`)
  console.error(errors.slice(0, 100).map(error => `- ${error}`).join('\n'))
  if (errors.length > 100) console.error(`...and ${errors.length - 100} more`)
  process.exit(1)
}

console.log(`i18n validation passed: ${checkedCodes.length} locales × ${files.length} files`)
