<template>
  <LayoutPublicShell
    root-class="home-shell font-ui h-dvh max-h-dvh flex flex-col overflow-hidden"
    content-class="home-page-shell"
    footer-class="home-footer hidden md:block shrink-0"
  >
    <slot />
  </LayoutPublicShell>
</template>

<style>
/* Home: exact one viewport = header + content + footer (desktop) / bottom nav (mobile). */
.home-shell {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
}

.home-page-shell {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  max-width: var(--layout-public-page-max-width);
  margin-inline: auto;
  padding-inline: var(--layout-public-page-padding-x);
  padding-top: 0;
  padding-bottom: calc(0.5rem + var(--layout-public-bottom-nav-height) + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (min-width: 640px) {
  .home-page-shell {
    padding-inline: var(--layout-public-page-padding-x-sm);
  }
}

@media (min-width: 768px) {
  .home-page-shell {
    padding-inline: var(--layout-public-page-padding-x-md);
    padding-bottom: 0.5rem;
  }
}

.home-footer.home-footer {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

.home-footer .container {
  gap: 0.5rem;
}
</style>
