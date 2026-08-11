# UI Design Rules

## Shadcn UI + Tailwind CSS

> These rules are mandatory for all new UI and UI modifications.
> The goal is to maintain a consistent, professional, responsive, accessible, and production-ready interface.

---

# 1. Core Principles

Always prioritize:

1. Consistency
2. Simplicity
3. Responsiveness
4. Accessibility
5. Reusability
6. Maintainability
7. shadcn/ui conventions
8. Existing project design system

Do not introduce custom UI patterns when an existing shadcn component already solves the problem.

Do not redesign existing pages unless explicitly requested.

---

# 2. Preserve Existing Design

When modifying an existing page:

* Keep the existing background.
* Keep the existing color system.
* Keep existing spacing patterns.
* Keep existing border radius.
* Keep existing typography.
* Keep existing card styles.
* Keep existing shadows.
* Keep existing responsive behavior.
* Keep existing component hierarchy unless there is a clear reason to change it.

Do not randomly introduce:

```text
rounded-xl
rounded-2xl
shadow-xl
bg-gray-50
text-gray-500
```

if the existing project uses different design tokens.

Use the project's CSS variables and Tailwind design tokens.

---

# 3. Use Shadcn Components First

Before creating a custom component, check whether shadcn already provides it.

Prefer:

```tsx
Button
Input
Textarea
Label
Select
Checkbox
RadioGroup
Switch
Dialog
Sheet
Popover
DropdownMenu
Command
Combobox
Calendar
DatePicker
Card
Table
Tabs
Badge
Alert
Tooltip
Breadcrumb
Pagination
Skeleton
Separator
```

Do not recreate these with:

```html
<div>
  <input />
</div>
```

when the corresponding shadcn component exists.

---

# 4. Select vs Popover vs Combobox

This is one of the most important rules.

## Use Select for normal single selection

Use:

```tsx
<Select>
```

when:

* Options are predefined.
* User selects one option.
* Search is not required.
* The list is reasonably small.

Example:

```text
Status
[ Active                 ▼ ]
```

Do NOT replace a normal Select with a Popover unnecessarily.

---

## Use Popover for contextual content

Use:

```tsx
<Popover>
```

for:

* Date picker
* Calendar
* Color picker
* Small contextual panels
* Custom floating content

Do not use Popover simply because it can display a list.

---

## Use Combobox for searchable selection

Use:

```text
Popover
+
Command
```

when the user needs to search through options.

Examples:

```text
Select Customer
[ Search customer...        ]
```

```text
Select Driver
[ Search driver...          ]
```

```text
Select Station
[ Search station...         ]
```

---

# 5. Do Not Turn Every Select Into a Combobox

Avoid this mistake:

```text
Country
[ Search country... ]
```

when there are only a few options.

Use:

```text
Country
[ Nigeria ▼ ]
```

Keep the UI simple.

---

# 6. Form Width

Forms should normally use the available container width.

Prefer:

```tsx
className="w-full"
```

for:

* Input
* Select trigger
* Textarea
* Combobox trigger
* Date picker trigger
* Form controls

Example:

```tsx
<FormField
  control={form.control}
  name="name"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Name</FormLabel>
      <FormControl>
        <Input {...field} className="w-full" />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

Do not unnecessarily use:

```text
w-[300px]
w-[350px]
w-64
```

inside responsive forms.

---

# 7. Form Layout

Use responsive grids.

Prefer:

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
```

For larger forms:

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
```

Avoid fixed-width form layouts.

Bad:

```tsx
<div className="flex gap-4">
  <Input className="w-[300px]" />
  <Input className="w-[300px]" />
</div>
```

Better:

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
  <Input className="w-full" />
  <Input className="w-full" />
</div>
```

---

# 8. Form Labels

Every form control must have a visible label unless there is a strong UX reason not to.

Use:

```tsx
<FormLabel>
```

or:

```tsx
<Label>
```

Do not rely on placeholders as labels.

Bad:

```text
[ Enter customer name ]
```

Better:

```text
Customer Name
[ Enter customer name ]
```

---

# 9. Placeholder Rules

Placeholders should describe expected input.

Good:

