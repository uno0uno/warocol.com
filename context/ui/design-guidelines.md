# Warocol UI Design Guidelines

## Design Token Usage

### Color System Philosophy
- **ALWAYS** use semantic color tokens from the design system
- **NEVER** use hardcoded hex values or arbitrary colors
- Prefer semantic tokens (--primary, --secondary) over palette-specific tokens (--crocus-500) for flexibility
- Use palette-specific tokens only when creating themed variations or brand-specific components

### Token Hierarchy (Use in this order of preference)
1. **Semantic tokens**: `--primary`, `--secondary`, `--background`, `--foreground`
2. **Role-based tokens**: `--text-primary`, `--surface-secondary`, `--border`
3. **Palette tokens**: `--titan-400`, `--crocus-600`, `--ebony-800` (only for specific design needs)

### Theme Consistency
- Components must work seamlessly across light/dark themes
- Test all UI elements in both `.light` and `.dark` theme variants
- Use CSS custom properties that automatically adapt to theme changes
- Avoid theme-specific styling unless absolutely necessary

### Component Color Guidelines

#### Backgrounds
- Primary surfaces: `--surface` or `--background`
- Secondary surfaces: `--surface-secondary` or `--card`
- Elevated surfaces: `--popover` or `--surface-tertiary`

#### Text
- Primary content: `--text-primary` or `--foreground`
- Secondary content: `--text-secondary` or `--muted-foreground`
- Tertiary/helper text: `--text-tertiary`

#### Interactive Elements
- Primary actions: `--primary` background with `--primary-foreground` text
- Secondary actions: `--secondary` background with `--secondary-foreground` text
- Accent elements: `--accent` background with `--accent-foreground` text

#### States
- Success: `--success` with `--success-foreground`
- Warning: `--warning` with `--warning-foreground`
- Error/Destructive: `--destructive` with `--destructive-foreground`
- Info: `--info` with `--info-foreground`

#### 📊 Data Tables - SPECIAL RULES
- **ALL table numbers**: MUST use `--text-primary` (black text)
- **NO colored numbers**: Never apply status colors directly to table cell values
- **Badges only**: Use `UiStatusBadge` component for colored status indicators
- **Monetary values**: Always black with optional StatusBadge for status indication
- **TIR/Percentages**: Black text with StatusBadge when color coding is needed

#### Borders and Outlines
- Default borders: `--border`
- Focus states: `--ring`
- Input fields: `--border` with `--ring` on focus

### Spacing and Layout
- Use consistent spacing scale
- Prefer CSS Grid and Flexbox for layouts
- Maintain visual hierarchy through spacing, not just color
- Use `--radius` token for consistent border-radius values

### Accessibility Requirements
- Ensure sufficient color contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Color should never be the only way to convey information
- Interactive elements must have visible focus states using `--ring`
- Support both keyboard and screen reader navigation

### Implementation Patterns
- Use CSS custom properties for dynamic theming
- Implement hover/focus states using opacity modifiers (`/90`, `/80`)
- Create reusable component classes in the design system
- Document any new color combinations or patterns

### Examples of Correct Usage

#### CSS Custom Properties
```css
.my-component {
  background: hsl(var(--surface));
  color: hsl(var(--text-primary));
  border: 1px solid hsl(var(--border));
}

.my-component:hover {
  background: hsl(var(--surface-secondary));
}
```

#### Tailwind Classes
```html
<div class="bg-surface text-text-primary border border-border">
  <button class="bg-primary text-primary-foreground hover:bg-primary/90">
    Primary Action
  </button>
</div>
```

### Anti-Patterns to Avoid
- ❌ `color: #9687F5` (hardcoded hex)
- ❌ `bg-purple-500` (arbitrary color)
- ❌ Theme-specific overrides without semantic meaning
- ❌ Using palette colors directly in components (`--crocus-500`) unless for branding
- ❌ **Applying colors to table numbers**: `<td class="text-success">${{ profit }}</td>`
- ❌ **Direct value coloring**: `<span :class="value > 0 ? 'text-green-500' : 'text-red-500'">`

### Review Checklist
- [ ] Uses semantic tokens appropriately
- [ ] Works in both light and dark themes
- [ ] Follows accessibility contrast requirements
- [ ] Uses consistent spacing and radius values
- [ ] Interactive states are properly defined
- [ ] No hardcoded color values
- [ ] **Table numbers are black** (only badges have colors)
- [ ] **StatusBadge used** for colored indicators in tables