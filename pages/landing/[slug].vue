<script setup lang="ts">
import LeadModalForm from '~/components/modals/LeadModalForm.vue'

definePageMeta({ layout: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

interface CampaignPayload {
  slug: string
  name: string
  title: string
  description: string | null
  cta_label: string | null
  microcopy: string | null
  image_url: string | null
  video_url: string | null
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

const headline = computed(() => campaign.value?.title || campaign.value?.name || 'WARO Colombia')
const playing = ref(false)
const hasMedia = computed(() => Boolean(campaign.value?.image_url || campaign.value?.video_url))

useSeoMeta({
  title: () => `${headline.value} | WARO Colombia`,
  description: () => campaign.value?.description || undefined,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="landing-squeeze min-h-dvh bg-surface text-text-primary flex flex-col">
    <main class="flex-1 w-full max-w-md mx-auto px-4 py-10 flex flex-col justify-center gap-6">
      <p class="text-sm font-semibold tracking-wide text-crocus-700">WARO Colombia</p>
      <h1 class="text-2xl font-bold leading-tight text-ebony-900">
        {{ headline }}
      </h1>
      <p v-if="campaign.description" class="text-sm leading-relaxed text-ebony-500">
        {{ campaign.description }}
      </p>

      <div
        v-if="hasMedia"
        class="relative overflow-hidden rounded-xl bg-ebony-900 aspect-[9/16] max-h-[min(420px,50vh)] w-full mx-auto"
      >
        <template v-if="campaign.video_url">
          <video
            v-if="playing"
            :src="campaign.video_url"
            :poster="campaign.image_url || undefined"
            controls
            playsinline
            class="h-full w-full object-cover"
          />
          <button
            v-else
            type="button"
            class="absolute inset-0 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-crocus-500"
            :aria-label="`Reproducir video: ${headline}`"
            @click="playing = true"
          >
            <img
              v-if="campaign.image_url"
              :src="campaign.image_url"
              :alt="headline"
              class="absolute inset-0 h-full w-full object-cover"
            />
            <span class="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-ebony-900">
              <Icon name="heroicons:play" class="h-8 w-8 ml-0.5" aria-hidden="true" />
            </span>
          </button>
        </template>
        <img
          v-else-if="campaign.image_url"
          :src="campaign.image_url"
          :alt="headline"
          class="h-full w-full object-cover"
        />
      </div>

      <LeadModalForm
        :button-source="`landing:${campaign.slug}`"
        :campaign-slug="campaign.slug"
        :submit-label="campaign.cta_label || undefined"
        :microcopy="campaign.microcopy || undefined"
        whatsapp-follow-up
      />
    </main>
  </div>
</template>
