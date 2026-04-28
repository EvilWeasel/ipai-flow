# IPAI Flow Design Guidelines

This document translates the current Google Stitch designs into a practical implementation guide for IPAI Flow. Use it as the source of truth when updating Svelte components, Tailwind tokens, route layouts, and page-specific UI.

The design target is a high-signal technical community product: compact, dark, readable, AI-native, and discussion-first. It should feel closer to a research operations tool than a marketing site.

## Reference Images

The Google Stitch project was captured on 2026-04-28 and saved locally under `docs/design-references/`.

| File | Purpose |
| --- | --- |
| `docs/design-references/stitch-project-overview.png` | Full Stitch canvas reference. Useful for seeing relative frame order and overall direction. |
| `docs/design-references/stitch-community-feed.png` | Primary target for the main feed visual direction. Dark mobile-first feed with orange brand header, tab filters, dense post cards, bottom nav. |
| `docs/design-references/stitch-discussion-thread.png` | Post detail view with tags, metadata, voting, save action, AI summary block, comments, and bottom nav. |
| `docs/design-references/stitch-threaded-comments.png` | More expressive discussion view with up/down vote column, AI summary, badges such as OP, fact checked, verified constructive, composer toolbar. |
| `docs/design-references/stitch-submit.png` | Submit form reference with simple stacked fields and AI-assisted moderation note. |
| `docs/design-references/stitch-daily-digest.png` | Digest view reference with AI overview synthesis, trending themes, and highest-signal discussions. |
| `docs/design-references/stitch-ipai-feed-alt.png` | Alternate, simpler HN-like feed. Use for density and hierarchy cues, not as the primary visual style. |
| `docs/design-references/stitch-generated-reference-image.png` | Additional generated visual reference from Stitch. Treat as supporting reference only. |
| `docs/design-references/stitch-accessibility-snapshot.txt` | Text extraction from Stitch. Useful for labels, hierarchy, tokens, and copy patterns. |

## Product Personality

IPAI Flow is a community knowledge surface, not a social feed and not a landing page.

The UI should communicate:

- High signal: every visible element should help scan, compare, discuss, or decide.
- Technical credibility: typography, spacing, and color should be precise and restrained.
- Community momentum: votes, comments, tags, recency, and digest summaries should make activity visible.
- AI assistance as infrastructure: AI summaries and moderation should feel integrated into the workflow, not bolted on.
- Self-hosted trust: the interface should be calm, privacy-conscious, and free of distracting advertising patterns.

Avoid:

- Oversized hero sections.
- Marketing card layouts.
- Decorative gradients, floating blobs, or unrelated illustrations.
- Heavy shadows.
- Large empty whitespace on data-dense pages.
- Pale, low-contrast text on dark backgrounds.

## Design Direction

The primary direction is the dark "Innovation Nexus" theme from Stitch:

- Dark neutral application shell.
- Black or near-black top bar.
- Bright orange brand accent.
- Blue as a secondary information accent.
- Compact content cards on dark surfaces.
- High-contrast titles.
- Small metadata, tags, and controls.
- Mobile-first navigation with a bottom nav.

The current repo uses a lighter shadcn-style shell. Future implementation should shift the product toward the Stitch direction while keeping the existing local component pattern.

## Design Tokens

### Color System

The Stitch token board defines these core brand colors:

| Role | Hex | Usage |
| --- | --- | --- |
| Primary | `#FF5E00` | Brand mark, active nav, active tabs, primary actions, selected upvote, key AI/brand highlights. |
| Secondary | `#FFFFFF` | Primary text on dark surfaces, icons on dark controls, high-emphasis labels. |
| Tertiary | `#0097FB` | Informational accents, links where orange would imply action, digest metrics, optional AI data visualization. |
| Neutral | `#121212` | App background and deep surface base. |

Recommended semantic palette:

