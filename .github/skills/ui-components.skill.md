---
name: ui-components
description: "shadcn/ui components usage, Tailwind CSS styling patterns, and responsive design for AWS Lambda Dashboard"
applyTo: "src/components/**,src/app/**/*.tsx"
---

# UI Components Skill

## Overview

Expert guidance for using shadcn/ui components, Tailwind CSS styling, and creating responsive, accessible UI for the AWS Lambda Dashboard.

## shadcn/ui Components

All components are located in `src/components/ui/` and built with Radix UI primitives + Tailwind CSS.

### Button Component

```typescript
import { Button } from "@/components/ui/button";

// Variants
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>

// With icon
<Button>
  <PlusIcon className="mr-2 h-4 w-4" />
  Add Item
</Button>
```

### Select Component

```typescript
import { Select } from "@/components/ui/select";

<Select 
  value={selectedValue}
  onChange={(e) => setSelectedValue(e.target.value)}
  className="w-full"
  disabled={loading}
>
  <option value="">Select option</option>
  {options.map(opt => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ))}
</Select>
```

### Input Component

```typescript
import { Input } from "@/components/ui/input";

// Text input
<Input 
  type="text"
  placeholder="Search..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  className="w-full"
/>

// With label
<div className="space-y-2">
  <label htmlFor="name" className="text-sm font-medium">
    Name
  </label>
  <Input 
    id="name"
    value={name}
    onChange={(e) => setName(e.target.value)}
  />
</div>
```

### Table Components

```typescript
import { Table, TableHead, TableRow, TableCell } from "@/components/ui/table";

<div className="overflow-x-auto">
  <Table>
    <thead>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </thead>
    <tbody>
      {data.map(item => (
        <TableRow key={item.id}>
          <TableCell>{item.name}</TableCell>
          <TableCell>
            <Badge variant={item.active ? "success" : "secondary"}>
              {item.active ? "Active" : "Inactive"}
            </Badge>
          </TableCell>
          <TableCell>
            <Button size="sm" onClick={() => handleEdit(item)}>
              Edit
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </tbody>
  </Table>
</div>

// Loading state in table
{loading ? (
  <TableRow>
    <TableCell colSpan={3} className="text-center py-8">
      <Loader className="animate-spin mx-auto" />
      <p className="mt-2 text-gray-500">Loading...</p>
    </TableCell>
  </TableRow>
) : (
  {/* Table rows */}
)}

// Empty state
{data.length === 0 && (
  <TableRow>
    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
      No data found
    </TableCell>
  </TableRow>
)}
```

### Dialog Component

```typescript
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-2xl">
    <DialogTitle>Edit Lambda Function</DialogTitle>
    
    <div className="space-y-4 mt-4">
      {/* Dialog content */}
      <Input placeholder="Function Name" />
      <Select>
        <option>Option 1</option>
      </Select>
    </div>
    
    <div className="flex justify-end gap-2 mt-6">
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSave}>
        Save Changes
      </Button>
    </div>
  </DialogContent>
</Dialog>

// With scrollable content
<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
  {/* Long content */}
</DialogContent>
```

### Alert Component

```typescript
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Success alert
<Alert variant="success">
  <AlertTitle>Success!</AlertTitle>
  <AlertDescription>
    Lambda function updated successfully.
  </AlertDescription>
</Alert>

// Error alert
<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Failed to update Lambda function. Please try again.
  </AlertDescription>
</Alert>

// Info alert
<Alert variant="default">
  <AlertTitle>Note</AlertTitle>
  <AlertDescription>
    This operation may take a few minutes.
  </AlertDescription>
</Alert>

// Dismissible alert
const [showAlert, setShowAlert] = useState(true);

{showAlert && (
  <Alert variant="success" className="relative">
    <button 
      onClick={() => setShowAlert(false)}
      className="absolute top-2 right-2"
    >
      <X className="h-4 w-4" />
    </button>
    <AlertTitle>Success!</AlertTitle>
  </Alert>
)}
```

### Accordion Component

```typescript
import { 
  Accordion, 
  AccordionItem, 
  AccordionTrigger, 
  AccordionContent 
} from "@/components/ui/accordion";

<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Environment Variables</AccordionTrigger>
    <AccordionContent>
      <div className="space-y-2">
        {envVars.map(env => (
          <div key={env.key}>
            {env.key}: {env.value}
          </div>
        ))}
      </div>
    </AccordionContent>
  </AccordionItem>
  
  <AccordionItem value="item-2">
    <AccordionTrigger>Configuration</AccordionTrigger>
    <AccordionContent>
      {/* Config content */}
    </AccordionContent>
  </AccordionItem>
</Accordion>

// Multiple items can be open
<Accordion type="multiple">
  {/* Items */}
</Accordion>
```

