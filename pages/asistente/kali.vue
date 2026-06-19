<template>
  <section class="mx-auto flex w-full max-w-6xl flex-col gap-4 md:gap-6">
    <header class="flex flex-col gap-4 rounded-lg border border-card-border bg-card-bg p-5 shadow-sm md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <SparklesIcon class="h-6 w-6" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-text-secondary">Asistente</p>
          <h1 class="text-2xl font-semibold text-text-primary">Kali</h1>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex w-fit items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          Beta interna
        </span>
        <span
          class="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
          :class="statusTone.class"
        >
          <span class="h-2 w-2 rounded-full" :class="statusTone.dot" aria-hidden="true" />
          {{ statusTone.label }}
        </span>
      </div>
    </header>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section class="min-h-[620px] rounded-lg border border-card-border bg-card-bg shadow-sm">
        <div class="flex h-full min-h-[620px] flex-col">
          <div class="flex items-center justify-between gap-3 border-b border-card-border px-5 py-4">
            <div>
              <p class="text-sm font-semibold text-text-primary">Conversacion</p>
              <p class="mt-0.5 text-xs text-text-secondary">{{ activeWorkflow.label }}</p>
            </div>
            <button
              v-if="isStreaming"
              type="button"
              class="inline-flex h-9 items-center gap-2 rounded-lg border border-card-border bg-shell-bg px-3 text-sm font-medium text-text-secondary transition hover:border-status-error-border hover:text-status-error-text"
              @click="cancelStream"
            >
              <StopIcon class="h-4 w-4" aria-hidden="true" />
              Cancelar
            </button>
          </div>

          <div ref="messagesContainer" class="flex-1 overflow-y-auto px-4 py-5 md:px-5">
            <div v-if="messages.length === 0" class="flex min-h-[360px] items-center justify-center px-5 py-10">
              <div class="flex max-w-sm flex-col items-center gap-3 text-center">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                  <SparklesIcon class="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p class="text-base font-semibold text-text-primary">Sin conversaciones</p>
                  <p class="mt-1 text-sm text-text-secondary">Elige un workflow y escribe tu mensaje.</p>
                </div>
              </div>
            </div>

            <div v-else class="flex flex-col gap-4">
              <article
                v-for="message in messages"
                :key="message.id"
                class="flex"
                :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[88%] rounded-lg px-4 py-3 text-sm leading-6 md:max-w-[78%]"
                  :class="message.role === 'user'
                    ? 'bg-violet-600 text-white'
                    : 'border border-card-border bg-shell-bg text-text-primary'"
                >
                  <p class="whitespace-pre-wrap break-words">{{ message.content || typingPlaceholder }}</p>
                </div>
              </article>
            </div>
          </div>

          <div class="border-t border-card-border p-4">
            <div v-if="errorMessage" class="mb-3 rounded-lg border border-status-error-border bg-status-error-bg px-3 py-2 text-sm text-status-error-text">
              <div class="flex items-start gap-2">
                <ExclamationTriangleIcon class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p class="min-w-0 break-words">{{ errorMessage }}</p>
              </div>
            </div>

            <form class="flex flex-col gap-3 md:flex-row md:items-end" @submit.prevent="sendMessage">
              <label class="sr-only" for="kali-message">Mensaje para Kali</label>
              <textarea
                id="kali-message"
                v-model="draft"
                rows="2"
                maxlength="2000"
                class="min-h-12 flex-1 resize-none rounded-lg border border-card-border bg-shell-bg px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Pregunta sobre ventas o food cost"
                :disabled="isStreaming"
                @keydown.enter.exact.prevent="sendMessage"
              />
              <div class="flex gap-2">
                <button
                  v-if="lastFailedPrompt"
                  type="button"
                  class="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-card-border bg-card-bg px-4 text-sm font-semibold text-text-secondary transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isStreaming"
                  @click="retryLastPrompt"
                >
                  <ArrowPathIcon class="h-4 w-4" aria-hidden="true" />
                  Reintentar
                </button>
                <button
                  type="submit"
                  class="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="!canSend"
                >
                  <PaperAirplaneIcon class="h-4 w-4" aria-hidden="true" />
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <aside class="flex flex-col gap-4">
        <section class="rounded-lg border border-card-border bg-card-bg p-4 shadow-sm">
          <p class="text-sm font-semibold text-text-primary">Workflows</p>
          <div class="mt-3 grid gap-2">
            <button
              v-for="workflow in workflows"
              :key="workflow.id"
              type="button"
              class="rounded-lg border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60"
              :class="workflow.id === selectedWorkflowId
                ? 'border-violet-200 bg-violet-50 text-violet-800'
                : 'border-card-border bg-shell-bg text-text-primary hover:border-violet-200'"
              :disabled="isStreaming && workflow.id !== selectedWorkflowId"
              @click="selectWorkflow(workflow.id)"
            >
              <span class="block text-sm font-semibold">{{ workflow.label }}</span>
              <span class="mt-1 block text-xs text-text-secondary">{{ workflow.description }}</span>
            </button>
          </div>
        </section>

        <section class="rounded-lg border border-card-border bg-card-bg p-4 shadow-sm">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-semibold text-text-primary">Progreso</p>
            <span class="text-xs text-text-tertiary">{{ progressEvents.length }}/6</span>
          </div>
          <div class="mt-3 flex flex-col gap-2">
            <div
              v-if="progressEvents.length === 0"
              class="rounded-lg border border-dashed border-card-border bg-shell-bg px-3 py-3 text-sm text-text-tertiary"
            >
              Sin actividad
            </div>
            <div
              v-for="event in progressEvents"
              :key="event.id"
              class="rounded-lg border border-card-border bg-shell-bg px-3 py-2"
            >
              <p class="text-sm font-medium text-text-primary">{{ event.title }}</p>
              <p v-if="event.detail" class="mt-0.5 text-xs text-text-secondary">{{ event.detail }}</p>
            </div>
          </div>
        </section>

        <section class="rounded-lg border border-card-border bg-card-bg p-4 shadow-sm">
          <p class="text-sm font-semibold text-text-primary">Estado</p>
          <div class="mt-3 flex items-center gap-2 text-sm text-text-secondary">
            <span class="h-2 w-2 rounded-full" :class="statusTone.dot" aria-hidden="true" />
            {{ statusTone.label }}
          </div>
        </section>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  StopIcon,
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
let activeController: AbortController | null = null

