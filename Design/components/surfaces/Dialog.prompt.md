Modal for confirmations — cancel request, courier contact details.

```jsx
<Dialog open={open} onClose={close} title="Cancel request?">
  <p>Your courier hasn't been assigned yet.</p>
</Dialog>
```

Uses `--color-overlay` scrim (warm-tinted black, no blur — see readme Visual Foundations).