## Tailwind CSS Patterns

### Color Scheme

**Primary Colors (Indigo/Blue):**
```typescript
// Backgrounds
className="bg-indigo-600 hover:bg-indigo-700"
className="bg-blue-500 hover:bg-blue-600"

// Text
className="text-indigo-700"
className="text-blue-600"

// Borders
className="border-indigo-300"
```

**Neutral Colors (Stone/Gray):**
```typescript
// Backgrounds
className="bg-stone-50"
className="bg-gray-100"

// Text
className="text-gray-700"
className="text-stone-500"
```

**Status Colors:**
```typescript
// Success
className="bg-green-100 text-green-700"

// Error
className="bg-red-100 text-red-700"

// Warning
className="bg-yellow-100 text-yellow-700"

// Info
className="bg-blue-100 text-blue-700"
```

### Layout Patterns

**Container:**
```typescript
// Full width with padding
<div className="w-full px-4 py-8">

// Max width centered
<div className="max-w-7xl mx-auto px-4">

// Dashboard layout
<div className="min-h-screen bg-gradient-to-br from-stone-50 via-stone-100 to-stone-200">
  <div className="max-w-7xl mx-auto p-6">
    {/* Content */}
  </div>
</div>
```

**Card Pattern:**
```typescript
<div className="bg-white rounded-xl shadow-lg p-6">
  <h2 className="text-2xl font-bold mb-4 text-gray-800">
    Card Title
  </h2>
  <div className="space-y-4">
    {/* Card content */}
  </div>
</div>
```

**Grid Layouts:**
```typescript
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <div key={item.id} className="bg-white p-4 rounded-lg shadow">
      {item.name}
    </div>
  ))}
</div>

// Auto-fit grid
<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
  {/* Items */}
</div>
```

**Flex Layouts:**
```typescript
// Horizontal with spacing
<div className="flex items-center gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Space between
<div className="flex justify-between items-center">
  <div>Left</div>
  <div>Right</div>
</div>

// Vertical
<div className="flex flex-col gap-2">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Responsive direction
<div className="flex flex-col md:flex-row gap-4">
  <div className="flex-1">Column/Row 1</div>
  <div className="flex-1">Column/Row 2</div>
</div>
```

### Spacing System

```typescript
// Padding
className="p-4"      // padding all sides
className="px-6 py-4" // horizontal and vertical
className="pt-2 pb-4" // top and bottom

// Margin
className="m-4"      // margin all sides
className="mx-auto"  // center horizontally
className="mt-8 mb-4" // top and bottom

// Gap (for flex/grid)
className="gap-4"    // all directions
className="gap-x-4 gap-y-2" // horizontal and vertical
```

### Typography

```typescript
// Headings
<h1 className="text-4xl font-extrabold text-indigo-700 tracking-tight">
  Main Title
</h1>

<h2 className="text-2xl font-bold text-gray-800 mb-4">
  Section Title
</h2>

<h3 className="text-xl font-semibold text-gray-700">
  Subsection
</h3>

// Body text
<p className="text-gray-600 leading-relaxed">
  Body text content
</p>

// Small text
<span className="text-sm text-gray-500">
  Helper text
</span>

// Code/Monospace
<code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
  code snippet
</code>
```

### Responsive Design

```typescript
// Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

// Hide on mobile, show on desktop
<div className="hidden md:block">
  Desktop only
</div>

// Show on mobile, hide on desktop
<div className="block md:hidden">
  Mobile only
</div>

// Responsive sizes
<div className="text-sm md:text-base lg:text-lg">
  Responsive text
</div>

// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Items */}
</div>
```

### Interactive States

```typescript
// Hover
<button className="bg-blue-500 hover:bg-blue-600 transition-colors">
  Hover me
</button>

// Focus
<input className="border focus:ring-2 focus:ring-blue-500 focus:outline-none" />

// Active
<button className="active:scale-95 transition-transform">
  Click me
</button>

// Disabled
<button className="disabled:opacity-50 disabled:cursor-not-allowed">
  Disabled
</button>
```

### Animations

