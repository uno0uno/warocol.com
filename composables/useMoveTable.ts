/**
 * useMoveTable — wraps POST /api/tables/{id}/move
 *
 * Issue: https://github.com/uno0uno/warocol.com/issues/314
 */
import { ref } from 'vue'
import type { Ref } from 'vue'

export interface MoveTableResult {
  sourceTableId: string
  sourceTableName: string
  sourceSessionId: string
  targetTableId: string
  targetTableName: string
  targetSessionId: string
  ordersTransferred: number
}

export function useMoveTable() {
  const isMoving: Ref<boolean> = ref(false)
  const moveError: Ref<string | null> = ref(null)

  const moveTable = async (
    sourceTableId: string,
    targetTableId: string,
  ): Promise<MoveTableResult | null> => {
    isMoving.value = true
    moveError.value = null
    try {
      const result = await $fetch<{ success: boolean; data: any }>(
        `/api/tables/${sourceTableId}/move`,
        { method: 'POST', body: { target_table_id: targetTableId } },
      )
      const d = result.data
      return {
        sourceTableId: d.source_table_id,
        sourceTableName: d.source_table_name,
        sourceSessionId: d.source_session_id,
        targetTableId: d.target_table_id,
        targetTableName: d.target_table_name,
        targetSessionId: d.target_session_id,
        ordersTransferred: d.orders_transferred,
      }
    } catch (err: any) {
      const detail = err?.data?.detail ?? 'Error al mover la mesa'
      moveError.value = detail
      return null
    } finally {
      isMoving.value = false
    }
  }

  return { isMoving, moveError, moveTable }
}
