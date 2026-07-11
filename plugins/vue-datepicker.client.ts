import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { enUS, es } from 'date-fns/locale'
import { computed, defineComponent, h } from 'vue'

function normalizeDatePickerLocale(value: unknown, fallback: string) {
  if (value && typeof value === 'object') return value
  const raw = typeof value === 'string' && value ? value : fallback
  return raw.toLowerCase().startsWith('en') ? enUS : es
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('VueDatePicker', defineComponent({
    name: 'VueDatePicker',
    inheritAttrs: false,
    props: {
      locale: {
        type: [String, Object],
        default: undefined,
      },
    },
    setup(props, { attrs, slots }) {
      const { locale: appLocale } = useI18n({ useScope: 'global' })
      const resolvedLocale = computed(() => normalizeDatePickerLocale(props.locale, appLocale.value))

      return () => h(VueDatePicker, {
        ...attrs,
        locale: resolvedLocale.value,
      }, slots)
    },
  }))
})
