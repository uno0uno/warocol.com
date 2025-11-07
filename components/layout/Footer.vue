<script setup>
const {
  public: {
    organizationName
  }
} = useRuntimeConfig()

const currentYear = new Date().getFullYear()

const footerLinks = {
  product: [
    { label: 'Launches', href: '/launches' },
    { label: 'Products', href: '/products' },
    { label: 'News', href: '/news' },
    { label: 'Forums', href: '/forums' }
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Contact', href: '/contact' },
    { label: 'Blog', href: '/blog' }
  ],
  support: [
    { label: 'Help Center', href: '/help' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' }
  ]
}

const socialLinks = [
  { label: 'Twitter', href: '#', icon: 'twitter' },
  { label: 'LinkedIn', href: '#', icon: 'linkedin' },
  { label: 'GitHub', href: '#', icon: 'github' },
  { label: 'Instagram', href: '#', icon: 'instagram' }
]
</script>

<template>
  <footer class="bg-card text-foreground border-t border-border mt-auto">
    <div class="container mx-auto px-6 py-12">
      <!-- Main Footer Content -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        <!-- Brand Section -->
        <div class="lg:col-span-2">
          <div class="flex items-center mb-4">
            <div class="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center mr-3">
              <span class="text-background font-bold text-lg">W</span>
            </div>
            <span class="text-xl font-bold text-foreground">{{ organizationName }}</span>
          </div>
          <p class="text-muted-foreground mb-4 max-w-md">
            Conectando talento profesional colombiano. La plataforma donde los mejores profesionales 
            muestran su trabajo y conectan con oportunidades.
          </p>
          <!-- Social Links -->
          <div class="flex space-x-4">
            <a 
              v-for="social in socialLinks" 
              :key="social.label"
              :href="social.href"
              class="w-9 h-9 bg-muted hover:bg-muted/80 rounded-lg flex items-center justify-center transition-colors"
              :aria-label="social.label"
            >
              <span class="text-muted-foreground hover:text-foreground text-sm">
                {{ social.icon.charAt(0).toUpperCase() }}
              </span>
            </a>
          </div>
        </div>

        <!-- Product Links -->
        <div>
          <h3 class="font-semibold mb-4 text-foreground">Product</h3>
          <ul class="space-y-3">
            <li v-for="link in footerLinks.product" :key="link.label">
              <NuxtLink 
                :to="link.href"
                class="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Company Links -->
        <div>
          <h3 class="font-semibold mb-4 text-foreground">Company</h3>
          <ul class="space-y-3">
            <li v-for="link in footerLinks.company" :key="link.label">
              <NuxtLink 
                :to="link.href"
                class="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Support Links -->
        <div>
          <h3 class="font-semibold mb-4 text-foreground">Support</h3>
          <ul class="space-y-3">
            <li v-for="link in footerLinks.support" :key="link.label">
              <NuxtLink 
                :to="link.href"
                class="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom Section -->
      <div class="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
        <p class="text-muted-foreground text-sm">
          &copy; {{ currentYear }} {{ organizationName }}. All rights reserved.
        </p>
        <div class="flex items-center space-x-6 mt-4 md:mt-0">
          <NuxtLink 
            to="/privacy" 
            class="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Privacy
          </NuxtLink>
          <NuxtLink 
            to="/terms" 
            class="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Terms
          </NuxtLink>
          <NuxtLink 
            to="/cookies" 
            class="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Cookies
          </NuxtLink>
        </div>
      </div>
    </div>
  </footer>
</template>