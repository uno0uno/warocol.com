import { addCollection } from '@iconify/vue'
import heroicons from '@iconify-json/heroicons/icons.json'
import mdi from '@iconify-json/mdi/icons.json'

export default defineNuxtPlugin(() => {
  addCollection(heroicons)
  addCollection(mdi)
})
