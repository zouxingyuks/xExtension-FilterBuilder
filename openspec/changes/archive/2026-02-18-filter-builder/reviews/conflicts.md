# Conflicts: filter-builder

## Status: NO CONFLICTS

## Backend ↔ Frontend Interface Contract

### Data injected via js_vars hook

```javascript
window.context.filterBuilder = {
  feeds: [{ id: number, name: string }],
  categories: [{ id: number, name: string }],
  labels: [{ id: number, name: string }],
  userQueries: [{ id: number, name: string }]
}
```

Both backend (PHP injectData) and frontend (OperatorRegistry multiselect renderers) MUST agree on this exact shape.

## Resolved Conflicts

None at this stage.

## Open Items

None.
