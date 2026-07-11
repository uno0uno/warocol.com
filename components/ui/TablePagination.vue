<template>
  <div class="flex items-center justify-between">
    <div class="text-sm text-muted-foreground">
      {{ t('common.pagination.showingRange', { start: startItem, end: endItem, total: totalItems }) }}
    </div>
    <div class="flex items-center space-x-2">
      <Button 
        variant="outline" 
        size="sm"
        @click="$emit('first-page')"
        :disabled="!canPreviousPage"
      >
        <Icon name="heroicons:chevron-double-left" class="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        @click="$emit('previous-page')"
        :disabled="!canPreviousPage"
      >
        <Icon name="heroicons:chevron-left" class="h-4 w-4" />
      </Button>
      <span class="text-sm text-foreground px-2 font-medium">
        {{ t('common.pagination.pageOf', { page: currentPage, total: totalPages }) }}
      </span>
      <Button 
        variant="outline" 
        size="sm"
        @click="$emit('next-page')"
        :disabled="!canNextPage"
      >
        <Icon name="heroicons:chevron-right" class="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        @click="$emit('last-page')"
        :disabled="!canNextPage"
      >
        <Icon name="heroicons:chevron-double-right" class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui'

const { t } = useI18n({ useScope: 'global' })

defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  },
  startItem: {
    type: Number,
    required: true
  },
  endItem: {
    type: Number,
    required: true
  },
  totalItems: {
    type: Number,
    required: true
  },
  canPreviousPage: {
    type: Boolean,
    required: true
  },
  canNextPage: {
    type: Boolean,
    required: true
  }
})

defineEmits(['first-page', 'previous-page', 'next-page', 'last-page'])
</script>
