Primary action control for confirming requests, submitting forms, and CTAs — use `variant="primary"` (red) for the one main action per screen, `secondary` (orange) sparingly for a co-equal alternate action, `outline`/`ghost` for lower-emphasis actions, `danger` for destructive/cancel actions.

```jsx
<Button variant="primary" size="lg" onClick={requestCourier}>
  Request a courier
</Button>
```

Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`. Sizes: `sm`, `md`, `lg`. Props: `disabled`, `fullWidth`, `icon` (pass an `<iconify-icon icon="lucide:...">` or any node).
