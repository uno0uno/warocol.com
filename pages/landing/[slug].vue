<script setup lang="ts">
import LeadModalForm from '~/components/modals/LeadModalForm.vue'

definePageMeta({ layout: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

interface CampaignPayload {
  slug: string
  name: string
}

const { data: campaign, error: fetchError } = await useAsyncData<CampaignPayload>(
  `landing-campaign-${slug.value}`,
  () => $fetch(`/api/leads/campaigns/${encodeURIComponent(slug.value)}`),
  { server: true },
)

if (!campaign.value) {
  const status = Number(
    (fetchError.value as { statusCode?: number; status?: number } | null)?.statusCode
    ?? (fetchError.value as { statusCode?: number; status?: number } | null)?.status
    ?? 404,
  )
  throw createError({
    statusCode: status >= 500 ? 502 : 404,
    statusMessage: status >= 500 ? 'Bad Gateway' : 'Not Found',
    fatal: true,
  })
}

useSeoMeta({
  title: () => `${campaign.value?.name || 'WARO Colombia'} | WARO Colombia`,
  description: 'Déjanos tu correo y teléfono. Te escribimos por WhatsApp.',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="landing-squeeze min-h-dvh bg-surface text-text-primary flex flex-col">
    <main class="flex-1 w-full max-w-md mx-auto px-4 py-10 flex flex-col justify-center gap-6">
      <p class="text-sm font-semibold tracking-wide text-crocus-700">WARO Colombia</p>
      <h1 class="text-2xl font-bold leading-tight text-ebony-900">
        {{ campaign.name }}
      </h1>
      <p class="text-sm leading-relaxed text-ebony-500">
        Déjanos tu correo y teléfono. Te escribimos por WhatsApp para continuar.
      </p>
      <LeadModalForm
        :button-source="`landing:${campaign.slug}`"
        :campaign-slug="campaign.slug"
        whatsapp-follow-up
      />
    </main>
  </div>
</template>