```text
Enter customer name
Enter phone number
Enter registration number
Select a station
Search drivers...
```

Avoid:

```text
Name
Value
Type here
Input
```

Do not use placeholder text as the only explanation of a field.

---

# 10. Form Validation

Use the project's existing validation system.

Prefer:

```text
React Hook Form
+
Zod
+
shadcn Form
```

Validation messages should appear through:

```tsx
<FormMessage />
```

Do not manually create inconsistent error messages.

---

# 11. Buttons

Use shadcn `Button`.

Prefer semantic variants:

```tsx
<Button>
Primary action
</Button>

<Button variant="secondary">
Secondary action
</Button>

<Button variant="outline">
Alternative action
</Button>

<Button variant="destructive">
Delete
</Button>
```

Do not create random button styles such as:

```text
bg-blue-600 hover:bg-blue-700
```

unless the design system specifically requires it.

---

# 12. Button Width

Buttons should generally size naturally.

Prefer:

```tsx
<Button>Save</Button>
```

Use:

```tsx
className="w-full"
```

when the button belongs to a mobile/full-width action layout.

Do not make every desktop button `w-full`.

---

# 13. Loading Buttons

When an action is processing:

```text
[ Saving... ]
```

The button should:

* show loading state
* prevent duplicate submissions
* remain visually consistent
* preserve button dimensions where practical

Do not allow users to repeatedly submit the same action.

---

# 14. Icons

Use the project's existing icon library.

If the project uses Lucide:

```tsx
import { Plus, Pencil, Trash2 } from "lucide-react"
```

Do not mix multiple icon libraries without a reason.

Icons should generally be:

```text
size-4
```

for normal controls.

Use:

```text
size-5
```

when appropriate for larger navigation/actions.

---

# 15. Icon-Only Buttons

Every icon-only button must have an accessible label.

Use:

```tsx
<Button
  variant="ghost"
  size="icon"
  aria-label="Edit driver"
>
  <Pencil />
</Button>
```

Prefer a tooltip for unfamiliar actions.

---

# 16. Cards

Use shadcn `Card` where a visual grouping is needed.

Typical structure:

```tsx
<Card>
  <CardHeader>
    <CardTitle>...</CardTitle>
    <CardDescription>...</CardDescription>
  </CardHeader>

  <CardContent>
    ...
  </CardContent>
</Card>
```

Do not wrap every section in a Card.

Cards should represent meaningful groups.

---

# 17. Tables

Use shadcn table components for structured data.

Typical layout:

```text
Name
Status
Phone
Created
Actions
```

Actions should usually be placed in the final column.

Avoid excessive actions.

Prefer:

```text
[ ⋮ ]
```

for secondary actions.

---

# 18. Responsive Tables

Tables must remain usable on smaller screens.

When necessary:

```tsx
<div className="overflow-x-auto">
  <Table />
</div>
```

Do not allow tables to break the entire page width.

For very complex tables, consider a responsive mobile-specific presentation.

---

# 19. Data Table Actions

Prefer:

```text
View
Edit
Archive
Delete
```

inside a dropdown for secondary actions.

Do not display 6-10 buttons in every table row.

---

# 20. Empty States

Every important list/table should have an empty state.

Example:

```text
No drivers found

Add your first driver to start managing
your fleet drivers.

[ Add Driver ]
```

Do not show an empty table with no explanation.

---

# 21. Loading States

Use shadcn Skeleton where appropriate.

Avoid showing blank screens while data loads.

Example:

```tsx
<Skeleton className="h-10 w-full" />
```

For tables, show several skeleton rows rather than one giant skeleton.

---

# 22. Error States

API failures should provide useful feedback.

Example:

```text
Unable to load drivers

Something went wrong while loading the driver list.

[ Try Again ]
```

Do not expose raw API errors to users.

Avoid:

```text
AxiosError: Request failed with status code 500
```

---

# 23. Toasts

Use the project's existing toast/sonner implementation.

Success:

```text
Driver created successfully.
```

Error:

```text
Failed to create driver. Please try again.
```

Avoid unnecessary toast messages for every tiny interaction.

---

# 24. Dialogs

Use `Dialog` for short focused interactions.

