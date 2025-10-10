# @atlas/ui

ATLAS Design System - Reusable UI components

## Installation

This is an internal package in the ATLAS monorepo.

```bash
pnpm add @atlas/ui
```

## Usage

```tsx
import { Button, Modal, Badge, Card } from '@atlas/ui';

export const MyComponent = () => {
  return (
    <Card variant="elevated" padding="md">
      <Badge variant="success">Active</Badge>
      <Button variant="primary" size="md">
        Click me
      </Button>
    </Card>
  );
};
```

## Components

### Primitives
- `Button` - Button component with variants and sizes
- `Modal` - Modal dialog with backdrop
- `Badge` - Status badges and labels
- `Card` - Container component

### Compositions
- (To be added)

## Development

```bash
# Lint
pnpm lint

# Format
pnpm format

# Type check
pnpm type-check
```
