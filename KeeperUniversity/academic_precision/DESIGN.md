---
name: Academic Precision
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#0b1c30'
  on-tertiary-container: '#75859d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 2.5rem
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Public Sans
    fontSize: 1.875rem
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Public Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  caption:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: '0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  gutter: 1.5rem
  margin: 2rem
---

## Brand & Style

This design system is built upon the pillars of institutional authority and modern administrative efficiency. It bridges the gap between traditional academic values and the tech-forward nature of integrated data management. The aesthetic is **Corporate / Modern** with a lean toward **Minimalism**, ensuring that complex administrative tasks feel manageable and high-stakes data feels secure.

The visual language emphasizes clarity and logic. It avoids unnecessary ornamentation, opting instead for crisp lines, intentional whitespace, and a sophisticated use of depth to guide the user's focus. The emotional response should be one of total reliability and effortless control, reflecting a system that is as robust as the institution it serves.

## Colors

The palette is anchored by "Oxford Ink" (Primary), a deep, commanding blue that evokes tradition and security. "Keeper Blue" (Secondary) serves as the primary action color, signaling the tech-forward integration and modern energy of the platform.

- **Primary:** Used for sidebars, primary headings, and high-level navigation to establish authority.
- **Secondary:** Used for primary calls to action, active states, and highlighting key integration points.
- **Slate Grays:** A range of neutrals from #F8FAFC (backgrounds) to #475569 (secondary text) provides a sophisticated, low-fatigue environment for long-form administrative work.
- **Accent Gradients:** Subtle linear gradients (Primary to Secondary at 15% opacity) are used sparingly on surface overlays to represent data flow and connectivity.

## Typography

This design system utilizes **Public Sans** for headlines to convey an institutional, "official" tone that is highly legible and authoritative. For the interface and body copy, **Inter** provides a systematic, utilitarian clarity essential for dense administrative data.

All text should maintain high contrast against backgrounds. Use "Oxford Ink" for primary text and "Slate" for secondary descriptions. Letter spacing is slightly tightened on large headlines to maintain a modern, "tech-forward" feel, while body copy remains standard for maximum readability during extended use.

## Layout & Spacing

The system employs a **Fixed-Fluid Hybrid Grid**. Content is housed within a 12-column system with a maximum container width of 1440px to ensure line lengths remain readable on ultra-wide monitors.

A strict 4px / 8px spacing rhythm is used to maintain visual density without feeling cramped. 
- **Sidebars:** Fixed at 280px for primary navigation.
- **Margins:** 32px (xl) for page boundaries to give the content room to breathe.
- **Gaps:** 24px (md) between cards and major UI blocks to create clear separation of concerns.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Subtle Ambient Shadows**. 

1.  **Base Layer:** The canvas uses a clean, off-white slate (#F8FAFC).
2.  **Surface Layer:** Cards and containers are pure white (#FFFFFF) with a 1px border in a light slate (#E2E8F0).
3.  **Elevation:** A single, diffused "Soft Focus" shadow (0px 4px 20px rgba(15, 23, 42, 0.05)) is applied only to active elements or floating modals. 
4.  **Integration Depth:** Elements associated with the "KeeperHub" integration use a subtle inner glow or a 2px left-accent border in the secondary color to denote their special status.

## Shapes

The shape language is **Soft**, utilizing a consistent 4px (0.25rem) corner radius for most UI components. This choice balances the rigidity of traditional administrative software with the approachability of modern SaaS tools. 

- **Standard Components:** 4px radius (Inputs, Buttons, Cards).
- **Large Containers:** 8px radius (Modals, Large Dashboard Sections).
- **Interactive Tags:** 100px radius (Status chips, Pill badges) to differentiate them from actionable buttons.

## Components

### Buttons
Primary buttons use a solid "Keeper Blue" fill with white text. Secondary buttons use a slate outline. Ghost buttons are reserved for low-priority actions in table rows.

### Data Tables
The core of the administrative experience. Tables feature a fixed header, alternating row highlights (using the lightest slate), and high-contrast typography for data cells. Action icons appear on hover to reduce visual noise.

### Input Fields
Inputs are defined by a 1px slate border that thickens and changes to "Keeper Blue" on focus. Labels are always positioned above the field in the `label-sm` style.

### Status Chips
Used for administrative states (e.g., "Pending," "Approved"). These use low-saturation background tints with high-saturation text of the same hue to ensure they are visible but not distracting from primary content.

### Progress Indicators
For tech-forward integration processes, use thin, animated linear loaders featuring the secondary color gradient to show active data syncing.

### Side Navigation
A dark-themed sidebar using "Oxford Ink" creates a clear visual anchor. Icons should be "Outline" style with a 2px stroke weight for maximum crispness.