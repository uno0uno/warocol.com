<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center bg-red-50 p-8 rounded-xl border border-red-200">
        <p class="text-error font-medium mb-4">{{ error }}</p>
        <NuxtLink to="/equipo/salarios" class="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 font-medium">
          Volver a salarios
        </NuxtLink>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Header with Employee Info -->
      <div class="bg-white border border-titan-200 rounded-xl p-6 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div class="flex items-center gap-5">
            <div class="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl text-white shadow-sm"
              :style="{ backgroundColor: employee.color }">
              {{ employee.initials }}
            </div>
            <div>
              <div class="flex items-center gap-3">
                <h1 class="text-2xl font-bold text-text-primary">{{ employee.name }}</h1>
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border"
                  :class="{
                    'bg-amber-50 text-amber-700 border-amber-200': employee.role === 'superuser',
                    'bg-blue-50 text-blue-700 border-blue-200': employee.role === 'admin',
                    'bg-titan-50 text-titan-700 border-titan-200': employee.role === 'employee' || !['superuser', 'admin'].includes(employee.role)
                  }"
                >
                  {{ employee.role_label }}
                </span>
              </div>
              <p class="text-text-secondary mt-1 flex items-center gap-2">
                <EnvelopeIcon class="w-4 h-4" />
                {{ employee.email }}
              </p>
            </div>
          </div>
          
          <div class="flex flex-col sm:flex-row gap-3">
            <NuxtLink
              :to="`/equipo/salarios/${employeeId}/configurar`"
              class="px-5 py-2.5 border border-titan-300 rounded-xl text-text-secondary hover:text-text-primary hover:bg-titan-50 hover:border-titan-400 font-bold flex items-center justify-center gap-2"
            >
              <Cog6ToothIcon class="w-5 h-5" />
              Configurar Salario
            </NuxtLink>
            <NuxtLink
              :to="`/equipo/salarios/${employeeId}/pago`"
              class="px-5 py-2.5 bg-crocus-600 text-white rounded-xl hover:bg-crocus-700 font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <BanknotesIcon class="w-5 h-5" />
              Registrar Pago
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 1. Configuration Card -->
        <div class="bg-white border border-titan-200 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
          <div class="bg-titan-50 px-6 py-4 border-b border-titan-200 flex justify-between items-center">
            <h3 class="font-bold text-text-primary flex items-center gap-2">
              <CurrencyDollarIcon class="w-5 h-5 text-crocus-500" />
              Configuración Actual
            </h3>
            <span v-if="employee.salary_type" class="text-xs font-bold px-2 py-1 rounded bg-white border border-titan-200 text-titan-500 uppercase">
              {{ employee.salary_type === 'smmlv' ? 'SMMLV' : 'FIJO' }}
            </span>
          </div>
          
          <div class="p-6 flex-1 flex flex-col justify-center">
            <div v-if="employee.salary_type" class="space-y-4">
              <div class="text-center">
                <p class="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1">Salario Mensual</p>
                <p class="text-3xl font-black text-text-primary">{{ formatCurrency(employee.calculated_salary) }}</p>
                <p v-if="employee.salary_type === 'smmlv'" class="text-sm font-medium text-text-secondary mt-1">
                  {{ employee.multiplier }}x Salarios Mínimos
                </p>
              </div>
            </div>
            <div v-else class="text-center py-4">
              <div class="w-12 h-12 bg-titan-100 rounded-full flex items-center justify-center mx-auto mb-3 text-titan-400">
                <ExclamationTriangleIcon class="w-6 h-6" />
              </div>
              <p class="text-text-secondary font-medium mb-3">Sin salario configurado</p>
              <NuxtLink
                :to="`/equipo/salarios/${employeeId}/configurar`"
                class="text-crocus-600 font-bold hover:text-crocus-700 text-sm"
              >
                Configurar ahora &rarr;
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- 2. Annual Summary Card -->
        <div class="bg-white border border-titan-200 rounded-xl overflow-hidden shadow-sm">
          <div class="bg-titan-50 px-6 py-4 border-b border-titan-200">
            <h3 class="font-bold text-text-primary flex items-center gap-2">
              <CalendarDaysIcon class="w-5 h-5 text-blue-500" />
              Resumen Anual
            </h3>
          </div>
          <div class="p-6 space-y-5">
            <div>
              <div class="flex justify-between items-end mb-1">
                <p class="text-sm font-medium text-text-secondary">Total Pagado</p>
                <span class="text-xs text-titan-400 font-mono">{{ new Date().getFullYear() }}</span>
              </div>
              <p class="text-2xl font-bold text-text-primary">{{ formatCurrency(stats.totalPaidYear) }}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-titan-100">
              <div>
                <p class="text-xs text-text-secondary mb-1">Pagos Totales</p>
                <p class="text-lg font-bold text-text-primary">{{ stats.paymentsCount }}</p>
              </div>
              <div>
                <p class="text-xs text-text-secondary mb-1">Último Pago</p>
                <p class="text-sm font-bold text-text-primary truncate">
                  {{ stats.lastPaymentDate ? formatDate(stats.lastPaymentDate) : 'N/A' }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Current Month Status -->
        <div class="bg-white border border-titan-200 rounded-xl overflow-hidden shadow-sm">
          <div class="bg-titan-50 px-6 py-4 border-b border-titan-200">
            <h3 class="font-bold text-text-primary flex items-center gap-2">
              <ClipboardDocumentCheckIcon class="w-5 h-5 text-emerald-500" />
              Este Mes
            </h3>
          </div>
          <div class="p-6 space-y-6">
            <div class="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p class="text-xs font-bold text-emerald-700 uppercase mb-1">Pagado</p>
              <p class="text-2xl font-black text-emerald-700">{{ formatCurrency(stats.paidThisMonth) }}</p>
            </div>
            
            <div class="rounded-xl p-4 border" :class="stats.pendingThisMonth > 0 ? 'bg-amber-50 border-amber-100' : 'bg-titan-50 border-titan-100'">
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-xs font-bold uppercase mb-1" :class="stats.pendingThisMonth > 0 ? 'text-amber-700' : 'text-titan-500'">Pendiente</p>
                  <p class="text-xl font-bold" :class="stats.pendingThisMonth > 0 ? 'text-amber-800' : 'text-titan-600'">
                    {{ formatCurrency(stats.pendingThisMonth) }}
                  </p>
                </div>
                <div v-if="stats.pendingThisMonth > 0">
                  <NuxtLink :to="`/equipo/salarios/${employeeId}/pago`" class="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold hover:bg-amber-200">
                    Pagar
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment History list -->
      <div class="bg-white border border-titan-200 rounded-xl shadow-sm">
        <div class="px-6 py-5 border-b border-titan-200 flex justify-between items-center">
          <h3 class="font-bold text-text-primary flex items-center gap-2">
            <ClockIcon class="w-5 h-5 text-titan-400" />
            Historial de Pagos
          </h3>
          <span class="text-xs font-medium text-titan-500 bg-titan-50 px-2 py-1 rounded border border-titan-100">
            {{ payments.length }} registros
          </span>
        </div>

        <div v-if="payments.length === 0" class="text-center py-16 px-6">
          <div class="w-16 h-16 bg-titan-50 rounded-full flex items-center justify-center mx-auto mb-4 text-titan-300">
            <FolderOpenIcon class="w-8 h-8" />
          </div>
          <h4 class="text-lg font-bold text-text-primary mb-1">No hay historial</h4>
          <p class="text-text-secondary mb-6 max-w-sm mx-auto">No se han registrado pagos para este empleado todavía.</p>
          <NuxtLink
            :to="`/equipo/salarios/${employeeId}/pago`"
            class="inline-flex items-center gap-2 text-crocus-600 font-bold hover:text-crocus-700 bg-crocus-50 px-4 py-2 rounded-lg hover:bg-crocus-100"
          >
            <BanknotesIcon class="w-5 h-5" />
            Registrar primer pago
          </NuxtLink>
        </div>

        <!-- Rendered List -->
        <div v-else class="divide-y divide-titan-100">
          <div
            v-for="payment in payments"
            :key="payment.id"
            class="p-6 hover:bg-titan-50"
          >
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <!-- Left: Icon & Info -->
              <div class="flex gap-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border"
                  :class="{
                    'bg-emerald-50 text-emerald-600 border-emerald-100': ['cash', 'transfer'].includes(payment.payment_method),
                    'bg-blue-50 text-blue-600 border-blue-100': payment.payment_method === 'check',
                    'bg-titan-50 text-titan-500 border-titan-200': payment.payment_method === 'other'
                  }">
                  <component :is="getPaymentIcon(payment.payment_method)" class="w-6 h-6" />
                </div>
                
                <div>
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <p class="font-bold text-text-primary text-lg">{{ formatCurrency(payment.payment_amount) }}</p>
                    <span class="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border"
                       :class="{
                        'bg-emerald-50 text-emerald-700 border-emerald-100': ['cash', 'transfer'].includes(payment.payment_method),
                        'bg-titan-50 text-titan-600 border-titan-200': !['cash', 'transfer'].includes(payment.payment_method)
                      }">
                      {{ formatPaymentMethod(payment.payment_method) }}
                    </span>
                  </div>
                  <p class="text-sm text-text-secondary flex items-center gap-1">
                    <CalendarIcon class="w-3.5 h-3.5" />
                    {{ formatDate(payment.payment_date) }}
                  </p>
                  
                  <p v-if="payment.notes" class="text-sm text-text-secondary mt-2 p-2 bg-titan-50 rounded border border-titan-100 inline-block max-w-xl">
                    {{ payment.notes }}
                  </p>
                </div>
              </div>

              <!-- Right: Meta & Attachments -->
              <div class="flex flex-col items-end gap-2">
                 <div v-if="payment.payment_reference" class="text-xs font-medium text-titan-500 flex items-center gap-1 bg-white border border-titan-200 px-2 py-1 rounded">
                   <TagIcon class="w-3 h-3" />
                   Ref: {{ payment.payment_reference }}
                 </div>

                 <!-- Attachments List -->
                 <div v-if="payment.attachments?.length" class="flex flex-wrap justify-end gap-2 mt-1">
                   <a
                     v-for="attachment in payment.attachments"
                     :key="attachment.id"
                     :href="attachment.path"
                     target="_blank"
                     class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-titan-200 rounded-lg text-xs font-bold text-text-secondary hover:text-crocus-600 hover:border-crocus-200 hover:bg-crocus-50 shadow-sm"
                   >
                     <PaperClipIcon class="w-3.5 h-3.5" />
                     {{ attachment.file_name }}
                   </a>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { 
  EnvelopeIcon, 
  Cog6ToothIcon, 
  BanknotesIcon, 
  CurrencyDollarIcon, 
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  FolderOpenIcon,
  CalendarIcon,
  TagIcon,
  PaperClipIcon,
  CreditCardIcon,
  TicketIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const employeeId = route.params.id

useHead({ title: 'Detalle Empleado - Salarios' })

// Fetch employee data with salary and payments
const { data: employeeData, pending: isLoading, error: fetchError } = useAsyncData(
  `employee-salary-detail-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}`),
  {
    server: false,
    default: () => ({ success: false, data: null }),
    transform: (response) => response?.data || null
  }
)

