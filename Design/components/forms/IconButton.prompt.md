Circular icon-only control for map controls, dialog close, and back navigation — always ships an `aria-label` since there's no visible text.

```jsx
<IconButton icon={<iconify-icon icon="lucide:x"></iconify-icon>} ariaLabel="Close" onClick={close} />
```

Variants: `ghost` (default, floats over map with shadow), `solid` (brand-filled), `outline`. Sizes: `sm` 32px, `md` 40px, `lg` 48px.
