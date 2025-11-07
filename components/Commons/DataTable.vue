<template>
  <div class="space-y-4">
    <!-- Table -->
    <div class="bg-background overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border">
            <TableHeader
              v-for="header in table.getFlatHeaders()"
              :key="header.id"
              :can-sort="header.column.getCanSort()"
              :sort-direction="header.column.getIsSorted()"
              @sort="header.column.getToggleSortingHandler()?.($event)"
            >
              {{ typeof header.column.columnDef.header === 'function' 
                  ? header.column.columnDef.header(header.getContext()) 
                  : header.column.columnDef.header }}
            </TableHeader>
            <th class="px-4 py-4"></th>
          </tr>
        </thead>
        <tbody class="bg-background">
          <tr
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            class="border-b border-border hover:bg-muted/30 transition-colors"
          >
            <td
              v-for="cell in row.getVisibleCells()"
              :key="cell.id"
              class="px-4 py-4 text-sm font-medium"
            >
              <template v-if="typeof cell.column.columnDef.cell === 'function'">
                <component :is="cell.column.columnDef.cell({ row: cell.row, getValue: cell.getValue })" />
              </template>
              <template v-else>
                {{ cell.getValue() }}
              </template>
            </td>
            <td class="px-4 py-4">
              <Icon name="heroicons:ellipsis-vertical" class="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer" />
            </td>
          </tr>
          <tr v-if="!table.getRowModel().rows.length">
            <td :colspan="table.getFlatHeaders().length + 1" class="px-4 py-12 text-center text-muted-foreground">
              <slot name="empty">
                <TableEmpty />
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <TablePagination
      :current-page="table.getState().pagination.pageIndex + 1"
      :total-pages="table.getPageCount()"
      :start-item="table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1"
      :end-item="Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)"
      :total-items="table.getFilteredRowModel().rows.length"
      :can-previous-page="table.getCanPreviousPage()"
      :can-next-page="table.getCanNextPage()"
      @first-page="table.setPageIndex(0)"
      @previous-page="table.previousPage()"
      @next-page="table.nextPage()"
      @last-page="table.setPageIndex(table.getPageCount() - 1)"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable
} from '@tanstack/vue-table'
import { Button } from '~/components/ui'
import Icon from '~/components/ui/Icon.vue'
import TableHeader from '~/components/ui/TableHeader.vue'
import TablePagination from '~/components/ui/TablePagination.vue'
import TableEmpty from '~/components/ui/TableEmpty.vue'

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  columns: {
    type: Array,
    required: true
  }
})

const globalFilter = ref('')

const table = useVueTable({
  get data() {
    return props.data
  },
  get columns() {
    return props.columns
  },
  state: {
    get globalFilter() {
      return globalFilter.value
    }
  },
  onGlobalFilterChange: (value) => {
    globalFilter.value = value
  },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  initialState: {
    pagination: {
      pageSize: 10
    }
  }
})
</script>