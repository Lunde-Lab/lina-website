# Lina Color Usage

This guide explains practical color usage for UI components, states, and readability.
Use it together with [Color System](color-system.md).

## Core Rules

- Keep visual intensity low and predictable.
- Use brand green for action clarity, not decoration.
- Use neutral surfaces to keep focus on content.
- Use semantic colors only for true system states (error/success/warning).
- In light mode, hover darkens one shade.
- In dark mode, hover uses a lighter surface or higher-contrast layer.

## Component and State Rules

### Buttons

| Variant           | Light                                 | Dark                                             | Notes                     |
| ----------------- | ------------------------------------- | ------------------------------------------------ | ------------------------- |
| Primary (default) | Brand Green 600 bg + light text       | Brand Green 500-600 bg + dark-surface aware text | Primary action only       |
| Primary (hover)   | Darken one shade (600 -> 700)         | Lighter/high-contrast hover treatment            | Keep motion subtle        |
| Primary (pressed) | One more step darker if needed        | One step deeper contrast                         | Do not add flashy effects |
| Secondary         | Brand Green 100-200 bg + primary text | Brand Green 100-200 style dark equivalents       | Lower emphasis action     |
| Disabled          | Neutral Gray 300-400                  | Neutral Gray 300-400 equivalents in dark scale   | No strong brand color     |

### Inputs

| State   | Light                                                  | Dark                                         | Notes                      |
| ------- | ------------------------------------------------------ | -------------------------------------------- | -------------------------- |
| Default | Surface Card bg + Border Default                       | Surface Card bg + Border Default             | Keep stable baseline       |
| Focus   | Brand Green 600 focus ring/accent                      | Brand Green 500-600 focus ring/accent        | Focus must be visible      |
| Error   | Error Default border/text + Error Light BG helper zone | Error Default (Dark) + Error Light BG (Dark) | Pair color with clear copy |

### Pills and Segmented Controls

| State      | Light                                  | Dark                     | Notes                     |
| ---------- | -------------------------------------- | ------------------------ | ------------------------- |
| Container  | Surface Subtle or card                 | Surface Subtle           | Low-contrast frame        |
| Selected   | Brand Green 600 (or 500) emphasis      | Brand Green 500-600      | Keep selected state clear |
| Unselected | Brand Green 100-200 or neutral surface | Dark subtle/pill surface | Avoid noisy contrasts     |

### Borders and Dividers

| Type           | Light                      | Dark                       | Notes                    |
| -------------- | -------------------------- | -------------------------- | ------------------------ |
| Default border | Border Default (`#DEDFE2`) | Border Default (`#24302E`) | Inputs, cards, sections  |
| Subtle divider | Border Subtle (`#E8E8EA`)  | Border Subtle (`#1E2826`)  | Hairlines and separators |

### Backgrounds and Surfaces

| Role            | Light                      | Dark                       | Notes                             |
| --------------- | -------------------------- | -------------------------- | --------------------------------- |
| Page background | Surface Page (`#F8F8F6`)   | Surface Page (`#121817`)   | Never use pure black in dark mode |
| Card surface    | Surface Card (`#FFFFFF`)   | Surface Card (`#18201F`)   | Raised content layer              |
| Subtle area     | Surface Subtle (`#F3F3F1`) | Surface Subtle (`#1D2625`) | Grouped content zones             |

### Text Hierarchy

| Level     | Light                      | Dark                       | Notes                        |
| --------- | -------------------------- | -------------------------- | ---------------------------- |
| Primary   | Text Primary (`#1A1E23`)   | Text Primary (`#E6ECEB`)   | Headlines and core body      |
| Secondary | Text Secondary (`#50565E`) | Text Secondary (`#B6C2BF`) | Supporting information       |
| Muted     | Text Muted (`#A1A7AF`)     | Text Muted (`#8E9B98`)     | Metadata and tertiary labels |

### Semantic Banners and Toasts

| Type    | Light                                        | Dark                                             | Notes                        |
| ------- | -------------------------------------------- | ------------------------------------------------ | ---------------------------- |
| Error   | Error Light BG + Error Default text/icon     | Error Light BG (Dark) + Error Default (Dark)     | Explain action to recover    |
| Success | Success Light BG + Success Default text/icon | Success Light BG (Dark) + Success Default (Dark) | Confirm completion calmly    |
| Warning | Warning Light BG + Warning Default text/icon | Warning Light BG (Dark) + Warning Default (Dark) | Use for caution, not failure |

## Interaction State Rules

| State    | Rule (Light)                             | Rule (Dark)                                          |
| -------- | ---------------------------------------- | ---------------------------------------------------- |
| Hover    | Darken one shade                         | Use lighter surface / higher contrast                |
| Pressed  | One step stronger than hover             | One step stronger than hover                         |
| Focus    | Use green 600 accent and clear outline   | Use green 500-600 accent and clear outline           |
| Selected | Keep active token consistent             | Keep active token consistent                         |
| Disabled | Use neutral 300-400 range and muted text | Use dark neutral disabled equivalents and muted text |

## Accessibility Checklist

- Ensure text remains readable on its background in both themes.
- Verify primary and secondary actions are distinguishable without relying only on color.
- Confirm focus states are clearly visible for keyboard and assistive navigation.
- Check semantic states include clear text labels, not color alone.
- Validate disabled elements still look distinct from enabled elements.
- Review small text and metadata for sufficient legibility in dark mode.
- Test banners/toasts in context to avoid low-contrast overlays.

## Do/Don't

| Do                                                          | Don't                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------- |
| Use Brand Green 600 for primary CTA in light mode           | Use multiple bright accents for equal-priority actions         |
| Use neutral surfaces for layout calm                        | Use saturated fills as large page backgrounds                  |
| Keep text hierarchy Primary -> Secondary -> Muted           | Put muted text on subtle surfaces when it becomes hard to read |
| Use semantic colors only for real feedback states           | Use error/warning colors as decorative accents                 |
| In dark mode, use layered surfaces (`#121817` -> `#18201F`) | Use pure black backgrounds with sharp neon accents             |

## Example Mappings

- Primary save button:
  - Light: Brand Green 600 default, 700 hover, disabled in Neutral Gray 300-400.
  - Dark: Brand Green 500-600 default, lighter surface hover, muted disabled.
- Error input field:
  - Border and message use Error Default.
  - Helper/background area uses Error Light BG variant for current theme.
- Thread list card:
  - Page uses Surface Page.
  - Card uses Surface Card.
  - Dividers use Border Subtle.
