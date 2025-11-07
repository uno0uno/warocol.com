export default defineNuxtRouteMiddleware((to, from) => {
  // Handle routes that start with @ symbol
  if (to.path.startsWith('/@')) {
    // Extract the username without the @ symbol
    const username = to.path.slice(2); // Remove /@
    
    // Redirect to the clean username route
    return navigateTo(`/${username}`, { redirectCode: 301 });
  }
})