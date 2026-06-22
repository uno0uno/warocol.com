<template>
  <section class="mx-auto flex w-full max-w-7xl flex-col">
    <div class="min-h-[calc(100vh-7rem)]">
      <section class="min-h-0 overflow-hidden rounded-lg border border-card-border bg-card-bg shadow-sm">
        <div class="flex h-[calc(100vh-7rem)] min-h-[620px] flex-col">
          <div v-if="isStreaming" class="flex justify-end border-b border-card-border px-4 py-3 md:px-5">
            <button
              type="button"
              class="inline-flex h-9 items-center gap-2 rounded-lg border border-card-border bg-card-bg px-3 text-sm font-medium text-text-secondary transition hover:border-status-error-border hover:text-status-error-text focus:outline-none focus:ring-2 focus:ring-primary/20"
              @click="cancelStream"
            >
              <StopIcon class="h-4 w-4" aria-hidden="true" />
              Cancelar
            </button>
          </div>

          <div ref="messagesContainer" class="kali-scroll flex-1 overflow-y-auto bg-[#fbfaf8] px-4 py-5 md:px-6">
            <div v-if="messages.length === 0" class="flex min-h-[360px] items-center justify-center px-5 py-10">
              <div class="flex max-w-md flex-col items-center gap-3 text-center">
                <div>
                  <p class="text-lg font-semibold text-text-primary">Listo para conversar</p>
                  <p class="mt-2 text-sm leading-6 text-text-secondary">
                    Preguntale por ventas, food cost o cualquier senal del negocio que quieras entender.
                  </p>
                </div>
              </div>
            </div>

            <div v-else class="flex flex-col gap-8 md:gap-10">
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

          <div class="border-t border-card-border bg-card-bg p-3 md:p-4">
            <div v-if="errorMessage" class="mb-3 rounded-lg border border-status-error-border bg-status-error-bg px-3 py-2 text-sm text-status-error-text">
              <div class="flex items-start gap-2">
                <ExclamationTriangleIcon class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p class="min-w-0 break-words">{{ errorMessage }}</p>
              </div>
            </div>

            <form class="flex flex-col gap-2" @submit.prevent="sendMessage">
              <label class="sr-only" for="kali-message">Mensaje para Kali</label>
              <div class="rounded-xl border border-card-border bg-white shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <textarea
                  id="kali-message"
                  v-model="draft"
                  rows="2"
                  maxlength="2000"
                  class="min-h-20 w-full resize-none rounded-t-xl border-0 bg-transparent px-4 py-3 text-sm leading-6 text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Pregunta sobre ventas o food cost"
                  :disabled="isStreaming"
                  @keydown.enter.exact.prevent="sendMessage"
                />
                <div class="flex items-center justify-between gap-3 px-3 pb-3">
                  <div class="flex min-w-0 items-center gap-1" aria-label="Workflows">
                    <button
                      v-for="workflow in workflows"
                      :key="workflow.id"
                      type="button"
                      class="h-8 rounded-md px-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.98]"
                      :class="workflow.id === selectedWorkflowId
                        ? 'bg-primary text-white shadow-sm shadow-primary/20'
                        : 'text-text-secondary hover:bg-primary/8 hover:text-primary'"
                      :disabled="isStreaming && workflow.id !== selectedWorkflowId"
                      :title="workflow.description"
                      @click="selectWorkflow(workflow.id)"
                    >
                      {{ workflow.label }}
                    </button>
                  </div>
                  <div class="flex shrink-0 items-center gap-2">
                    <button
                      v-if="lastFailedPrompt"
                      type="button"
                      class="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      :disabled="isStreaming"
                      @click="retryLastPrompt"
                    >
                      <ArrowPathIcon class="h-4 w-4" aria-hidden="true" />
                      Reintentar
                    </button>
                    <button
                      type="submit"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white shadow-sm shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-[0.96]"
                      :disabled="!canSend"
                      aria-label="Enviar mensaje"
                    >
                      <PaperAirplaneIcon class="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
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