Good:

```text
Delete Driver
Are you sure you want to delete this driver?

[Cancel] [Delete]
```

Do not put extremely large forms inside small dialogs.

For complex forms, prefer a dedicated page or Sheet.

---

# 25. Sheet

Use `Sheet` for:

* Mobile navigation
* Filters
* Quick edit panels
* Secondary forms
* Side panels

Ensure the Sheet works properly on mobile.

---

# 26. Destructive Actions

Delete actions must require confirmation when the operation is significant.

Use:

```text
AlertDialog
```

rather than a simple button click.

Example:

```text
Delete Transporter?

This action cannot be undone.
Historical records may remain available.

[Cancel] [Delete]
```

---

# 27. DropdownMenu

Use `DropdownMenu` for actions.

Example:

```text
[ ⋮ ]

View
Edit
Archive
Delete
```

Do not use Popover for standard action menus.

---

# 28. Date Selection

Use the project's shadcn Calendar/Date Picker pattern.

Do not build custom date dropdowns unless required.

Use a clear display format.

Example:

```text
11 Aug 2026
```

rather than exposing raw ISO dates in the UI.

---

# 29. Currency

Currency display must use the application's configured currency.

Do not hardcode:

```text
₦
$
€
```

throughout components.

Use a shared formatter:

```text
formatCurrency(amount, currency)
```

The UI should automatically respect the tenant's currency configuration.

---

# 30. Number Formatting

Use consistent formatting for:

* Currency
* Liters
* Quantities
* Percentages
* Counts

Examples:

```text
₦2,500,000.00
33,000 L
12.5%
1,250
```

Do not manually format numbers differently in every component.

---

# 31. Spacing

Use Tailwind spacing tokens consistently.

Prefer:

```text
gap-2
gap-3
gap-4
gap-6
gap-8
```

Avoid arbitrary values unless necessary:

```text
gap-[13px]
mt-[17px]
px-[27px]
```

Use arbitrary values only when the design genuinely requires them.

---

# 32. Page Layout

Use a consistent page structure.

Recommended:

```tsx
<div className="space-y-6">
  <PageHeader />

  <PageContent />
</div>
```

Page headers should generally contain:

```text
Title
Description
Primary Action
```

Example:

```text
Drivers
Manage your fleet drivers.

                         [ Add Driver ]
```

---

# 33. Responsive Page Header

Desktop:

```text
Drivers                         [Add Driver]
Manage your fleet drivers.
```

Mobile:

```text
Drivers

Manage your fleet drivers.

[ Add Driver ]
```

Use responsive flex/grid classes.

Do not force everything into one horizontal row on mobile.

---

# 34. Responsive Design

Always design mobile-first.

Use:

```text
grid-cols-1
md:grid-cols-2
lg:grid-cols-3
```

instead of fixed desktop layouts.

Avoid:

```text
min-w-[1200px]
w-[1000px]
```

unless the component specifically requires horizontal scrolling.

---

# 35. Container Width

Use a consistent application container.

Example:

```tsx
<div className="mx-auto w-full max-w-7xl px-4 md:px-6">
```

Do not randomly use different maximum widths on every page.

---

# 36. Typography

Use the project's typography system.

Recommended hierarchy:

```text
Page Title
text-2xl / text-3xl

Section Title
text-lg / text-xl

Body
text-sm / text-base

Secondary information
text-muted-foreground
```

Do not overuse large headings.

---

# 37. Color Usage

Prefer semantic tokens:

```text
bg-background
bg-card
text-foreground
text-muted-foreground
border-border
bg-primary
text-primary-foreground
```

Avoid hardcoding colors:

```text
bg-white
text-black
bg-gray-100
text-gray-600
```

unless there is a specific design requirement.

This ensures dark mode works correctly.

---

# 38. Dark Mode

Every new component must work in dark mode.

Do not introduce:

```text
bg-white
text-black
border-gray-200
```

without considering dark mode.

Prefer shadcn semantic tokens.

---

# 39. Border Radius

Use the existing shadcn radius system.

Do not randomly mix:

```text
rounded-sm
rounded-md
rounded-lg
rounded-xl
rounded-2xl
rounded-full
```

