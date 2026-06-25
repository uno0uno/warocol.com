<template>
  <section class="mx-auto flex h-[calc(100dvh-10rem)] max-h-[calc(100dvh-10rem)] w-full max-w-[1024px] flex-col overflow-hidden md:h-[calc(100dvh-9.5rem)] md:max-h-[calc(100dvh-9.5rem)]">
    <div class="min-h-0 flex-1 overflow-hidden">
      <section class="h-full min-h-0 overflow-hidden rounded-lg border border-card-border bg-card-bg shadow-sm">
        <div class="relative flex h-full min-h-0 flex-col overflow-hidden">
          <div ref="messagesContainer" class="kali-scroll flex-1 overflow-y-auto bg-card-bg px-4 pb-28 pt-5 md:px-8 md:pb-28 md:pt-8">
            <div v-if="messages.length === 0" class="flex min-h-[360px] items-center justify-center px-5 py-8">
              <div class="flex max-w-md flex-col items-center gap-6 text-center">
                <p class="font-serif text-3xl font-bold leading-tight text-text-primary md:text-4xl">
                  Listo para conversar
                </p>
                <SparklesIcon class="h-32 w-32 text-slate-700" aria-hidden="true" />
              </div>
            </div>

            <div v-else class="flex flex-col gap-5 md:gap-6">
              <article
                v-for="message in messages"
                :key="message.id"
                class="flex w-full"
                :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="kali-message"
                  :class="message.role === 'user'
                    ? 'kali-user-message'
                    : 'kali-assistant-report'"
                >
                  <div
                    v-if="message.role === 'assistant' && !message.content && isStreaming"
                    class="kali-assistant-loading"
                    aria-live="polite"
                  >
                    <div class="inline-flex items-center gap-2 text-sm">
                      <span>Procesando desde hace {{ processingElapsedLabel }}</span>
                      <CommonsInlineDots :size="5" color="currentColor" aria-label="Kali esta cargando" />
                    </div>
                    <p class="mt-3 text-sm leading-6 text-text-secondary">{{ kaliLoadingPhrase }}</p>
                    <ol v-if="visibleProgressEvents.length" class="mt-5 space-y-3 border-t border-stone-200 pt-5">
                      <li
                        v-for="event in visibleProgressEvents"
                        :key="event.id"
                        class="activity-row flex min-w-0 items-center gap-2"
                      >
                        <component
                          :is="progressIcon(event.title)"
                          class="h-4 w-4 shrink-0"
                          :class="progressIconClass(event.title)"
                          aria-hidden="true"
                        />
                        <span class="truncate text-xs font-medium text-text-secondary">{{ event.title }}</span>
                      </li>
                    </ol>
                  </div>
                  <div
                    v-else-if="message.role === 'assistant'"
                    class="kali-report-markdown"
                    v-html="renderMarkdown(message.content)"
                  />
                  <p v-else class="whitespace-pre-wrap break-words">{{ message.content }}</p>
                </div>
              </article>
            </div>
          </div>

          <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-card-bg via-card-bg/95 to-transparent px-4 pb-4 pt-8">
            <div v-if="errorMessage" class="pointer-events-auto mb-3 rounded-lg border border-status-error-border bg-status-error-bg px-3 py-2 text-sm text-status-error-text">
              <div class="flex items-start gap-2">
                <ExclamationTriangleIcon class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p class="min-w-0 break-words">{{ errorMessage }}</p>
              </div>
            </div>

            <form class="pointer-events-auto flex flex-col gap-2" @submit.prevent="sendMessage">
              <label class="sr-only" for="kali-message">Mensaje para Kali</label>
              <div class="flex items-center gap-2 rounded-xl border border-card-border bg-white px-4 py-3 shadow-sm transition focus-within:border-primary">
                <input
                  id="kali-message"
                  v-model="draft"
                  type="text"
                  maxlength="2000"
                  class="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-sm leading-6 text-text-primary outline-none ring-0 placeholder:text-text-tertiary focus:border-transparent focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Pregunta sobre ventas, precios de platos o tu restaurante"
                  :disabled="isStreaming"
                  @keydown.enter.exact.prevent="sendMessage"
                />
                <button
                  v-if="lastFailedPrompt"
                  type="button"
                  class="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  :disabled="isStreaming"
                  @click="retryLastPrompt"
                >
                  <ArrowPathIcon class="h-4 w-4" aria-hidden="true" />
                  Reintentar
                </button>
                <button
                  v-if="isStreaming"
                  type="button"
                  class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-status-error-text transition hover:bg-status-error-bg disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-status-error-border/60 active:scale-[0.96]"
                  aria-label="Cancelar respuesta"
                  @click="cancelStream"
                >
                  <StopIcon class="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  v-else
                  type="submit"
                  class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-primary transition hover:bg-primary/8 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.96]"
                  :disabled="!canSend"
                  aria-label="Enviar mensaje"
                >
                  <PaperAirplaneIcon class="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  StopIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'

