# Lina Color System

This document is the source of truth for Lina color tokens, themes, and usage intent.

## Color Philosophy

Lina colors are chosen to create an experience that is:

- Safe: calm teal and gray tones, no harsh contrast
- Adult: professional and mature expression
- Clear: clean structure without visual noise
- Calm: muted tones that keep focus on content and collaboration

The full color system must support the brand pillars: clarity, safety, and collaboration.

## Token Naming Convention

Use semantic-first naming in implementation. Suggested shape:

- `color.brand.green.<shade>`
- `color.neutral.gray.<shade>`
- `color.surface.<role>`
- `color.text.<role>`
- `color.semantic.<type>.<role>`

Theme is applied by context (`light` or `dark`), not by changing token meaning.

## Brand Green Palette (Primary)

### Light

| Token           | Hex       | Notes/Usage                          |
| --------------- | --------- | ------------------------------------ |
| Brand Green 100 | `#E9F5F3` | Soft tinted background               |
| Brand Green 200 | `#B4DAD6` | Secondary tint                       |
| Brand Green 300 | `#77B4AE` | Supporting accent                    |
| Brand Green 400 | `#2B887F` | Strong secondary accent              |
| Brand Green 500 | `#147A72` | Strong interactive tone              |
| Brand Green 600 | `#0D6B64` | Primary CTA / active (default)       |
| Brand Green 700 | `#0B6057` | Hover/pressed from 600 in light mode |
| Brand Green 800 | `#0A514B` | Deep accent                          |
| Brand Green 900 | `#083D39` | Maximum brand depth                  |

### Dark

| Token           | Hex       | Notes/Usage                   |
| --------------- | --------- | ----------------------------- |
| Brand Green 100 | `#22302E` | Subtle bg / pill bg           |
| Brand Green 200 | `#1E3A33` | Dark subtle accent            |
| Brand Green 300 | `#3F8F74` | Mid accent in dark theme      |
| Brand Green 400 | `#5FB79A` | Brighter accent               |
| Brand Green 500 | `#4FB5A8` | Active/selected in dark theme |
| Brand Green 600 | `#147A72` | CTA/accent in dark theme      |
| Brand Green 700 | `#0D6B64` | Deeper accent                 |
| Brand Green 800 | `#0B6057` | Deep accent                   |
| Brand Green 900 | `#083D39` | Maximum brand depth           |

## Neutral Gray Palette

### Light

| Token            | Hex       | Notes/Usage                |
| ---------------- | --------- | -------------------------- |
| Neutral Gray 50  | `#F8F8F6` | Page background            |
| Neutral Gray 100 | `#E8E8EA` | Border subtle / soft fills |
| Neutral Gray 200 | `#DEDFE2` | Border default             |
| Neutral Gray 300 | `#C8CBCF` | Disabled surfaces          |
| Neutral Gray 400 | `#A1A7AF` | Muted text                 |
| Neutral Gray 500 | `#6A7079` | Secondary labels           |
| Neutral Gray 600 | `#50565E` | Secondary text             |
| Neutral Gray 700 | `#3B3F45` | Strong neutral content     |
| Neutral Gray 800 | `#2A2E34` | Near-primary dark text     |
| Neutral Gray 900 | `#1A1E23` | Primary text               |

### Dark

| Token            | Hex       | Notes/Usage                      |
| ---------------- | --------- | -------------------------------- |
| Neutral Gray 50  | `#121817` | Page background (not pure black) |
| Neutral Gray 100 | `#18201F` | Card surface                     |
| Neutral Gray 200 | `#1D2625` | Subtle surface                   |
| Neutral Gray 300 | `#1E2826` | Border subtle                    |
| Neutral Gray 400 | `#24302E` | Border default                   |
| Neutral Gray 500 | `#8E9B98` | Muted text                       |
| Neutral Gray 600 | `#B6C2BF` | Secondary text                   |
| Neutral Gray 700 | `#D0D9D7` | High-contrast support text       |
| Neutral Gray 800 | `#E6ECEB` | Primary text level               |
| Neutral Gray 900 | `#E6ECEB` | Primary text token mapping       |

## Semantic Palette

### Error (Light + Dark)