```typescript
// Fade in
<div className="animate-fade-in">
  Content
</div>

// Spin (loading)
<div className="animate-spin">
  <Loader />
</div>

// Pulse
<div className="animate-pulse bg-gray-200 h-4 w-full rounded">
  {/* Skeleton loader */}
</div>

// Custom transition
<div className="transition-all duration-300 ease-in-out">
  Smooth transition
</div>
```

## Loading States

### Spinner

```typescript
import { Loader2 } from "lucide-react";

<div className="flex items-center justify-center py-8">
  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
  <span className="ml-2 text-gray-600">Loading...</span>
</div>
```

### Skeleton Loader

```typescript
<div className="space-y-3">
  {[1, 2, 3].map(i => (
    <div key={i} className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
    </div>
  ))}
</div>
```

### Progress Bar

```typescript
<div className="w-full bg-gray-200 rounded-full h-2">
  <div 
    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
    style={{ width: `${progress}%` }}
  />
</div>
```

## Notification Patterns

### Toast Notification

```typescript
const [notification, setNotification] = useState<{
  type: 'success' | 'error' | 'info';
  message: string;
} | null>(null);

useEffect(() => {
  if (notification) {
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }
}, [notification]);

{notification && (
  <div className="fixed top-4 right-4 z-50 animate-slide-in">
    <Alert variant={notification.type === 'error' ? 'destructive' : 'default'}>
      <AlertDescription>{notification.message}</AlertDescription>
    </Alert>
  </div>
)}
```

## Form Patterns

### Form Group

```typescript
<div className="space-y-6">
  <div className="space-y-2">
    <label htmlFor="profile" className="block text-sm font-medium text-gray-700">
      AWS Profile
    </label>
    <Select 
      id="profile"
      value={profile}
      onChange={(e) => setProfile(e.target.value)}
      className="w-full"
    >
      {profiles.map(p => (
        <option key={p} value={p}>{p}</option>
      ))}
    </Select>
  </div>
  
  <div className="space-y-2">
    <label htmlFor="region" className="block text-sm font-medium text-gray-700">
      AWS Region
    </label>
    <Select 
      id="region"
      value={region}
      onChange={(e) => setRegion(e.target.value)}
      className="w-full"
    >
      {regions.map(r => (
        <option key={r} value={r}>{r}</option>
      ))}
    </Select>
  </div>
  
  <Button type="submit" className="w-full">
    Submit
  </Button>
</div>
```

### Inline Form

```typescript
<form onSubmit={handleSubmit} className="flex gap-2 items-end">
  <div className="flex-1">
    <Input 
      placeholder="Search..." 
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>
  <Button type="submit">Search</Button>
</form>
```

## Icons (lucide-react)

```typescript
import { 
  Search, 
  Settings, 
  Trash2, 
  Edit, 
  Plus,
  Download,
  Upload,
  Check,
  X,
  AlertCircle,
  Loader2
} from "lucide-react";

// Icon usage
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add New
</Button>

<Settings className="h-5 w-5 text-gray-600" />

// Icon button
<button className="p-2 hover:bg-gray-100 rounded">
  <Trash2 className="h-4 w-4 text-red-600" />
</button>
```

## Accessibility

### Focus Management

```typescript
// Visible focus rings
<button className="focus:ring-2 focus:ring-blue-500 focus:outline-none">
  Accessible button
</button>

// Skip navigation links
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### ARIA Labels

```typescript
<button aria-label="Close dialog" onClick={onClose}>
  <X className="h-4 w-4" />
</button>

<input 
  type="search"
  placeholder="Search"
  aria-label="Search lambdas"
/>
```

## Best Practices

1. **Use semantic HTML**: `<button>`, `<nav>`, `<main>`, `<article>`
2. **Consistent spacing**: Use Tailwind's spacing scale (4, 6, 8, etc.)
3. **Responsive by default**: Design mobile-first, enhance for desktop
4. **Loading states**: Always show feedback during async operations
5. **Error states**: Provide clear error messages and recovery options
6. **Color contrast**: Ensure text is readable (WCAG AA minimum)
7. **Interactive feedback**: Hover, focus, active states for all interactive elements
8. **Component reusability**: Extract common patterns to components

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/)
- [Radix UI Primitives](https://www.radix-ui.com/)

---

**Key Takeaway**: Use shadcn/ui components for consistency, Tailwind for styling, and always consider accessibility and responsive design.
