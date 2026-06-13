<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
definePageMeta({ layout: false, publicAccess: true })
const route = useRoute()
const router = useRouter()
onMounted(() => router.replace(`/${route.params.tenant}/checkout`))
</script>
<template><div /></template>