| Token                  | Hex       | Notes/Usage                   |
| ---------------------- | --------- | ----------------------------- |
| Error Default (Light)  | `#C1443A` | Error text/icon/accent        |
| Error Dark (Light)     | `#9A352E` | Stronger error emphasis       |
| Error Light BG (Light) | `#F5D6D3` | Error banner/toast background |
| Error Default (Dark)   | `#D46A61` | Error text/icon/accent        |
| Error Dark (Dark)      | `#B5544C` | Stronger error emphasis       |
| Error Light BG (Dark)  | `#3A1E1C` | Error banner/toast background |

### Success (Light + Dark)

| Token                    | Hex       | Notes/Usage                     |
| ------------------------ | --------- | ------------------------------- |
| Success Default (Light)  | `#3A8F70` | Success text/icon/accent        |
| Success Dark (Light)     | `#2E745B` | Stronger success emphasis       |
| Success Light BG (Light) | `#D7EFE6` | Success banner/toast background |
| Success Default (Dark)   | `#5FB79A` | Success text/icon/accent        |
| Success Dark (Dark)      | `#3F8F74` | Stronger success emphasis       |
| Success Light BG (Dark)  | `#1E3A33` | Success banner/toast background |

### Warning (Light + Dark)

| Token                    | Hex       | Notes/Usage                     |
| ------------------------ | --------- | ------------------------------- |
| Warning Default (Light)  | `#E0A040` | Warning text/icon/accent        |
| Warning Light BG (Light) | `#FFF4DD` | Warning banner/toast background |
| Warning Default (Dark)   | `#E4B25C` | Warning text/icon/accent        |
| Warning Light BG (Dark)  | `#3A2F1A` | Warning banner/toast background |

## Surface Tokens

### Light

| Token          | Hex       | Notes/Usage                 |
| -------------- | --------- | --------------------------- |
| Surface Page   | `#F8F8F6` | App page background         |
| Surface Card   | `#FFFFFF` | Cards and raised containers |
| Surface Subtle | `#F3F3F1` | Subtle section backgrounds  |
| Border Default | `#DEDFE2` | Standard borders            |
| Border Subtle  | `#E8E8EA` | Hairline/divider borders    |

### Dark

| Token              | Hex       | Notes/Usage                 |
| ------------------ | --------- | --------------------------- |
| Surface Page       | `#121817` | App page background         |
| Surface Card       | `#18201F` | Cards and raised containers |
| Surface Subtle     | `#1D2625` | Subtle section backgrounds  |
| Surface Pill/Input | `#22302E` | Pills and input backgrounds |
| Border Default     | `#24302E` | Standard borders            |
| Border Subtle      | `#1E2826` | Hairline/divider borders    |

## Text Tokens

### Light

| Token          | Hex       | Notes/Usage                |
| -------------- | --------- | -------------------------- |
| Text Primary   | `#1A1E23` | Main body and heading text |
| Text Secondary | `#50565E` | Supporting text            |
| Text Muted     | `#A1A7AF` | Metadata and tertiary text |

### Dark

| Token          | Hex       | Notes/Usage                |
| -------------- | --------- | -------------------------- |
| Text Primary   | `#E6ECEB` | Main body and heading text |
| Text Secondary | `#B6C2BF` | Supporting text            |
| Text Muted     | `#8E9B98` | Metadata and tertiary text |

## Usage Cheatsheet (Light)

| Pattern                  | Token Guidance                   |
| ------------------------ | -------------------------------- |
| Primary button / active  | Brand Green 600                  |
| Secondary button / pills | Brand Green 100-200              |
| Hover                    | Darken one shade                 |
| Disabled                 | Neutral Gray 300-400             |
| Backgrounds              | Neutral Gray 50 and Surface Card |
| Text hierarchy           | Neutral 900 -> 600 -> 400        |

## Dark Usage Rules

| Rule           | Guidance                              |
| -------------- | ------------------------------------- |
| Background     | Never pure black; use `#121817`       |
| Cards          | Raise one surface level to `#18201F`  |
| Hover          | Use lighter surface / higher contrast |
| Active / focus | Brand Green 500-600                   |
| Text hierarchy | 800 -> 600 -> 500                     |

## Implementation Notes

- Keep token meaning stable across themes.
- Do not hardcode component-level colors when a token exists.
- Use semantic tokens for feedback states before raw palette values.
