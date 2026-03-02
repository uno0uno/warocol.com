<template>
  <!-- Desktop -->
  <Modal v-model="isOpen" title="¡Hablemos!">
    <LeadModalForm :button-source="buttonSource" @close="close" />
  </Modal>

  <!-- Mobile -->
  <BottomSheetModal v-model="isOpen" title="¡Hablemos!">
    <LeadModalForm :button-source="buttonSource" @close="close" />
  </BottomSheetModal>
</template>

<script setup lang="ts">
import Modal from '~/components/ui/Modal.vue'
import BottomSheetModal from '~/components/ui/BottomSheetModal.vue'
import LeadModalForm from '~/components/modals/LeadModalForm.vue'

const { isOpen, buttonSource, close } = useLeadModal()
</script>
