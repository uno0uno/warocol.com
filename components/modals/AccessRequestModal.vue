<template>
  <!-- Desktop -->
  <Modal :model-value="isOpen" title="¿Todavía no tienes acceso?" @update:model-value="close">
    <AccessRequestForm :prefilled-email="prefilledEmail" @close="close" />
  </Modal>

  <!-- Mobile -->
  <BottomSheetModal :model-value="isOpen" title="¿Todavía no tienes acceso?" @update:model-value="close">
    <AccessRequestForm :prefilled-email="prefilledEmail" @close="close" />
  </BottomSheetModal>
</template>

<script setup lang="ts">
import Modal from '~/components/ui/Modal.vue'
import BottomSheetModal from '~/components/ui/BottomSheetModal.vue'
import AccessRequestForm from '~/components/modals/AccessRequestForm.vue'

const { isOpen, prefilledEmail, close } = useAccessRequestModal()
</script>