definePageMeta({
  layout: 'dashboard',
  module: 'analitica',
  feature: 'kali_enabled',
})

useHead({
  title: 'Kali',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

type MessageRole = 'user' | 'assistant'
type StreamStatus = 'idle' | 'streaming' | 'completed' | 'error' | 'cancelled'

interface ChatMessage {
  id: string
  role: MessageRole
  content: string
}

interface ProgressEvent {
  id: string
  title: string
  detail?: string
}

interface ParsedSseEvent {
  event: string
  data: Record<string, unknown>
}

const AGENT_ENDPOINT = '/api/ai/sales/messages/stream'
const draft = ref('')
const messages = ref<ChatMessage[]>([])
const progressEvents = ref<ProgressEvent[]>([])
const streamStatus = ref<StreamStatus>('idle')
const errorMessage = ref('')
const lastFailedPrompt = ref('')
const lastFailedAssistantId = ref('')
const conversationId = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const processingStartedAt = ref<number | null>(null)
const processingNow = ref(Date.now())
let activeController: AbortController | null = null
let processingTimer: ReturnType<typeof setInterval> | null = null

const isStreaming = computed(() => streamStatus.value === 'streaming')
const canSend = computed(() => draft.value.trim().length >= 3 && !isStreaming.value)
const visibleProgressEvents = computed(() => progressEvents.value.slice(-5))
const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})
const emojiPattern = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu
const processingElapsedLabel = computed(() => {
  if (!processingStartedAt.value) return '0s'
  return formatElapsed(processingNow.value - processingStartedAt.value)
})
const {
  currentPhrase: kaliLoadingPhrase,
  start: startKaliLoadingPhrases,
  stop: stopKaliLoadingPhrases,
} = useLoadingPhrases([
  'Consultando datos',
  'Validando metricas',
  'Preparando respuesta',
])

watch(isStreaming, (loading) => {
  if (loading) {
    startKaliLoadingPhrases()
    startProcessingTimer()
  } else {
    stopKaliLoadingPhrases()
    stopProcessingTimer()
  }
})

async function sendMessage() {
  const prompt = draft.value.trim()
  if (prompt.length < 3 || isStreaming.value) return
  draft.value = ''
  await startStream(prompt)
}

async function retryLastPrompt() {
  const prompt = lastFailedPrompt.value
  if (!prompt || isStreaming.value) return
  removeMessage(lastFailedAssistantId.value)
  lastFailedAssistantId.value = ''
  await startStream(prompt, { appendUserMessage: false })
}

function cancelStream() {
  activeController?.abort()
  activeController = null
  streamStatus.value = 'cancelled'
  addProgress('Solicitud cancelada')
}

async function startStream(prompt: string, options: { appendUserMessage?: boolean } = {}) {
  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  const assistantMessageId = createId()
  const appendUserMessage = options.appendUserMessage !== false

  errorMessage.value = ''
  lastFailedPrompt.value = ''
  lastFailedAssistantId.value = ''
  progressEvents.value = []
  streamStatus.value = 'streaming'
  if (appendUserMessage) {
    messages.value.push({ id: createId(), role: 'user', content: prompt })
  }
  messages.value.push({ id: assistantMessageId, role: 'assistant', content: '' })
  await scrollToBottom()

  try {
    const body: Record<string, string> = { question: prompt }
    if (conversationId.value) body.conversation_id = conversationId.value

    const response = await fetch(AGENT_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok || !response.body) {
      throw new Error(setupErrorMessage(response.status))
    }

    await consumeStream(response.body, assistantMessageId, controller.signal)

    if (activeController === controller) {
      activeController = null
      if (streamStatus.value === 'streaming') streamStatus.value = 'completed'
    }
  } catch (err) {
    if (controller.signal.aborted) return
    activeController = null
    markStreamFailed(err, prompt, assistantMessageId)
  }
}

