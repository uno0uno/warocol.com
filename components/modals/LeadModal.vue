<template>
  <!-- Desktop -->
  <Modal :model-value="isOpen" title="¡Hablemos!" @update:model-value="close">
    <LeadModalForm :button-source="buttonSource" @close="close" />
  </Modal>

  <!-- Mobile -->
  <BottomSheetModal :model-value="isOpen" title="¡Hablemos!" @update:model-value="close">
    <LeadModalForm :button-source="buttonSource" @close="close" />
  </BottomSheetModal>
</template>

<script setup lang="ts">
import Modal from '~/components/ui/Modal.vue'
import BottomSheetModal from '~/components/ui/BottomSheetModal.vue'
import LeadModalForm from '~/components/modals/LeadModalForm.vue'

const { isOpen, buttonSource, close } = useLeadModal()
</script>