Use the project's established radius tokens.

Buttons, inputs, cards, dialogs, and other controls should feel like they belong to the same system.

---

# 40. Shadows

Use shadows sparingly.

Do not add:

```text
shadow-xl
shadow-2xl
```

to every card.

Prefer the existing component styles.

---

# 41. Forms Inside Cards

Recommended:

```text
Card
├── CardHeader
│   ├── Title
│   └── Description
│
└── CardContent
    └── Form
```

Form fields:

```text
Label
Control
Description (optional)
Error
```

Maintain consistent vertical spacing.

---

# 42. Form Actions

For normal forms:

```text
                         [Cancel] [Save]
```

On mobile:

```text
[Cancel]
[Save]
```

or a suitable responsive layout.

Primary action should be visually stronger.

---

# 43. Search & Filters

Use a consistent pattern:

```text
[ Search... ] [Status ▼] [Date ▼] [Filters]
```

Search input should normally be:

```tsx
className="w-full"
```

within its responsive container.

Do not create custom filter dropdowns if shadcn provides the required component.

---

# 44. Select Width

The trigger should normally fill the form field:

```tsx
<SelectTrigger className="w-full">
```

Avoid:

```tsx
<SelectTrigger className="w-[180px]">
```

unless the design specifically requires a fixed compact control.

---

# 45. Combobox Width

The trigger:

```tsx
<Button
  variant="outline"
  role="combobox"
  className="w-full justify-between"
>
```

The popover content should match the trigger width where appropriate.

Do not let a searchable selection appear as an unexpectedly tiny dropdown.

---

# 46. Popover Width

For custom Popovers, avoid arbitrary fixed widths where possible.

Prefer matching the trigger:

```text
w-[--radix-popover-trigger-width]
```

or the project's established shadcn pattern.

This prevents:

```text
Input: 400px
Popover: 180px
```

from looking broken.

---

# 47. Accessibility

Every component must be keyboard accessible.

Ensure:

* Labels are associated with controls.
* Buttons have accessible names.
* Icon-only buttons have `aria-label`.
* Dialogs have titles.
* Inputs have labels.
* Focus states are preserved.
* Color is not the only indicator of status.

Never remove focus outlines without providing an accessible replacement.

---

# 48. Status Badges

Use `Badge` for statuses.

Examples:

```text
ACTIVE
PENDING
COMPLETED
CANCELLED
SUSPENDED
```

Keep status styling consistent across the application.

Do not create a completely different badge design for every page.

---

# 49. Status Mapping

Create a shared status configuration.

Conceptually:

```tsx
const statusConfig = {
  ACTIVE: {...},
  PENDING: {...},
  COMPLETED: {...},
  CANCELLED: {...},
}
```

Do not duplicate status colors/styles in 20 different components.

---

# 50. Avoid Overengineering

Do not create abstractions simply to make the code look advanced.

Bad:

```text
UniversalFormRenderer
UniversalFieldFactory
DynamicUniversalSelect
GenericCardWrapper
```

when a simple shadcn component is sufficient.

Prefer clear, readable components.

---

# 51. Avoid Inline Styling

Prefer Tailwind:

```tsx
className="w-full"
```

instead of:

```tsx
style={{ width: "100%" }}
```

Do not introduce CSS files for one-off styling unless necessary.

---

# 52. Avoid Excessive Tailwind Classes

Bad:

```tsx
className="
  flex
  items-center
  justify-center
  rounded-lg
  border
  border-gray-200
  bg-white
  px-4
  py-2
  shadow-sm
  ...
"
```

when the shadcn component already provides those styles.

Prefer:

```tsx
<Button variant="outline">
```

and only add the classes that are actually necessary.

---

# 53. Component Reuse

Before creating a new component:

1. Search existing components.
2. Check `components/ui`.
3. Check feature-specific components.
4. Reuse existing patterns.
5. Only create a new component if the existing ones don't fit.

Do not create duplicate:

```text
UserSelect
CustomerSelect
DriverSelect
StationSelect
```

if they all use the same reusable searchable-selection pattern.

Instead, create a clean reusable component where appropriate.

---

# 54. Avoid Premature Generic Components