async function consumeStream(
  body: ReadableStream<Uint8Array>,
  assistantMessageId: string,
  signal: AbortSignal
) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split(/\r?\n\r?\n/)
      buffer = frames.pop() ?? ''
      for (const frame of frames) {
        handleSseEvent(parseSseFrame(frame), assistantMessageId)
      }
    }

    buffer += decoder.decode()
    if (buffer.trim()) {
      handleSseEvent(parseSseFrame(buffer), assistantMessageId)
    }
  } finally {
    reader.releaseLock()
  }
}

function parseSseFrame(frame: string): ParsedSseEvent {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of frame.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  const dataText = dataLines.join('\n')
  let data: Record<string, unknown> = {}
  if (dataText) {
    try {
      data = JSON.parse(dataText) as Record<string, unknown>
    } catch {
      data = { raw: dataText }
    }
  }

  return { event, data }
}

function handleSseEvent(parsed: ParsedSseEvent, assistantMessageId: string) {
  const eventName = typeof parsed.data.event === 'string' ? parsed.data.event : parsed.event

  if (eventName === 'token') {
    const token = typeof parsed.data.text === 'string' ? parsed.data.text : ''
    if (token) appendAssistantText(assistantMessageId, token)
    return
  }

  if (eventName === 'final') {
    const nextConversationId = parsed.data.conversation_id
    if (typeof nextConversationId === 'string') {
      conversationId.value = nextConversationId
    }
    fillEmptyAssistantFromSummary(assistantMessageId, parsed.data)
    streamStatus.value = 'completed'
    addProgress('Respuesta lista', progressDetail(parsed.data))
    return
  }

  if (eventName === 'error') {
    throw new Error(streamErrorMessage(parsed.data))
  }

  addProgress(progressTitle(eventName), progressDetail(parsed.data))
}

function appendAssistantText(messageId: string, text: string) {
  const message = messages.value.find((item) => item.id === messageId)
  if (!message) return
  message.content += text
  void scrollToBottom()
}

function fillEmptyAssistantFromSummary(messageId: string, data: Record<string, unknown>) {
  const message = messages.value.find((item) => item.id === messageId)
  const summary = typeof data.summary === 'string' ? data.summary : ''
  if (message && !message.content.trim() && summary) {
    message.content = summary
    void scrollToBottom()
  }
}

function markStreamFailed(err: unknown, prompt: string, assistantMessageId: string) {
  streamStatus.value = 'error'
  lastFailedPrompt.value = prompt
  lastFailedAssistantId.value = assistantMessageId
  errorMessage.value = err instanceof Error ? err.message : 'No se pudo completar la respuesta.'
  fillEmptyAssistantWithError(assistantMessageId)
  addProgress('Error en la respuesta', errorMessage.value)
}

function fillEmptyAssistantWithError(messageId: string) {
  const message = messages.value.find((item) => item.id === messageId)
  if (message && !message.content.trim()) {
    message.content = 'No pude completar esta respuesta.'
  }
}

function removeMessage(messageId: string) {
  if (!messageId) return
  messages.value = messages.value.filter((message) => message.id !== messageId)
}

function progressTitle(eventName: string) {
  const titles: Record<string, string> = {
    run_started: 'Inicio',
    step_started: 'Router',
    tool_started: 'Consultando',
    tool_finished: 'Datos listos',
    llm_started: 'Redactando',
  }
  return titles[eventName] ?? eventName
}

function progressDetail(data: Record<string, unknown>) {
  const resultSummary = typeof data.result_summary === 'string' ? data.result_summary : ''
  if (resultSummary.startsWith('Returned data object')) return 'Datos recibidos'
  if (resultSummary.startsWith('Returned')) return 'Consulta completada'

  const fields = [
    data.tool_name,
    data.name,
    data.workflow,
    data.status,
    data.step_type,
    resultSummary,
  ]
  return fields.find((field): field is string => typeof field === 'string' && field.length > 0)
}

function addProgress(title: string, detail?: string) {
  progressEvents.value = [
    ...progressEvents.value,
    { id: createId(), title, detail },
  ].slice(-24)
  void scrollToBottom()
}

function progressIcon(title: string) {
  if (title.toLowerCase().includes('error')) return ExclamationTriangleIcon
  if (title === 'Router') return ArrowsRightLeftIcon
  if (title === 'Consultando') return WrenchScrewdriverIcon
  if (title === 'Datos listos') return CircleStackIcon
  if (title === 'Redactando') return ChatBubbleLeftRightIcon
  if (title === 'Respuesta lista') return CheckCircleIcon
  return SparklesIcon
}