| Token | Hex | Notes |
| --- | --- | --- |
| `--background` | `#121212` | Global app background. |
| `--foreground` | `#F5F5F5` | Main readable text. |
| `--surface-1` | `#181818` | Default cards and post rows. |
| `--surface-2` | `#202020` | Raised blocks, AI summary panels, selected surfaces. |
| `--surface-3` | `#2A2A2A` | Inputs, hover surfaces, secondary controls. |
| `--border` | `#333333` | Default separators and card borders. |
| `--border-strong` | `#4A4A4A` | Focused/selected borders. |
| `--muted` | `#A8A8A8` | Metadata and secondary labels. |
| `--muted-low` | `#707070` | Disabled text and quiet icons. |
| `--primary` | `#FF5E00` | Brand/action accent. |
| `--primary-hover` | `#FF7A2E` | Hover state for primary controls. |
| `--primary-soft` | `rgba(255, 94, 0, 0.14)` | Tags, active tab backgrounds, AI highlights. |
| `--primary-border` | `rgba(255, 94, 0, 0.35)` | Active borders and highlighted panels. |
| `--tertiary` | `#0097FB` | Informational accent. |
| `--tertiary-soft` | `rgba(0, 151, 251, 0.14)` | Info badges and digest tags. |
| `--danger` | `#FF4D4D` | Blocking moderation, destructive states, report confirmation. |
| `--success` | `#34D399` | Verified constructive, successful save, accepted moderation. |
| `--warning` | `#FACC15` | Pending moderation or attention-required states. |

Use orange sparingly. It should identify the product, selected state, and main action. If everything is orange, nothing is important.

### Primary Tonal Scale

The Stitch board includes this primary tonal scale:

| Tone | Hex |
| --- | --- |
| T0 | `#000000` |
| T10 | `#370E00` |
| T20 | `#5A1C00` |
| T30 | `#7F2B00` |
| T40 | `#A63B00` |
| T50 | `#D04B00` |
| T60 | `#FB5C00` |
| T70 | `#FF8C5D` |
| T80 | `#FFB599` |
| T90 | `#FFDBCE` |
| T95 | `#FFEDE7` |
| T100 | `#FFFFFF` |

Implementation guidance:

- Use T60 or `#FF5E00` for active elements.
- Use T20/T30 as background tints only in dark mode and only with clear text contrast.
- Use T80/T90 for subtle highlights in light mode only.
- Avoid orange text below 14px unless contrast is checked.

### Neutral Tonal Scale

The Stitch board includes this neutral scale:

| Tone | Hex |
| --- | --- |
| T0 | `#000000` |
| T10 | `#1C1B1B` |
| T20 | `#313030` |
| T30 | `#474646` |
| T40 | `#5F5E5E` |
| T50 | `#787776` |
| T60 | `#929090` |
| T70 | `#ADABAA` |
| T80 | `#C8C6C5` |
| T90 | `#E5E2E1` |
| T95 | `#F3F0EF` |
| T100 | `#FFFFFF` |

Implementation guidance:

- Use T10/T20 for most dark surfaces.
- Use T30/T40 for borders and input outlines.
- Use T70/T80 for metadata text on dark backgrounds.
- Use T90/T95/T100 for primary text, headings, and high-emphasis icons.

### Tertiary Tonal Scale

The Stitch board includes this tertiary blue scale:

| Tone | Hex |
| --- | --- |
| T0 | `#000000` |
| T10 | `#001D36` |
| T20 | `#003258` |
| T30 | `#00497D` |
| T40 | `#0061A4` |
| T50 | `#007ACD` |
| T60 | `#0095F7` |
| T70 | `#64AFFF` |
| T80 | `#9FCAFF` |
| T90 | `#D1E4FF` |
| T95 | `#EAF1FF` |
| T100 | `#FFFFFF` |

Use tertiary for data/information, not for primary actions. Examples: digest analytics, "network activity", informational badges, search highlights.

## Typography

The Stitch token board specifies:

- Headline: Inter
- Body: Inter
- Label: Space Grotesk

Implementation recommendation:

- Use Inter as the default font family.
- Use Space Grotesk only for small labels, category tags, uppercase section labels, and numeric/stat labels if it is available locally.
- If Space Grotesk is not loaded, fall back to Inter until a local font strategy is added.