Do not make every component generic.

Prefer:

```text
DriverForm
CustomerForm
StationForm
```

when their business logic differs.

Use reusable primitives for actual repeated UI patterns.

---

# 55. Forms Must Match Existing Patterns

Before creating a new form:

* Find an existing form.
* Copy its structural pattern.
* Reuse the same `FormField` structure.
* Reuse the same validation approach.
* Reuse the same button layout.
* Reuse the same error handling.
* Reuse the same responsive grid.

Do not introduce a second form architecture.

---

# 56. Dialog Forms

For small forms:

```text
Dialog
├── DialogHeader
├── Form
│   └── FormFields
└── DialogFooter
```

Do not place huge forms inside Dialogs.

---

# 57. Mobile Rules

On mobile:

* Inputs should normally be `w-full`.
* Buttons may become full-width where appropriate.
* Multi-column forms should collapse to one column.
* Tables should scroll or transform appropriately.
* Dialogs should fit the viewport.
* Sheets should be usable with touch.
* Avoid tiny click targets.
* Avoid horizontal page overflow.

---

# 58. Desktop Rules

On desktop:

* Don't make every control full screen width.
* Use sensible max-widths.
* Use grids for forms.
* Keep primary actions visible.
* Use whitespace to create hierarchy.
* Avoid excessive empty space.

`w-full` means full width of the **available field/container**, not necessarily the entire page.

---

# 59. AI IDE Rules

When generating UI, the AI IDE MUST:

1. Inspect existing components before creating new ones.
2. Inspect existing Tailwind/shadcn configuration.
3. Follow existing theme tokens.
4. Reuse existing components.
5. Use shadcn components whenever available.
6. Use `Select` for normal selections.
7. Use `Popover + Command` only for searchable selections.
8. Use `Popover` for contextual/floating content.
9. Use `w-full` for normal form controls.
10. Use responsive grids for forms.
11. Never introduce arbitrary fixed widths without justification.
12. Preserve dark mode.
13. Preserve existing radius.
14. Preserve existing spacing.
15. Preserve existing colors.
16. Preserve existing backgrounds.
17. Avoid unnecessary custom CSS.
18. Avoid duplicate components.
19. Ensure keyboard accessibility.
20. Ensure mobile responsiveness.
21. Use semantic shadcn/Tailwind tokens.
22. Reuse existing validation patterns.
23. Reuse existing loading/error/empty states.
24. Never replace a working component with a different UI pattern without a reason.
25. Do not change unrelated components.

---

# 60. Before Finishing Any UI Task

The AI must perform this checklist:

### Design

* [ ] Does this match the existing design?
* [ ] Does it use shadcn components?
* [ ] Does it use existing theme tokens?
* [ ] Does it work in dark mode?
* [ ] Is spacing consistent?
* [ ] Is border radius consistent?

### Forms

* [ ] Are all fields labeled?
* [ ] Are inputs/selects normally `w-full`?
* [ ] Is the correct Select/Popover/Combobox pattern used?
* [ ] Is validation consistent?
* [ ] Are errors displayed correctly?
* [ ] Are loading states handled?

### Responsive

* [ ] Does it work on mobile?
* [ ] Does the form collapse correctly?
* [ ] Are buttons usable?
* [ ] Does the table overflow correctly?
* [ ] Is there horizontal page overflow?

### Accessibility

* [ ] Are icon buttons labeled?
* [ ] Are controls keyboard accessible?
* [ ] Are focus states preserved?
* [ ] Are dialogs properly labeled?

### Code Quality

* [ ] Did I reuse existing components?
* [ ] Did I avoid unnecessary abstractions?
* [ ] Did I avoid duplicate components?
* [ ] Did I avoid arbitrary Tailwind values?
* [ ] Did I avoid changing unrelated code?

---

# 61. Golden Rule

> **Do not make the UI look "different" just to make it look better. Make it look like it already belongs to the application.**

When adding a component, the first question should be:

```text
"What existing shadcn component and project pattern
should I reuse?"
```

not:

```text
"How can I build this from scratch?"
```

The final UI should feel like **one coherent design system**, not a collection of components generated at different times by AI.
