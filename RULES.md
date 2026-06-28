# Frontend Architecture & API Standardization Rules

## Purpose

This document defines mandatory frontend architecture, API response standards, loading/error handling conventions, and reusable UI patterns across all applications.

The goal is to ensure:

* Consistent API contracts
* Predictable frontend behavior
* Improved maintainability
* Better developer experience
* Alignment with Next.js App Router best practices

---

# 1. API Response Standardization

## Rule

Every API endpoint MUST return the same response structure.

### Standard Response Interface

```ts
export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  message: string;
}
```

---

## Success Response Example

```json
{
  "ok": true,
  "data": {
    "id": "123",
    "name": "John"
  },
  "message": "User retrieved successfully."
}
```

---

## Error Response Example

```json
{
  "ok": false,
  "data": null,
  "message": "User not found."
}
```

---

## Shared Response Utilities

Location:

```txt
lib/api-response.ts
```

Implementation:

```ts
export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  message: string;
}

export function success<T>(
  data: T,
  message = "Success"
): ApiResponse<T> {
  return {
    ok: true,
    data,
    message,
  };
}

export function failure(
  message: string
): ApiResponse<null> {
  return {
    ok: false,
    data: null,
    message,
  };
}
```

---

## Requirements

### MUST

* Use `success()` for successful responses.
* Use `failure()` for failed responses.
* Return `ApiResponse<T>` from every endpoint.
* Keep response shapes identical across services.

### MUST NOT

* Return custom response structures.
* Return raw database objects.
* Return `{ error: true }` style responses.
* Return inconsistent payloads.

---

# 2. Next.js Route State Convention

## Rule

Every route segment MUST implement App Router state files.

### Required Files

```txt
loading.tsx
error.tsx
not-found.tsx
```

---

## Loading State

Every page must support loading states using:

```txt
loading.tsx
```

Do not implement page loading inline.

---

## Error State

Every page must support graceful error recovery using:

```txt
error.tsx
```

Do not implement page-specific ad-hoc error screens.

---

## Not Found State

Every applicable route must support:

```txt
not-found.tsx
```

Examples:

* User detail pages
* Product pages
* Dynamic routes
* Station pages

---

## Requirements

### MUST

* Use official Next.js App Router conventions.
* Keep route states colocated with routes.
* Provide meaningful loading and error experiences.

### MUST NOT

* Use inline loading indicators.
* Use inline page-level error screens.
* Ignore missing route states.

---

# 3. Global Loading Component

## Rule

Loading buttons should be avoided whenever a page, section, or route loader is more appropriate.

Create a single reusable loading component.

---

## Location

```txt
components/ui/global-loading.tsx
```

---

### Table Interaction Rules

- Table rows should be clickable by default and navigate to the relevant details page.
- Avoid adding an "Actions" column solely for navigation purposes.
- Add an "Actions" column only when row-specific operations require a modal or dropdown menu, such as:
  - Edit
  - Delete
  - Approve
  - Reject
  - Assign
  - Other modal-based interactions
- Keep table interfaces clean and minimize unnecessary action buttons.

## Features

* Centered spinner
* Optional loading text
* Fullscreen mode
* Inline mode
* Accessible
* Theme aware
* Reusable

---

## Component API

```tsx
<GlobalLoading />

<GlobalLoading
  text="Loading users..."
/>

<GlobalLoading
  fullscreen
/>
```

---

## Requirements

### MUST

* Reuse throughout the application.
* Use for route loading states.
* Use for section loading states.
* Support accessibility standards.

### MUST NOT

* Create duplicate loading components.
* Implement custom spinners per page.
* Depend on loading buttons as the primary loading UX.

---

# 4. Global Error Modal

## Rule

Errors must be displayed using a reusable modal component.

---

## Location

```txt
components/ui/error-modal.tsx
```

---

## Features

* Modal dialog
* Error icon
* Title
* Message
* Close button
* Optional retry callback
* Accessible
* Theme aware

---

## Component API

```tsx
<ErrorModal
  open={open}
  title="Request Failed"
  message={error}
  onClose={handleClose}
  onRetry={handleRetry}
/>
```

---

## Requirements

### MUST

* Use as the standard error presentation.
* Provide actionable feedback.
* Support retry when applicable.

### MUST NOT

* Use snackbar-only errors.
* Use toast-only errors.
* Use inline red text as primary error handling.
* Duplicate modal implementations.

---

# 5. Shared API Client

## Rule

All frontend applications must consume APIs through a shared client.

---

## Responsibilities

The API client must:

* Parse `ApiResponse<T>`
* Handle network failures
* Handle unexpected server failures
* Surface consistent error messages
* Provide reusable request methods

---

## Example

```ts
const response = await api.get<User>("/users");

if (!response.ok) {
  showError(response.message);
  return;
}

return response.data;
```

---

## Requirements

### MUST

* Centralize request handling.
* Return typed responses.
* Support GET, POST, PUT, PATCH, DELETE.
* Handle authentication headers.
* Handle JSON serialization.

### MUST NOT

* Duplicate fetch logic.
* Parse API responses manually across pages.
* Implement custom request handlers per feature.

---

# Acceptance Criteria

## API

* [ ] Every API returns `ApiResponse<T>`
* [ ] Shared `success()` helper implemented
* [ ] Shared `failure()` helper implemented
* [ ] No endpoint returns custom response shapes

---

## Route States

* [ ] Every route includes `loading.tsx`
* [ ] Every route includes `error.tsx`
* [ ] Every applicable route includes `not-found.tsx`

---

## Loading UX

* [ ] Global loading component created
* [ ] Global loading component reused throughout the application
* [ ] Loading buttons removed where page or section loaders are more appropriate

---

## Error UX

* [ ] Global error modal created
* [ ] Global error modal reused throughout the application
* [ ] Snackbar-only error handling removed
* [ ] Inline text-only error handling removed

---

## API Client

* [ ] Shared API client implemented
* [ ] Consistent API consumption across applications
* [ ] Automatic response parsing implemented
* [ ] Network error handling implemented

---

# Expected Outcome

* Consistent API contracts across all services.
* Unified loading experience.
* Unified error handling experience.
* Improved maintainability.
* Improved developer experience.
* Alignment with Next.js App Router best practices.
* Reusable UI primitives for future projects.
* Faster onboarding for new developers.
* Reduced technical debt.