### Type Scale

Use a compact type scale. The application is content-dense and should not feel like a landing page.

| Role | Size | Line height | Weight | Usage |
| --- | ---: | ---: | ---: | --- |
| App brand | 15-16px | 20px | 700 | Header brand text. |
| Page title | 24-28px | 30-34px | 700 | Submit, digest, account pages. |
| Post detail title | 24-30px | 32-38px | 700 | Single post view. |
| Feed post title | 18-22px | 24-28px | 700 | Feed cards. |
| Card title | 16-18px | 22-24px | 650 | Digest sections, panels. |
| Body | 14-16px | 22-26px | 400 | Post body, comments. |
| Metadata | 11-12px | 16px | 500 | Author, time, domain, comments. |
| Tag | 10-11px | 14px | 700 | Hashtags and badges. |
| Button | 12-14px | 18px | 650 | Actions. |
| Bottom nav label | 10-11px | 12px | 700 | Mobile nav labels. |

Rules:

- Keep letter spacing at `0` for normal text.
- Uppercase labels may use `0.04em` to `0.08em` letter spacing, but only for tiny labels and section headers.
- Do not use viewport-width font sizing.
- Do not use huge display type inside cards or compact panels.

## Layout System

### Page Widths

The Stitch frames are mobile-first, but the desktop implementation should remain dense and centered.

Recommended widths:

- Mobile content: full width with 8-12px gutters.
- Feed desktop: `max-width: 760px`.
- Post detail desktop: `max-width: 820px`.
- Digest desktop: `max-width: 920px` if analytics modules are added.
- Submit/auth forms: `max-width: 560px`.

Avoid wide text lines. Discussion content should rarely exceed 72 characters per line.

### Spacing

Use a tight 4px base grid:

| Token | Value | Usage |
| --- | ---: | --- |
| `space-1` | 4px | Icon gaps, compact metadata gaps. |
| `space-2` | 8px | Internal chips, row gaps. |
| `space-3` | 12px | Card padding on mobile, form gaps. |
| `space-4` | 16px | Section spacing, desktop card padding. |
| `space-5` | 20px | Page header to content. |
| `space-6` | 24px | Major vertical rhythm. |
| `space-8` | 32px | Page-level section gaps only. |

Do not use large decorative whitespace in the feed. Density is part of the design.

### Radius

Stitch uses mostly square, utilitarian surfaces with modest rounding.

Recommended:

- Global radius: 6px.
- Cards: 4-6px.
- Buttons: 4-6px.
- Inputs: 4px.
- Chips/tags: 3-4px.
- Bottom nav container: 0px top-level, with only small inner control radius.

Avoid pill-shaped controls except for tiny tags where the visual treatment is intentionally compact.

### Elevation

Use borders and background layers instead of shadows.

Allowed:

- `1px` borders.
- Slightly lighter surface background on raised blocks.
- Orange or blue border tint for active/highlighted states.

Avoid:

- Large box shadows.
- Floating card stacks.
- Glassmorphism.

## App Shell

### Header

The header should match the Stitch feed direction:

- Height: 48px mobile, 52-56px desktop.
- Background: `#050505` or near-black.
- Bottom border: subtle `#242424`.
- Brand on the left: small orange icon plus `IPAI Community` or `IPAI Flow`.
- Search action on the right as an icon button.
- Auth/account action can sit beside search on desktop.

The brand icon should feel like a hub or network mark. Since this repo uses `lucide-svelte`, prefer a lucide icon such as `Network`, `Sparkles`, `Flame`, `MessagesSquare`, or `CircuitBoard` over Material text icons.

### Navigation

Use two navigation modes:

Desktop:

- Top tabs in the header or directly below it.
- Items: Hot, New, Top, Digest.
- Submit and account can live in the right header area.

Mobile:

- Bottom navigation is the primary persistent nav.
- Items: Feed, Submit, Account.
- Digest can stay as a top feed tab unless a fourth bottom-nav item is needed.
- Bottom nav height: 56-64px.
- Active item uses orange icon and label.
- Inactive items use muted neutral text.

