# Warocol UI Governance Rules

## Mandatory Requirements

### ❌ NEVER DO
- Use hardcoded colors (`#9687F5`, `rgb(150, 135, 245)`)
- Use arbitrary Tailwind colors (`bg-purple-500`, `text-blue-600`) 
- Override design tokens with custom values
- Create new color variants without using the token system
- Use `!important` to force styles
- Mix semantic and palette tokens in the same component context
- Create theme-specific code without token abstraction

### ✅ ALWAYS DO
- Use semantic design tokens (`--primary`, `--secondary`, `--background`)
- Apply hover states with opacity modifiers (`hover:bg-primary/90`)
- Include focus states using `--ring` token
- Support both light and dark themes automatically
- Use `cn()` utility for className composition
- Follow CVA (Class Variance Authority) pattern for variants
- Test components in both theme modes

## Component Creation Rules

### Color Selection Priority
1. **First**: Semantic tokens (`bg-primary`, `text-foreground`)
2. **Second**: Role tokens (`bg-surface`, `text-text-primary`) 
3. **Last**: Palette tokens (`bg-titan-200`, `text-crocus-800`) - only for specific theming

### State Management
- **Interactive states**: Must use token-based hover/focus/active states
- **Loading states**: Use existing skeleton and loading patterns
- **Error states**: Must use `--destructive` token family
- **Success states**: Must use `--success` token family

### Accessibility Compliance
- **Focus rings**: Required on all interactive elements using `--ring`
- **Color contrast**: All token combinations must meet WCAG 2.1 AA standards
- **Disabled states**: Must use `disabled:opacity-50` pattern
- **Keyboard navigation**: All interactive components must support keyboard access

## Implementation Standards

### TypeScript Requirements
- All components must have proper TypeScript interfaces
- Variant props must extend CVA `VariantProps`
- Props must include optional `class` for custom styling
- Export interfaces for external usage

### Vue Composition
- Use `<script setup lang="ts">` pattern
- Import `cn` utility for className merging
- Use `cva` for variant definitions
- Support slot-based content composition

### Performance Rules
- Reuse existing design system classes
- Avoid creating duplicate utility classes
- Use Tailwind's built-in optimizations
- Minimize CSS bundle size through token reuse

## Quality Gates

### Before Component Merge
- [ ] Uses only design tokens for colors
- [ ] Implements proper hover/focus states
- [ ] Works in both light/dark themes
- [ ] Includes TypeScript definitions
- [ ] Follows CVA variant pattern
- [ ] Passes accessibility audit
- [ ] No hardcoded values or arbitrary styles

### During Code Review
- Verify no magic numbers or hardcoded colors
- Check proper token usage hierarchy
- Confirm theme compatibility
- Validate TypeScript compliance
- Test keyboard navigation
- Review performance impact

## Token Evolution

### When Adding New Tokens
- Discuss with design team first
- Update design-tokens.css file
- Ensure semantic naming
- Document use cases
- Update component examples
- Test across all themes

### When Modifying Existing Tokens
- Assess impact on existing components
- Create migration plan if breaking
- Update documentation
- Test visual regression
- Communicate changes to team

## Anti-Patterns to Reject

### Code Examples to Refuse
```css
/* ❌ Never accept these patterns */
.my-component {
  background: #9687F5;
  color: purple;
  border: 1px solid rgba(150, 135, 245, 0.3);
}

/* ❌ Arbitrary Tailwind classes */
<div class="bg-purple-500 text-white border-blue-300">

/* ❌ Theme-specific overrides */
.dark .my-component {
  background: #333;
}
```

### Acceptable Patterns
```css
/* ✅ Correct token usage */
.my-component {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: 1px solid hsl(var(--border));
}

/* ✅ Semantic Tailwind classes */
<div class="bg-primary text-primary-foreground border-border">
```

## Enforcement Strategy

### Automated Checks
- ESLint rules against hardcoded colors
- Stylelint rules for token compliance
- Visual regression testing
- Accessibility testing in CI/CD

### Manual Review Points
- Design token usage validation
- Theme compatibility verification
- Performance impact assessment
- Accessibility compliance check

## Decision Authority

### Design Token Changes
- **Design Team**: Semantic meaning and color relationships
- **Engineering Team**: Implementation feasibility and performance
- **Product Team**: User experience impact
- **Accessibility Team**: WCAG compliance verification

### Component Standards
- **Lead Engineer**: Technical implementation patterns
- **Design System Lead**: Visual consistency and token usage
- **QA Team**: Cross-browser and accessibility testing