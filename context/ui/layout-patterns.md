# Action Page Layout Patterns

## 1. Definition
An **Action Page** is a dedicated route for performing complex tasks, such as creating resources, editing details, or processing bulk actions (e.g., registering payments).

**When to use:**
- The action requires a complex form with multiple sections.
- The action involves processing multiple items (bulk operations).
- A modal would be too cramped or provide a poor mobile experience.

## 2. Layout Structure

### Desktop (Split Layout)
- **Left Column (2/3 width)**: Main form content, inputs, and details. Scrollable independently if needed.
- **Right Column (1/3 width)**: Sticky summary card, totals, and primary action buttons.
- **Container**: Use a max-width container (e.g., `max-w-5xl`) centered on the page.

### Mobile (Stacked Layout)
- **Order**: Form content first -> Summary/Actions last.
- **Padding**: Standard mobile padding (`p-4`).
- **Responsiveness**: The layout must naturally stack without horizontal scrolling.

## 3. Navigation Governance

### Header Configuration
**Do NOT** create a local header inside the page template. Instead, configure the **Dashboard Layout** to handle navigation elements.

- **Page Title**: Set via `definePageMeta` or layout config. Displayed in the main Dashboard Header.
- **Back Button**: Configure in `layouts/dashboard.vue`. Must appear in the Dashboard Header (top right on desktop).
- **Refresh Button**: Inject `setRefreshHandler` to enable the global refresh button.

**Example (`layouts/dashboard.vue`):**
```typescript
} else if (path === '/pagos/registrar') {
  return {
    pageTitle: 'Registrar Pago',
    backButton: { label: 'Volver' },
    // ...
  }
}
```

## 4. Data Handling

### URL-Driven State
- **Source of Truth**: The URL must contain all necessary information to bootstrap the page (e.g., `?ids=1,2,3`).
- **Deep Linking**: Users should be able to refresh or share the URL and return to the same state.

### Fetching Strategy
- **Bulk Actions**: When processing multiple IDs, fetch them **individually** (e.g., `Promise.all`) rather than using a single bulk endpoint if it risks hitting URL length limits or API constraints.
- **Error Handling**: Gracefully handle partial failures (e.g., "Loaded 4 of 5 orders").

## 5. Component Architecture

### Page vs. Form
- **Page (`pages/...`)**: Responsible for data fetching, error states, and layout configuration.
- **Form Component (`components/...`)**: Pure presentation and form logic. Receives data via props; emits events (`@submit`, `@cancel`) to the parent page.

**Pattern:**
```vue
<!-- pages/pagos/registrar.vue -->
<template>
  <div v-if="!loading">
    <PaymentForm :data="data" @submit="handleSubmit" />
  </div>
</template>
```

## 6. Visual Standards
- **Summary Cards**: Use `bg-surface` with `border-2 border-border`.
- **Sticky Positioning**: Use `sticky top-6` for summary cards on desktop to keep them visible while scrolling long forms.
- **Typography**: Follow the design system tokens (see `design-guidelines.md`).

## 7. Button Strategy

### Primary Actions
- **Location**: Must be placed in the **Summary Card** (Right Column).
- **Placement**:
    - **Desktop**: Sticky within the summary card.
    - **Mobile**: Appears at the bottom of the flow (stacked layout).
- **Styling**:
    - **Primary (Confirm)**: Use `bg-emerald-500` (or app primary) with white text.
    - **Secondary (Cancel)**: Use `border-2 border-border` (outline) with secondary text color.
- **Width**: Buttons in the summary card should be **full width** (`w-full`) to provide a strong call-to-action and accessible touch targets on mobile.

### Loading States
- **Feedback**: Buttons must show a loading spinner (`CommonsTheCustomLoader`) when processing.
- **Interaction**: Buttons must be `disabled` during loading to prevent double submissions.
- **Text**: Change button text to reflect state (e.g., "Procesando..." vs "Confirmar").