The bottom nav from Stitch is a strong part of the mobile identity. Implement it for narrow screens.

## Feed Page

The feed is the main product surface.

### Structure

Recommended hierarchy:

1. Header.
2. Filter tabs: Hot, New, Top, Digest.
3. Post list.
4. Bottom nav on mobile.

The feed should start with content immediately. Do not use a large page title or explanatory paragraph on the primary feed.

### Post Card

Each feed item should be a compact card or row with:

- Vote column at left.
- Score directly below or beside upvote control.
- Title as dominant text.
- Domain in muted text under or beside title.
- Tags as small orange/blue chips.
- Metadata row: by author, time, comments.

Target styling:

- Background: `#181818` or `#1C1B1B`.
- Border: `1px solid #333333`.
- Padding: 12px mobile, 14-16px desktop.
- Gap between cards: 4-8px mobile, 8-10px desktop.
- Title color: `#F4F4F4`.
- Metadata color: `#A8A8A8`.
- Tags: orange text on dark orange tint, small uppercase or hashtag style.

The Stitch reference uses fairly large feed titles on mobile. Keep this energy, but prevent title overflow:

- Mobile feed title: 18-20px, line-height 24-26px.
- Desktop feed title: 17-19px, line-height 23-25px.
- Allow wrapping to 2-3 lines.

### Feed Interactions

- Upvote active: orange icon and/or score.
- Upvote hover: orange text, dark orange background tint.
- Comment link hover: foreground text.
- Card hover desktop: border brightens to `#474646` or primary border if active.
- Post title hover: underline or orange tint, but not both.

## Post Detail Page

Post detail is where the design should feel like a research discussion workspace.

### Structure

Recommended order:

1. Header.
2. Tag row.
3. Title.
4. Metadata row.
5. Body text.
6. Vote/save/action row.
7. AI generated summary panel.
8. Comments heading and sort control.
9. Comment tree.
10. Composer.

### Tags

Tags appear before the title in the Stitch post view.

Style:

- Text: `#FF5E00` or `#FF8C5D`.
- Background: transparent or `rgba(255, 94, 0, 0.10)`.
- Border: `rgba(255, 94, 0, 0.25)`.
- Font: 10-11px, 700, optional uppercase.
- Padding: 2px 6px.
- Radius: 3-4px.

### Title and Metadata

Post title should be strong and readable:

- Mobile: 24px, line-height 31px.
- Desktop: 28-30px, line-height 36-38px.
- Weight: 700.

Metadata should be compact and include:

- Author.
- Time.
- Views if implemented.
- Domain for link posts.
- Optional role badge such as OP or Author.

Use icon+text only when the icon improves scanning. Avoid text-only rounded rectangles where an icon would be clearer.

### Body

Body text:

- 15-16px.
- Line height 24-26px.
- Color: neutral T90/T95.
- Max width: 70-74 characters.
- Preserve paragraph breaks.

## AI Summary Panels

AI summary is one of the main differentiators. Stitch shows it as a highly visible module, not a small footnote.

### Visual Treatment

Use a dedicated panel:

- Background: `#202020` or very dark orange/blue mixed surface.
- Border: `1px solid rgba(255, 94, 0, 0.28)` for post summaries.
- Optional left accent bar: 2-3px orange.
- Padding: 12-16px.
- Radius: 6px.
- Header row with `Sparkles` or `Bot` icon, label, and regenerate action.

Label text:

- Use `AI Generated Summary` or `AI Overview Synthesis`.
- Uppercase is acceptable for compact panel labels.
- Use Space Grotesk or Inter, 11px, 700.

Summary text:

- 14-15px.
- Line-height 22-24px.
- Color: `#E5E2E1`.

Regenerate action:

- Use a `RefreshCw` icon.
- On mobile, icon-only is acceptable with tooltip/title.
- On desktop, icon plus `Regenerate` is acceptable.

### AI Moderation Note

The submit view includes a moderation assurance block.

