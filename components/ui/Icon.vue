<template>
  <component :is="iconComponent" :class="['inline-block', className]" />
</template>

<script setup>
import { computed } from 'vue'
import { 
  PlusIcon, 
  ArrowPathIcon, 
  MagnifyingGlassIcon,
  CalendarIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  EllipsisVerticalIcon,
  InboxIcon,
  Squares2X2Icon,
  Bars3Icon,
  MapPinIcon,
  CalendarDaysIcon,
  ClockIcon,
  UsersIcon,
  HeartIcon,
  EyeIcon,
  RssIcon,
  SunIcon,
  MoonIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  class: {
    type: String,
    default: ''
  }
})

const className = computed(() => props.class)

const iconComponent = computed(() => {
  const iconMap = {
    'heroicons:plus': PlusIcon,
    'heroicons:arrow-path': ArrowPathIcon,
    'heroicons:magnifying-glass': MagnifyingGlassIcon,
    'heroicons:calendar': CalendarIcon,
    'heroicons:information-circle': InformationCircleIcon,
    'heroicons:exclamation-triangle': ExclamationTriangleIcon,
    'heroicons:check-circle': CheckCircleIcon,
    'heroicons:x-circle': XCircleIcon,
    'heroicons:x-mark': XMarkIcon,
    'heroicons:chevron-up-down': ChevronUpDownIcon,
    'heroicons:chevron-up': ChevronUpIcon,
    'heroicons:chevron-down': ChevronDownIcon,
    'heroicons:chevron-left': ChevronLeftIcon,
    'heroicons:chevron-right': ChevronRightIcon,
    'heroicons:chevron-double-left': ChevronDoubleLeftIcon,
    'heroicons:chevron-double-right': ChevronDoubleRightIcon,
    'heroicons:ellipsis-vertical': EllipsisVerticalIcon,
    'heroicons:inbox': InboxIcon,
    'heroicons:squares-2x2': Squares2X2Icon,
    'heroicons:bars-3': Bars3Icon,
    'heroicons:map-pin': MapPinIcon,
    'heroicons:calendar-days': CalendarDaysIcon,
    'heroicons:clock': ClockIcon,
    'heroicons:users': UsersIcon,
    'heroicons:heart': HeartIcon,
    'heroicons:eye': EyeIcon,
    'heroicons:rss': RssIcon,
    'heroicons:sun': SunIcon,
    'heroicons:moon': MoonIcon,
    'heroicons:trash': TrashIcon
  }
  
  return iconMap[props.name] || 'div'
})
</script>