<template>
  <section class="mx-auto flex w-full max-w-6xl flex-col gap-4 md:gap-6">
    <header class="flex flex-col gap-4 rounded-lg border border-card-border bg-card-bg p-5 shadow-sm md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <SparklesIcon class="h-6 w-6" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-text-secondary">Asistente</p>
          <h1 class="text-2xl font-semibold text-text-primary">Kali</h1>
        </div>
      </div>
      <span class="inline-flex w-fit items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
        Beta interna
      </span>
    </header>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section class="min-h-[520px] rounded-lg border border-card-border bg-card-bg shadow-sm">
        <div class="flex h-full min-h-[520px] flex-col">
          <div class="border-b border-card-border px-5 py-4">
            <p class="text-sm font-semibold text-text-primary">Conversacion</p>
          </div>

          <div class="flex flex-1 items-center justify-center px-5 py-10">
            <div class="flex max-w-sm flex-col items-center gap-3 text-center">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <SparklesIcon class="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p class="text-base font-semibold text-text-primary">Sin conversaciones</p>
                <p class="mt-1 text-sm text-text-secondary">Kali</p>
              </div>
            </div>
          </div>

          <div class="border-t border-card-border p-4">
            <div class="flex min-h-12 items-center rounded-lg border border-dashed border-card-border bg-shell-bg px-4 text-sm text-text-tertiary">
              Mensaje
            </div>
          </div>
        </div>
      </section>

      <aside class="flex flex-col gap-4">
        <section class="rounded-lg border border-card-border bg-card-bg p-4 shadow-sm">
          <p class="text-sm font-semibold text-text-primary">Workflows</p>
          <div class="mt-3 grid gap-2">
            <div class="rounded-lg border border-card-border bg-shell-bg px-3 py-2">
              <p class="text-sm font-medium text-text-primary">Ventas</p>
            </div>
            <div class="rounded-lg border border-card-border bg-shell-bg px-3 py-2">
              <p class="text-sm font-medium text-text-primary">Food cost</p>
            </div>
          </div>
        </section>

        <section class="rounded-lg border border-card-border bg-card-bg p-4 shadow-sm">
          <p class="text-sm font-semibold text-text-primary">Estado</p>
          <div class="mt-3 flex items-center gap-2 text-sm text-text-secondary">
            <span class="h-2 w-2 rounded-full bg-violet-500" aria-hidden="true" />
            Disponible para este tenant
          </div>
        </section>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { SparklesIcon } from '@heroicons/vue/24/outline'

definePageMeta({
  layout: 'dashboard',
  module: 'analitica',
  feature: 'kali_enabled',
})

useHead({
  title: 'Kali',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})
</script>