function progressIconClass(title: string) {
  if (title.toLowerCase().includes('error')) return 'text-status-error-text'
  if (['Respuesta lista', 'Datos listos'].includes(title)) return 'text-status-success-text'
  if (['Consultando', 'Redactando', 'Router'].includes(title)) return 'text-primary activity-icon-active'
  return 'text-text-tertiary'
}

function renderMarkdown(content: string) {
  if (!content.trim()) return ''
  return markdownRenderer.render(content.replace(emojiPattern, '').trim())
}

function setupErrorMessage(status: number) {
  if (status === 401) return 'Tu sesion expiro. Vuelve a iniciar sesion para usar Kali.'
  if (status === 403) return 'Kali no esta habilitado para este tenant o modulo.'
  if (status >= 500) return 'El servicio de Kali no respondio. Intenta de nuevo en unos segundos.'
  return 'No se pudo iniciar la conversacion con Kali.'
}

function streamErrorMessage(data: Record<string, unknown>) {
  const error = data.error
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return 'Kali no pudo completar esta respuesta.'
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function startProcessingTimer() {
  processingStartedAt.value = Date.now()
  processingNow.value = processingStartedAt.value
  if (processingTimer) clearInterval(processingTimer)
  processingTimer = setInterval(() => {
    processingNow.value = Date.now()
  }, 1000)
}

function stopProcessingTimer() {
  if (processingTimer) {
    clearInterval(processingTimer)
    processingTimer = null
  }
}

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes <= 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

async function scrollToBottom() {
  await nextTick()
  const container = messagesContainer.value
  if (!container) return
  container.scrollTop = container.scrollHeight
}

onBeforeUnmount(() => {
  activeController?.abort()
  activeController = null
  stopProcessingTimer()
})
</script>

<style scoped>
.kali-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(214 211 209) transparent;
}

.kali-scroll::-webkit-scrollbar {
  width: 8px;
}

.kali-scroll::-webkit-scrollbar-thumb {
  background-color: rgb(214 211 209);
  background-clip: content-box;
  border: 2px solid transparent;
  border-radius: 999px;
}

.kali-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.kali-message {
  min-width: 0;
}

.kali-user-message {
  max-width: min(90%, 42rem);
  border-radius: 1rem 1rem 0.375rem 1rem;
  background: hsl(var(--ebony-900));
  color: white;
  padding: 0.75rem 1rem;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 0.925rem;
  font-weight: 600;
  line-height: 1.65;
  box-shadow: 0 8px 24px hsl(var(--ebony-900) / 0.12);
}

.kali-assistant-report {
  width: 100%;
  max-width: none;
  padding: 0.25rem 0 0.75rem;
  color: hsl(var(--ebony-900));
}

.kali-assistant-loading {
  max-width: 34rem;
  border-left: 2px solid hsl(var(--crocus-400));
  padding-left: 1rem;
  color: hsl(var(--text-secondary));
}

.kali-report-markdown {
  color: hsl(var(--ebony-900));
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.72;
  letter-spacing: 0;
  max-width: none;
  text-rendering: optimizeLegibility;
}

.kali-report-markdown :deep(*) {
  overflow-wrap: anywhere;
}

.kali-report-markdown :deep(> * + *) {
  margin-top: 1.15rem;
}

.kali-report-markdown :deep(p) {
  margin: 0;
  max-width: 76rem;
  color: hsl(var(--ebony-800));
}

.kali-report-markdown :deep(p:first-child) {
  color: hsl(var(--ebony-900));
  font-size: 1.05rem;
  font-weight: 500;
  line-height: 1.68;
}

.kali-report-markdown :deep(h1),
.kali-report-markdown :deep(h2),
.kali-report-markdown :deep(h3) {
  max-width: 76rem;
  color: hsl(var(--ebony-900));
  font-family: Quantico, ui-sans-serif, system-ui, sans-serif;
  font-weight: 400;
  letter-spacing: 0;
}

.kali-report-markdown :deep(h1) {
  margin: 2.25rem 0 0;
  font-size: clamp(1.35rem, 1.15rem + 0.7vw, 1.85rem);
  line-height: 1.16;
}

.kali-report-markdown :deep(h2) {
  margin: 2.25rem 0 0;
  padding-top: 1rem;
  border-top: 1px solid hsl(var(--titan-300));
  color: hsl(var(--crocus-800));
  font-size: clamp(1.15rem, 1.04rem + 0.38vw, 1.42rem);
  line-height: 1.24;
}