Style:

- Small panel below the submit button or after fields.
- Icon: `Bot`, `ShieldCheck`, or `Sparkles`.
- Text: concise and practical.
- Background: `rgba(0, 151, 251, 0.10)` or `#202020`.
- Border: `rgba(0, 151, 251, 0.25)` or subtle neutral border.

Avoid making moderation sound like a promotional feature. It is a trust and safety affordance.

## Comments

Comments should support deep technical discussion without becoming visually heavy.

### Comment Row

Each comment should include:

- Vote controls or single upvote control.
- Score.
- Author.
- OP/Author badge if applicable.
- Time.
- Body.
- Reply action.
- Report action where relevant.

Style:

- Comment body: 14-15px, line-height 22-24px.
- Metadata: 11-12px.
- Reply/report actions: 12px, muted until hover.
- Thread indentation: 12-16px per level on mobile, 16-20px desktop.
- Use vertical border lines sparingly for nested comments.

The Stitch threaded view includes badges:

- `OP`: orange or neutral filled badge.
- `Author`: orange outline or filled compact badge.
- `Verified Constructive`: success/blue badge.
- `Fact Checked`: blue or success badge.

These can be implemented later, but the design system should support them.

### Composer

The composer in Stitch has a textarea and optional formatting toolbar.

For hackathon scope:

- Use a textarea with clear focus state.
- Add a compact submit button.
- If formatting toolbar is added, use icons: bold, code, link.

Textarea:

- Background: `#202020`.
- Border: `#3A3A3A`.
- Focus border: primary or tertiary.
- Placeholder: neutral T60/T70.

## Digest Page

The digest is a high-value presentation surface and should feel slightly more editorial while remaining operational.

### Structure

Recommended hierarchy:

1. Small label row: calendar icon plus `Daily Digest` or time window.
2. Page title: `Top Stories from the last 24 hours` or current configured window.
3. AI Overview Synthesis panel.
4. Trending themes chips.
5. Optional network activity stats.
6. Highest Signal Discussions list.

### AI Overview Synthesis

This panel can be larger than post summary panels.

Style:

- Background: `#202020`.
- Border: blue or orange tinted depending on the content emphasis.
- Header: icon plus `AI Overview Synthesis`.
- Body: 2 short paragraphs max.
- Theme chips below the prose.

### Highest Signal Discussions

Each item should include:

- Vote score.
- Title.
- Tag.
- Author.
- Time.
- Comment count.

Use dense rows or compact cards. Avoid large cards with decorative whitespace.

### Network Activity

If implemented, stats can include:

- Total posts.
- Active users or nodes.
- Peak topic.

Style them as small metric blocks, not giant dashboard cards.

## Submit Page

The submit flow should be minimal and direct.

### Fields

Order:

1. Title.
2. URL.
3. Text/body.
4. Submit action.
5. AI moderation note.

Title is required. URL and text/body are mutually optional but at least one is required.

Style:

- Page width: 560px max.
- Background: dark app background.
- Fields on unframed page, not nested in a large decorative card.
- Inputs: dark surface, clear border, orange/blue focus.
- Labels: compact, high contrast.
- Helper text: muted.

Submit button:

- Primary orange.
- Full width on mobile.
- Right-aligned or natural width on desktop.

## Forms And Controls

### Buttons

Use lucide icons where possible.

Button variants:

- Primary: orange background, white text.
- Secondary: dark surface, neutral border, foreground text.
- Ghost: transparent, muted text, surface hover.
- Icon: square, stable width and height, no text unless needed.
- Danger: red text or red border, filled only for irreversible confirmation.

Sizes:

- Small: 28-32px high.
- Default: 36-40px high.
- Icon: 32-36px square.

Primary button states:

- Default: `#FF5E00`.
- Hover: `#FF7A2E`.
- Active: `#D04B00`.
- Disabled: neutral T30 background, neutral T60 text.

### Inputs

Inputs should be clear and understated:

- Height: 38-42px.
- Background: `#202020`.
- Border: `#3A3A3A`.
- Text: `#F5F5F5`.
- Placeholder: `#787776`.
- Focus: orange or blue ring, 1-2px.

### Tabs

Feed tabs:

- Text-only tabs are fine.
- Active tab uses orange text and a 1-2px underline.
- Inactive tab uses muted text.
- Hover brightens text.
- Keep tabs compact. No large segmented-control container.

### Tags And Badges

Tags are content classification. Badges are status.

Tags:

- Hashtag format.
- Orange for general tags.
- Blue for digest/informational tags.
- Small, dense, no large pills.

Badges:

- OP/Author: orange or neutral.
- Verified/fact checked: success or blue.
- Moderation pending: warning.
- Removed/flagged: danger.

## Icons

Stitch uses Material icon names such as `hub`, `search`, `forum`, `add_box`, `person_outline`, `auto_awesome`, `smart_toy`, `reply`, `flag`, and `calendar_today`.

The repo uses `lucide-svelte`. Use these equivalents:

| Stitch icon | Lucide equivalent |
| --- | --- |
| `hub` | `Network`, `CircuitBoard`, or `Workflow` |
| `search` | `Search` |
| `forum` | `MessageSquare` or `MessagesSquare` |
| `add_box` | `SquarePlus` or `PenSquare` |
| `person_outline` | `User` |
| `account_circle` | `CircleUserRound` |
| `auto_awesome` | `Sparkles` |
| `smart_toy` | `Bot` |
| `sync` | `RefreshCw` |
| `reply` | `Reply` |
| `flag` | `Flag` |
| `calendar_today` | `CalendarDays` |
| `arrow_drop_up` / `keyboard_arrow_up` | `ChevronUp` or `ArrowBigUp` |
| `arrow_drop_down` / `keyboard_arrow_down` | `ChevronDown` or `ArrowBigDown` |
| `chat_bubble` | `MessageCircle` |
| `visibility` | `Eye` |
| `bookmark_border` | `Bookmark` |

Icon rules:

- Use 16px icons for metadata and inline controls.
- Use 18-20px icons for primary nav.
- Use 22-24px icons only for larger touch targets.
- Keep icon buttons stable in size so layout does not shift.

## Responsive Behavior

### Mobile

Mobile is the primary Stitch reference.

Rules:

- Header stays compact.
- Feed content spans full width with 8px gutters.
- Bottom nav is fixed.
- Add bottom padding to pages so bottom nav does not cover content.
- Post cards stack vertically.
- Long titles wrap naturally.
- Metadata wraps to a second line if needed.
- Comment indentation must cap after 4-5 levels to prevent unusable narrow columns.

### Desktop

Desktop should not become a marketing layout.

Rules:

- Keep content centered.
- Use a max-width feed rather than full-width cards.
- Header can include nav and auth actions.
- Bottom nav should disappear.
- Avoid sidebars unless they carry real value, such as digest stats or community activity.

## Accessibility

Minimum requirements:

- Text contrast must meet WCAG AA.
- All icon-only buttons need an accessible label or `title`.
- Keyboard focus must be visible, ideally orange or blue.
- Feed tabs need clear active state.
- Vote buttons must expose their current state where possible.
- Forms need labels tied to inputs.
- Error text should be explicit and placed near the relevant field.
- AI summary regeneration must show loading and failure states.

Dark UI contrast guidance:

- Main text on `#121212` should be at least `#E5E2E1`.
- Metadata should not go below `#929090` for small text.
- Orange text on dark backgrounds should use `#FF8C5D` for small text when possible.
- Do not place `#FF5E00` text on `#1C1B1B` below 12px unless checked.

## Motion And Feedback

Motion should be minimal:

- Hover transitions: 120-160ms.
- Button active press: immediate color/scale-free feedback.
- Loading summaries: spinner or icon rotation is acceptable.
- No page-level animations are needed.

Feedback states:

- Successful vote: score/icon turns orange.
- Save: icon fills or label changes briefly.
- Submit: button disables and shows pending state.
- Moderation blocked: danger text and field-preserving form state.
- AI fallback summary: optional subtle label if useful for debugging, but do not overexplain in product UI.