const activeWorkflow = computed(() =>
  workflows.find((workflow) => workflow.id === selectedWorkflowId.value) ?? workflows[0]
)
const isStreaming = computed(() => streamStatus.value === 'streaming')
const canSend = computed(() => draft.value.trim().length >= 3 && !isStreaming.value)
const typingPlaceholder = computed(() => isStreaming.value ? 'Kali esta pensando...' : '')

const statusTone = computed(() => {
  if (streamStatus.value === 'streaming') {
    return {
      label: 'Trabajando',
      class: 'border-violet-200 bg-violet-50 text-violet-700',
      dot: 'bg-violet-500',
    }
  }
  if (streamStatus.value === 'error') {
    return {
      label: 'Revisar error',
      class: 'border-status-error-border bg-status-error-bg text-status-error-text',
      dot: 'bg-status-error-text',
    }
  }
  if (streamStatus.value === 'completed') {
    return {
      label: 'Completado',
      class: 'border-green-200 bg-status-success-bg text-status-success-text',
      dot: 'bg-status-success-text',
    }
  }
  if (streamStatus.value === 'cancelled') {
    return {
      label: 'Cancelado',
      class: 'border-card-border bg-shell-bg text-text-secondary',
      dot: 'bg-text-tertiary',
    }
  }
  return {
    label: 'Disponible para este tenant',
    class: 'border-card-border bg-shell-bg text-text-secondary',
    dot: 'bg-violet-500',
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
    run_started: 'Inicio de ejecucion',
    step_started: 'Paso en curso',
    tool_started: 'Consultando datos',
    tool_finished: 'Consulta terminada',
    llm_started: 'Preparando respuesta',
  }
  return titles[eventName] ?? eventName
}

function progressDetail(data: Record<string, unknown>) {
  const fields = [
    data.result_summary,
    data.tool_name,
    data.name,
    data.step_type,
    data.workflow,
    data.status,
  ]
  return fields.find((field): field is string => typeof field === 'string' && field.length > 0)
}

function addProgress(title: string, detail?: string) {
  progressEvents.value = [
    ...progressEvents.value,
    { id: createId(), title, detail },
  ].slice(-6)
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

async function scrollToBottom() {
  await nextTick()
  const container = messagesContainer.value
  if (!container) return
  container.scrollTop = container.scrollHeight
}

onBeforeUnmount(() => {
  activeController?.abort()
  activeController = null
})
</script>
