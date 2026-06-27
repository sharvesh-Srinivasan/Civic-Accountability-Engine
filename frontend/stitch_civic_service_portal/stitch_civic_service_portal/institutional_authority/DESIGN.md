---
name: Institutional Authority
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#44474e'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#465f88'
  primary: '#000a1e'
  on-primary: '#ffffff'
  primary-container: '#002147'
  on-primary-container: '#708ab5'
  inverse-primary: '#aec7f6'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#080b0d'
  on-tertiary: '#ffffff'
  tertiary-container: '#1e2224'
  on-tertiary-container: '#86898b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aec7f6'
  on-primary-fixed: '#001b3d'
  on-primary-fixed-variant: '#2d476f'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
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
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  max-width: 1280px
---

## Brand & Style
The design system is engineered to evoke trust, stability, and unassailable authority. It targets a broad citizenry requiring clear, non-ambiguous interaction with high-level government services. 

The aesthetic leans into **Corporate Minimalism** with a focus on **Institutional Structure**. It prioritizes high-contrast readability and a rhythmic, grid-bound layout over decorative elements. Visual clarity is the primary vehicle for transparency, ensuring that every interface feels official, secure, and permanent. Whitespace is used not just for aesthetics, but as a functional tool to reduce cognitive load during complex administrative tasks.

## Colors
The palette is rooted in a deep **Midnight Blue** (#002147), symbolizing tradition and reliability. This is supported by a sophisticated **Slate Gray** (#64748B) for secondary information and interface elements. 

The background strategy utilizes a **Stark White** (#FFFFFF) for primary content areas to ensure maximum contrast and a "paper-like" official feel. Success, Warning, and Error states must be handled with muted but clear tones to maintain the professional composure of the system. Text is primarily rendered in a dark Slate-Navy to ensure it is softer than pure black while maintaining AA/AAA accessibility ratings.

## Typography
This design system utilizes **Public Sans**, an institutional typeface designed specifically for accessibility and clarity in government interfaces. 

The type hierarchy is strictly disciplined. Headlines use a heavy weight and tighter tracking to command attention, while body text uses generous line-height to facilitate long-form reading of policies and documentation. All labels and metadata utilize a slightly increased letter-spacing and a semi-bold weight to ensure they remain legible even at the smallest scales.

## Layout & Spacing
The layout follows a **Fixed-Width Grid** model for desktop to ensure line lengths remain optimal for readability, switching to a fluid model for mobile devices. 

- **Desktop (1280px+):** 12-column grid with 24px gutters and 64px external margins.
- **Tablet (768px - 1279px):** 8-column fluid grid with 24px gutters and 32px margins.
- **Mobile (< 768px):** 4-column fluid grid with 16px gutters and 16px margins.

Vertical rhythm is strictly maintained using a 4px base unit. Component padding should be generous—typically 16px or 24px—to create an atmosphere of order and calm.

## Elevation & Depth
In alignment with its institutional nature, this design system avoids aggressive shadows. Depth is communicated primarily through **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Base):** Stark white background.
- **Level 1 (Cards/Containers):** Defined by a 1px solid border (#E2E8F0) or a very subtle tint (#F8FAFC).
- **Level 2 (Interactive/Overlay):** A singular, highly-diffused ambient shadow (Offset: 0, 4px; Blur: 12px; Opacity: 0.05; Color: Midnight Blue).

Avoid all skeuomorphic effects. The interface should feel like a series of structured, high-quality physical documents layered cleanly.

## Shapes
To maintain a formal and precise character, the design system utilizes a **Soft** corner radius. A 4px (0.25rem) standard is applied to buttons, input fields, and small containers. Larger containers like cards may use an 8px radius, but no element should exceed this. Sharp, disciplined edges reinforce the feeling of a structured government framework.

## Components
- **Buttons:** Primary buttons use the Midnight Blue background with white text. They are rectangular with a 4px radius. Secondary buttons use a 1px Slate Gray border. No gradients are permitted.
- **Input Fields:** Use a 1px border (#CBD5E1) that thickens to 2px in Midnight Blue on focus. Labels are always positioned above the field for maximum accessibility.
- **Cards:** Cards are flat with a 1px light gray border. They should not use shadows unless they are "floating" (e.g., a modal or dropdown).
- **Lists:** Data lists must use subtle horizontal dividers (#F1F5F9). Alternate row striping is preferred for large data tables to assist horizontal eye tracking.
- **Status Indicators:** Use a combination of color and iconography (e.g., a checkmark for success) to ensure the system is accessible to users with color-vision deficiencies.
- **Navigation:** A persistent, high-contrast top bar in Midnight Blue houses the official seal and primary navigation links, ensuring the user always knows they are within a secure government domain.