## Implementation Mapping For This Repo

The repo already has local UI primitives in `src/lib/components/ui/` and Tailwind tokens in `src/routes/layout.css`.

Implementation should:

- Keep using SvelteKit and local Svelte UI components.
- Update design tokens in `src/routes/layout.css` to match the dark Stitch palette.
- Keep component APIs stable where possible.
- Prefer extending `Button`, `Input`, `Textarea`, `Label`, `Card`, and `Badge` rather than creating one-off classes everywhere.
- Use `lucide-svelte` for icons.
- Implement mobile bottom navigation in `src/routes/+layout.svelte`.
- Restore and redesign the main feed in `src/routes/+page.svelte`.

### Recommended Token Names

In `layout.css`, expose semantic CSS variables:

```css
:root {
  --background: 0 0% 7%;
  --foreground: 0 0% 96%;
  --card: 0 0% 9%;
  --card-foreground: 0 0% 96%;
  --popover: 0 0% 9%;
  --popover-foreground: 0 0% 96%;
  --primary: 22 100% 50%;
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 13%;
  --secondary-foreground: 0 0% 96%;
  --muted: 0 0% 16%;
  --muted-foreground: 0 0% 66%;
  --accent: 22 100% 50%;
  --accent-foreground: 0 0% 100%;
  --border: 0 0% 20%;
  --input: 0 0% 23%;
  --ring: 22 100% 50%;
}
```

This should be refined during implementation, but it is the correct direction.

### Route Priorities

For a hackathon-quality implementation, prioritize:

1. Main feed: match `stitch-community-feed.png`.
2. Post detail: combine `stitch-discussion-thread.png` and `stitch-threaded-comments.png`.
3. Submit form: match `stitch-submit.png`.
4. Digest: match `stitch-daily-digest.png`.
5. Auth/account: apply the same shell, forms, and spacing patterns.

## Page-Specific Acceptance Criteria

### Feed

- The first viewport shows real post content immediately.
- Hot/New/Top/Digest filters are visible.
- Every post shows score, title, domain/body cue, tags if available, author, time, and comments.
- Active upvote state is orange.
- Mobile bottom nav is visible and does not overlap the feed.

### Post Detail

- Title and body are readable without visual clutter.
- AI summary is clearly visible above comments.
- Comment tree indentation is understandable on mobile.
- Reply and vote actions are accessible.
- OP/Author badge exists where possible.

### Submit

- The form is fast to understand.
- Title, URL, and text fields are visually consistent.
- Validation errors preserve entered content.
- AI moderation note is visible but not dominant.

### Digest

- AI overview is the visual lead.
- Trending themes are visible as chips.
- Top discussions are ranked and scannable.
- Scores, comments, author, and recency are present.

## Copy Style

Use concise, functional copy:

- Prefer "AI Generated Summary" over playful labels.
- Prefer "Highest Signal Discussions" for digest ranking.
- Prefer "Submit" over "Create something amazing".
- Prefer "Share a new link or start a text discussion." for submit helper text.
- Prefer "AI-assisted moderation is active." for safety notes.

Avoid:

- Exclamation-heavy copy.
- Marketing promises.
- Long explanations inside the UI.
- Tutorial text that describes obvious controls.

## What To Avoid During Implementation

- Do not turn the app into a landing page.
- Do not keep the current light shadcn default as the primary look if implementing Stitch.
- Do not use nested cards for page sections.
- Do not use giant section cards around the feed.
- Do not use wide desktop layouts that stretch discussion text.
- Do not use orange for every link and label.
- Do not add decorative image assets to core workflow pages.
- Do not let bottom nav or fixed bars cover content.

## Summary

The design system should make IPAI Flow feel like a dense, trusted, AI-assisted technical forum. The strongest Stitch direction is the dark mobile-first community feed with orange brand accents, compact cards, clear voting, AI summary panels, and bottom navigation. Every implementation choice should preserve speed of scanning and depth of discussion.
