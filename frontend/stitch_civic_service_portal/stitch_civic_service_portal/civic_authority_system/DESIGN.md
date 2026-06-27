---
name: Civic Authority System
colors:
  surface: '#f3faff'
  surface-dim: '#c7dde9'
  surface-bright: '#f3faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e6f6ff'
  surface-container: '#dbf1fe'
  surface-container-high: '#d5ecf8'
  surface-container-highest: '#cfe6f2'
  on-surface: '#071e27'
  on-surface-variant: '#44474e'
  inverse-surface: '#1e333c'
  inverse-on-surface: '#dff4ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#465f88'
  primary: '#002046'
  on-primary: '#ffffff'
  primary-container: '#1b365d'
  on-primary-container: '#87a0cd'
  inverse-primary: '#aec7f7'
  secondary: '#1b6d24'
  on-secondary: '#ffffff'
  secondary-container: '#a0f399'
  on-secondary-container: '#217128'
  tertiary: '#1d2123'
  on-tertiary: '#ffffff'
  tertiary-container: '#333638'
  on-tertiary-container: '#9c9fa1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aec7f7'
  on-primary-fixed: '#001b3d'
  on-primary-fixed-variant: '#2e476f'
  secondary-fixed: '#a3f69c'
  secondary-fixed-dim: '#88d982'
  on-secondary-fixed: '#002204'
  on-secondary-fixed-variant: '#005312'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f3faff'
  on-background: '#071e27'
  surface-variant: '#cfe6f2'
typography:
  display-lg:
    fontFamily: Public Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Public Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  caption:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is engineered for civic duty, transparency, and public trust. The visual language is **Institutional Minimalism**: a clean, highly structured aesthetic that prioritizes clarity over decoration. It evokes a sense of stability and reliability, ensuring that every citizen—regardless of digital literacy—can navigate complex government services with confidence.

The style avoids trendy gradients or ephemeral effects in favor of solid fills, clear boundaries, and purposeful whitespace. The emotional response is one of calm efficiency and authoritative guidance.

## Colors
The palette is anchored by **Deep Blue (#1B365D)**, representing tradition and institutional strength. **Action Green (#2E7D32)** is reserved strictly for successful states, confirmations, and primary "Proceed" actions to ensure high visibility.

- **Primary**: Used for headers, primary navigation, and core brand elements.
- **Secondary**: Used for positive reinforcement and final submission actions.
- **Surface**: High-utility neutrals range from white (#FFFFFF) to a soft cool gray (#F5F7F9) to define different content zones.
- **Accessibility**: All color pairings must meet WCAG 2.1 AA standards. Ensure text on primary and secondary backgrounds uses white or high-contrast equivalents.

## Typography
This design system utilizes **Public Sans**, a typeface specifically designed for government interfaces. It offers exceptional legibility across all weights and sizes.

Hierarchy is strictly enforced to guide users through dense information. Headlines use heavier weights (600-700) to anchor the page, while body text maintains a generous line height (1.5x) to prevent eye strain during long-form reading. For mobile devices, display and large headlines scale down to ensure content remains above the fold.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid Grid**. Content is centered within a 1200px container on desktop to ensure optimal line lengths for readability.

- **Grid**: A 12-column grid system is used for desktop, 8-column for tablet, and 4-column for mobile.
- **Rhythm**: All vertical spacing is a multiple of 4px. Use `stack-lg` (32px) to separate major sections and `stack-md` (16px) for related elements within a section.
- **Padding**: Form containers and cards should utilize generous internal padding (24px) to avoid a "cluttered" feel, enhancing focus on individual tasks.

## Elevation & Depth
To maintain an authoritative and trustworthy tone, the design system utilizes **Low-Contrast Outlines** and **Tonal Layers** rather than dramatic shadows.

- **Level 0 (Base)**: The main background (#F5F7F9).
- **Level 1 (Cards)**: White surfaces (#FFFFFF) with a subtle 1px border (#D1D5DB). No shadow.
- **Level 2 (Interactive)**: Reserved for dropdowns and tooltips. Use a very soft, high-diffusion ambient shadow (0px 4px 12px, 5% opacity black) to suggest a slight lift from the page without appearing "game-like."
- **Focus States**: High-contrast 3px solid outlines in Primary Blue to ensure keyboard navigation is unmistakable.

## Shapes
The shape language is **Soft and Precise**. A consistent border-radius of 4px (`rounded-sm`) is applied to buttons and input fields to feel modern yet professional. Larger containers like cards use 8px (`rounded-lg`) to provide a subtle distinction from UI controls. Sharp corners are avoided to reduce visual tension, but large "pill" shapes are also avoided to maintain a serious, institutional character.

## Components
- **Buttons**: Primary buttons use the Deep Blue background with White text. Success actions use the Action Green. All buttons have a minimum height of 48px to meet touch-target requirements.
- **Form Fields**: Labels are always visible (not placeholder-only) and positioned above the field. Inputs have a 1px neutral border that thickens to 2px Primary Blue on focus.
- **Status Badges**: Small, high-contrast pills with clear icons (e.g., a checkmark for "Approved", a clock for "Pending"). Colors must have a 4.5:1 contrast ratio against their background.
- **Breadcrumbs**: Located at the top of every page below the header. Uses `label-md` styling with Primary Blue for links and Neutral Gray for the current page.
- **Cards**: Used to group related services or information. Must include a clear headline and a single primary call-to-action to reduce cognitive load.
- **Alerts/Banners**: Full-width notifications used for critical updates. Backgrounds are tinted light versions of the status color (e.g., light red for errors) with a thick left-side border in the saturated status color.