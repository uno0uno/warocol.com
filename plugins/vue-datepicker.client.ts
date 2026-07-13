import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import type { Locale } from 'date-fns'
import { computed, defineComponent, h } from 'vue'
import { toDateFnsLocale } from '~/utils/dateLocales'

function normalizeDatePickerLocale(value: unknown, fallback: string): Locale {
  if (value && typeof value === 'object') return value as Locale
  return toDateFnsLocale(typeof value === 'string' && value ? value : fallback)
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
