---
name: accessibility
description: Ship UI that works for users with disabilities, keyboards, screen readers, and assistive tech. Invoke when building any user-facing interface.
category: frontend
group: review
tags: [a11y, wcag, ui, frontend]
risk: medium
---

# Accessibility

Accessibility is not a feature to add later. The cost of retrofitting is 10–100x the cost of doing it right the first time. It's also a legal requirement in many jurisdictions.

## The four WCAG principles

1. **Perceivable** — users must be able to perceive the content (vision, hearing, touch).
2. **Operable** — users must be able to operate the interface (keyboard, pointer, voice).
3. **Understandable** — content and behavior must be understandable.
4. **Robust** — must work with assistive technologies.

Target **WCAG 2.1 AA** unless you have a reason to go higher.

## Practical rules, by category

### Semantic HTML

Use the right element for the job. The browser and screen readers already know what `<button>` is; `<div onClick>` makes you reimplement all of it badly.

- `<button>` for actions.
- `<a href>` for navigation.
- `<input>` + `<label>` for form fields (label associated by `for` + `id` or wrapping).
- `<nav>`, `<main>`, `<article>`, `<aside>`, `<header>`, `<footer>` for page structure.
- Heading hierarchy: `h1` → `h2` → `h3`, no skipping. One `h1` per page.

**If you use a `div` instead of a button, you owe:** `role="button"`, `tabindex="0"`, keyboard handling (Enter and Space), focus styles, and any other native button behavior. It's not worth it.

### Keyboard

Every interactive element must be reachable and operable via keyboard alone.

- **Tab** moves between interactive elements.
- **Shift+Tab** goes back.
- **Enter** and **Space** activate buttons.
- **Escape** closes modals.
- **Arrow keys** navigate within composite widgets (menus, tabs, grids).

Test: unplug your mouse. Can you use the whole page?

### Focus

- **Visible focus outline on every interactive element.** Don't `outline: none` unless you're replacing it with something equally visible. Obvious focus indicators are a WCAG requirement.
- **Focus order matches visual order.** Don't skip around because of positional CSS.
- **Focus management on dynamic UI.** When a modal opens, focus goes into the modal. When it closes, focus returns to the trigger. `aria-modal` + focus trap.

### Screen readers

- **Alt text on every meaningful image.** Decorative images get `alt=""` (empty, not missing).
- **Labels on every form field.** Not placeholder-as-label — placeholders disappear on input.
- **ARIA only when semantic HTML can't do it.** ARIA is a fix, not a starting point.
- **Live regions (`aria-live`)** for dynamic status messages ("Saved," "Error loading").
- **Link text that makes sense out of context.** "Click here" is useless; "Download the 2024 annual report (PDF)" is useful.

### Color and contrast

- **Text contrast ≥ 4.5:1** for body text (WCAG AA).
- **Large text (≥18pt or ≥14pt bold) ≥ 3:1.**
- **Non-text (icons, borders) ≥ 3:1.**
- **Don't convey meaning with color alone.** "Required fields are red" → also add an asterisk or "(required)."
- **Respect system preferences:** `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast`.

### Motion

- **Avoid auto-play video / motion.** If you must, provide controls.
- **No blinking or flashing >3 times per second.** Triggers seizures.
- **Honor `prefers-reduced-motion: reduce`.** Disable parallax, fancy transitions.

### Forms

- **Every input has a visible label.**
- **Error messages are associated** with the input via `aria-describedby`.
- **Error messages are specific** — "Enter a valid email address (e.g., name@example.com)" not "Invalid input."
- **Don't require JavaScript to submit** unless the whole app is JS. Progressive enhancement.
- **Autocomplete attributes** on identity fields (`autocomplete="email"`, `autocomplete="current-password"`).

## Testing

### Automated (catches ~30% of issues)

- **Lighthouse** in Chrome DevTools.
- **axe-core** (devtools extension or as a test library integration).
- **eslint-plugin-jsx-a11y** for React.

Automated tests catch obvious issues. They miss the subtle ones.

### Manual (catches the rest)

1. **Keyboard-only.** Unplug the mouse, navigate the whole feature.
2. **Screen reader.** VoiceOver (macOS), NVDA (Windows), JAWS (Windows), Orca (Linux). Turn it on, close your eyes, navigate.
3. **Zoom to 200%.** Does the layout still work? Content shouldn't clip or require horizontal scrolling.
4. **System dark mode / high contrast.** Does it still look right?
5. **`prefers-reduced-motion`.** Is motion reduced appropriately?

Doing this once per feature is worth more than every linter combined.

## Anti-patterns

- **Placeholder as label.** Empties on focus, useless for screen readers, bad contrast usually.
- **`aria-label` on everything.** Over-labels create noisy screen reader output. Use semantic HTML first.
- **`tabindex` > 0.** Creates confusing tab order. Only use 0 (focusable) or -1 (programmatically focusable).
- **Alt text that describes what the image is, not its purpose.** `alt="photo of a dog"` vs `alt="Adopt Rex, a 3-year-old beagle"`.
- **`<div onClick>` everywhere.** Reimplements button badly.
- **"We'll fix accessibility in a later sprint."** You won't. Do it right the first time.
- **Testing only with a mouse and normal vision.** Test with the tools real users use.
