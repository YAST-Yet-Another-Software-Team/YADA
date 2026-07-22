# Assets

No logo, icon set, or imagery was attached to this project brief. Nothing
in this folder is a drawn/approximated substitute for a real YADA brand
mark — see readme.md → "Logo — none provided".

## Iconography

Icons load through **Iconify** (the engine behind icones.js.org), using the
**Lucide** set within it for stroke weight/rounded joins that sit well next
to Plus Jakarta Sans. Swap the `lucide:` prefix for any other set on
icones.js.org (e.g. `ph:`, `tabler:`) if YADA prefers a different family —
no code changes needed beyond the icon name.

```html
<script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
<iconify-icon icon="lucide:map-pin" style="width:20px;height:20px;color:var(--color-primary)"></iconify-icon>
```

- Stroke icons only, sized 16/20/24px inline with text.
- Icon color inherits `currentColor` — recolor via CSS `color`.
- Icon-only controls (map zoom, close, back) require `aria-label`.
- Common icons used across the UI kit: `lucide:map-pin`, `lucide:navigation`,
  `lucide:clock`, `lucide:phone`, `lucide:message-circle`, `lucide:x`,
  `lucide:chevron-left`, `lucide:chevron-right`, `lucide:search`,
  `lucide:check-circle-2`, `lucide:truck`, `lucide:user`.
- No web-component script tag needed inside `_ds_bundle.js` consumers — load
  the `iconify-icon` script once per page, same as any other CDN dependency.

## Wordmark

No logo file was provided. Wherever a mark would go, set "YADA" in
`--font-display` at `--weight-extrabold` — see `guidelines/brand-wordmark.html`.
Do not draw a substitute logomark.