type WorkflowId = 'sales' | 'food_cost'
type MessageRole = 'user' | 'assistant'
type StreamStatus = 'idle' | 'streaming' | 'completed' | 'error' | 'cancelled'

interface WorkflowOption {
  id: WorkflowId
  label: string
  description: string
  endpoint: string
}

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

const workflows: WorkflowOption[] = [
  {
    id: 'sales',
    label: 'Ventas',
    description: 'Metricas, ordenes y tendencias comerciales',
    endpoint: '/api/ai/sales/messages/stream',
  },
  {
    id: 'food_cost',
    label: 'Food cost',
    description: 'Costos, recetas y rentabilidad de menu',
    endpoint: '/api/ai/food-cost/messages/stream',
  },
]

const draft = ref('')
const messages = ref<ChatMessage[]>([])
const progressEvents = ref<ProgressEvent[]>([])
const selectedWorkflowId = ref<WorkflowId>('sales')
const streamStatus = ref<StreamStatus>('idle')
const errorMessage = ref('')
const lastFailedPrompt = ref('')
const lastFailedAssistantId = ref('')
const conversationIds = ref<Partial<Record<WorkflowId, string>>>({})
const messagesContainer = ref<HTMLElement | null>(null)
const processingStartedAt = ref<number | null>(null)
const processingNow = ref(Date.now())
let activeController: AbortController | null = null
let processingTimer: ReturnType<typeof setInterval> | null = null

const activeWorkflow = computed(() =>
  workflows.find((workflow) => workflow.id === selectedWorkflowId.value) ?? workflows[0]
)
const isStreaming = computed(() => streamStatus.value === 'streaming')
const canSend = computed(() => draft.value.trim().length >= 3 && !isStreaming.value)
const visibleProgressEvents = computed(() => progressEvents.value.slice(-5))
const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})
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

function selectWorkflow(workflowId: WorkflowId) {
  if (workflowId === selectedWorkflowId.value) return
  if (isStreaming.value) cancelStream()
  selectedWorkflowId.value = workflowId
  progressEvents.value = []
  errorMessage.value = ''
  streamStatus.value = messages.value.length ? 'completed' : 'idle'
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
  const workflow = activeWorkflow.value
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
    const conversationId = conversationIds.value[workflow.id]
    if (conversationId) body.conversation_id = conversationId

    const response = await fetch(workflow.endpoint, {
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
    const conversationId = parsed.data.conversation_id
    if (typeof conversationId === 'string') {
      conversationIds.value[selectedWorkflowId.value] = conversationId
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
  return markdownRenderer.render(content)
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
  font-size: clamp(1.15rem, 1.04rem + 0.38vw, 1.42rem);
  line-height: 1.24;
}

.kali-report-markdown :deep(h3) {
  margin: 2rem 0 0;
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
  border-left: 2px solid hsl(var(--crocus-500));
  padding: 0.25rem 0 0.25rem 1.1rem;
  color: hsl(var(--ebony-700));
}

.kali-report-markdown :deep(hr) {
  margin: 2.25rem 0;
  border: 0;
  border-top: 1px solid hsl(var(--titan-300));
}

.kali-report-markdown :deep(code) {
  border-radius: 0.35rem;
  background: hsl(var(--titan-200) / 0.7);
  color: hsl(var(--ebony-900));
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
  display: block;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  border-top: 1px solid hsl(var(--ebony-900));
  border-bottom: 1px solid hsl(var(--ebony-900));
  font-size: 0.875rem;
  line-height: 1.45;
  -webkit-overflow-scrolling: touch;
}

.kali-report-markdown :deep(thead) {
  border-bottom: 1px solid hsl(var(--titan-400));
}

.kali-report-markdown :deep(th) {
  color: hsl(var(--ebony-900));
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
  border-top: 1px solid hsl(var(--titan-200));
  color: hsl(var(--ebony-800));
  padding: 0.85rem 0.9rem;
  vertical-align: top;
  white-space: nowrap;
}

.kali-report-markdown :deep(tbody tr:nth-child(even)) {
  background: hsl(var(--titan-100) / 0.45);
}

.kali-report-markdown :deep(a) {
  color: hsl(var(--crocus-700));
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;
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