const employee = computed(() => employeeData.value || {
  name: 'Cargando...',
  email: '',
  initials: '...',
  color: '#ccc',
  role: '',
  role_label: ''
})

const payments = computed(() => employeeData.value?.payments || [])

const stats = computed(() => {
  const data = employeeData.value
  if (!data) return {
    totalPaidYear: 0,
    paymentsCount: 0,
    lastPaymentDate: null,
    paidThisMonth: 0,
    pendingThisMonth: 0
  }

  const currentMonth = new Date().toISOString().slice(0, 7)
  const paidThisMonth = (data.payments || [])
    .filter(p => p.period_month === currentMonth)
    .reduce((sum, p) => sum + (p.payment_amount || 0), 0)

  return {
    totalPaidYear: data.total_paid_this_year || 0,
    paymentsCount: data.payments_count || 0,
    lastPaymentDate: data.payments?.[0]?.payment_date || null,
    paidThisMonth,
    pendingThisMonth: Math.max(0, (data.calculated_salary || 0) - paidThisMonth)
  }
})

const error = computed(() => fetchError.value ? 'Error al cargar los datos del empleado' : null)

// Formatters
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatPaymentMethod = (method) => {
  const methods = {
    transfer: 'Transferencia',
    cash: 'Efectivo',
    check: 'Cheque',
    other: 'Otro'
  }
  return methods[method] || method
}

// Icon helper
const getPaymentIcon = (method) => {
  switch (method) {
    case 'cash': return BanknotesIcon
    case 'transfer': return CreditCardIcon
    case 'check': return TicketIcon
    default: return CurrencyDollarIcon
  }
}
</script>