.kali-report-markdown :deep(h3) {
  margin: 2rem 0 0;
  border-left: 3px solid hsl(var(--crocus-500));
  color: hsl(var(--ebony-800));
  padding-left: 0.65rem;
  font-size: 1.05rem;
  line-height: 1.28;
}

.kali-report-markdown :deep(strong) {
  color: hsl(var(--ebony-900));
  font-weight: 700;
}

.kali-report-markdown :deep(em) {
  color: hsl(var(--ebony-700));
}

.kali-report-markdown :deep(ul),
.kali-report-markdown :deep(ol) {
  display: grid;
  gap: 0.7rem;
  margin: 1.25rem 0 0;
  padding-left: 1.35rem;
  max-width: 76rem;
  color: hsl(var(--ebony-800));
}

.kali-report-markdown :deep(li) {
  padding-left: 0.15rem;
}

.kali-report-markdown :deep(li::marker) {
  color: hsl(var(--crocus-600));
  font-family: Quantico, ui-sans-serif, system-ui, sans-serif;
  font-size: 0.82em;
}

.kali-report-markdown :deep(blockquote) {
  margin: 1.75rem 0 0;
  max-width: 76rem;
  border-left: 3px solid hsl(var(--crocus-500));
  border-radius: 0.75rem;
  background: hsl(var(--crocus-50) / 0.62);
  padding: 0.9rem 1rem 0.9rem 1.1rem;
  color: hsl(var(--ebony-700));
}

.kali-report-markdown :deep(hr) {
  margin: 2.25rem 0;
  border: 0;
  border-top: 1px solid hsl(var(--titan-300));
}

.kali-report-markdown :deep(code) {
  border-radius: 0.35rem;
  border: 1px solid hsl(var(--crocus-200));
  background: hsl(var(--crocus-50));
  color: hsl(var(--crocus-700));
  padding: 0.08rem 0.34rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.86em;
}

.kali-report-markdown :deep(pre) {
  overflow-x: auto;
  border-radius: 0.75rem;
  background: hsl(var(--ebony-900));
  color: hsl(var(--titan-100));
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.65;
}

.kali-report-markdown :deep(pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
}

.kali-report-markdown :deep(table) {
  display: inline-block;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  border: 1px solid hsl(var(--titan-400));
  border-radius: 0.625rem;
  background: hsl(var(--titan-50));
  font-size: 0.875rem;
  line-height: 1.45;
  box-shadow: 0 2px 8px hsl(var(--ebony-900) / 0.07);
  -webkit-overflow-scrolling: touch;
}

.kali-report-markdown :deep(thead) {
  border-bottom: 2px solid hsl(var(--titan-400));
  background: hsl(var(--titan-300));
}

.kali-report-markdown :deep(th) {
  color: hsl(var(--ebony-800));
  font-family: Quantico, ui-sans-serif, system-ui, sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.85rem 0.9rem;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.kali-report-markdown :deep(td) {
  border-top: 1px solid hsl(var(--titan-100));
  color: hsl(var(--ebony-700));
  padding: 0.9rem 1rem;
  vertical-align: top;
  white-space: nowrap;
}

.kali-report-markdown :deep(tbody tr) {
  transition: background-color 100ms ease;
}

.kali-report-markdown :deep(tbody tr:nth-child(even)) {
  background: hsl(var(--titan-100));
}

.kali-report-markdown :deep(tbody tr:hover) {
  background: hsl(var(--crocus-50));
}

.kali-report-markdown :deep(tbody td:first-child) {
  color: hsl(var(--ebony-900));
  font-weight: 700;
}

.kali-report-markdown :deep(a) {
  color: hsl(var(--crocus-600));
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;
  text-decoration-color: hsl(var(--crocus-300));
  transition: color 150ms ease, text-decoration-color 150ms ease;
}

.kali-report-markdown :deep(a:hover) {
  color: hsl(var(--crocus-700));
  text-decoration-color: hsl(var(--crocus-500));
}

.activity-row {
  animation: activity-fade-in 220ms ease-out both;
}

.activity-icon-active {
  animation: activity-pulse 1.4s ease-in-out infinite;
}

@keyframes activity-fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes activity-pulse {
  0%,
  100% {
    opacity: 0.75;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .activity-row,
  .activity-icon-active {
    animation: none;
  }
}
</style>
