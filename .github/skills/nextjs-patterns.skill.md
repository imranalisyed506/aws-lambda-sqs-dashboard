---
name: nextjs-patterns
description: "Next.js 15 App Router patterns, React 19 best practices, state management, and performance optimization for AWS Lambda Dashboard"
applyTo: "src/app/**/*.tsx,src/components/**"
---

# Next.js Patterns Skill

## Overview

Expert patterns for Next.js 15 App Router with React 19, covering routing, API routes, client components, state management, and performance optimization.

## App Router Structure

### Directory Structure

```
src/app/
├── page.tsx                    # Home: Lambda dashboard
├── layout.tsx                  # Root layout
├── globals.css                 # Global styles
├── config.ts                   # Centralized config
├── api/                        # API routes
│   ├── lambdas/route.ts
│   ├── aws-profiles/route.ts
│   ├── sqs-poll/route.ts
│   └── collector-summary/route.ts
├── zip-update/                 # Feature pages
│   └── page.tsx
├── collector-admin/
│   └── page.tsx
└── inactive-collectors/
    └── page.tsx
```

### Page Component Pattern

```typescript
"use client"; // Required for client interactivity

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PROFILE, DEFAULT_REGION } from "@/app/config";

export default function FeaturePage() {
  // State declarations
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DataType[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Effects
  useEffect(() => {
    // Fetch data on mount
  }, []);
  
  // Event handlers
  const handleAction = async () => {
    // Handle user actions
  };
  
  // Render
  return (
    <div className="min-h-screen p-8">
      {/* Component JSX */}
    </div>
  );
}
```

## API Routes

### Route Handler Pattern

```typescript
// src/app/api/feature/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCachedLambdaClient } from "@/lib/aws-client";

// GET handler
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const profile = searchParams.get("profile") || "default";
  const region = searchParams.get("region") || "us-east-1";
  
  try {
    const client = getCachedLambdaClient(profile, region);
    
    // AWS operations
    const data = await performOperation(client);
    
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("[FEATURE-API]", error);
    return NextResponse.json(
      { error: error.message || "Operation failed" },
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate body
    if (!body.requiredField) {
      return NextResponse.json(
        { error: "Missing required field" },
        { status: 400 }
      );
    }
    
    // Process request
    const result = await processData(body);
    
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("[FEATURE-API]", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Dynamic Route Parameters

```typescript
// src/app/api/lambda/[functionName]/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: { functionName: string } }
) {
  const { functionName } = params;
  const profile = req.nextUrl.searchParams.get("profile") || "default";
  
  // Use functionName and profile
}
```

## State Management Patterns

### Fetching Dynamic AWS Profiles

```typescript
const [profiles, setProfiles] = useState<string[]>([]);
const [profile, setProfile] = useState(DEFAULT_PROFILE);

useEffect(() => {
  async function fetchProfiles() {
    try {
      const res = await fetch("/api/aws-profiles");
      const data = await res.json();
      setProfiles(data);
      
      // Set first profile if DEFAULT_PROFILE not available
      if (data.length > 0 && !data.includes(DEFAULT_PROFILE)) {
        setProfile(data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch profiles", error);
      setProfiles(PROFILE_OPTIONS); // Fallback
    }
  }
  fetchProfiles();
}, []);
```

### Loading and Error States

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [retryCount, setRetryCount] = useState(0);

async function fetchDataWithRetry(attempt = 0) {
  setLoading(true);
  setError(null);
  setRetryCount(attempt);
  
  try {
    const res = await fetch(`/api/data?profile=${profile}&region=${region}`);
    
    // Handle rate limiting
    if (res.status === 429) {
      setError("Rate limit exceeded. Retrying...");
      if (attempt < 2) {
        setTimeout(() => fetchDataWithRetry(attempt + 1), 4000);
        return;
      }
    }
    
    if (!res.ok) throw new Error("Failed to fetch");
    
    const data = await res.json();
    setData(data);
    setError(null);
  } catch (err: any) {
    setError(err.message || "An error occurred");
  } finally {
    setLoading(false);
  }
}
```

### Conditional Data Fetching

```typescript
const [profile, setProfile] = useState(DEFAULT_PROFILE);
const [region, setRegion] = useState(DEFAULT_REGION);
const [data, setData] = useState([]);

useEffect(() => {
  // Only fetch if profile is set
  if (!profile) return;
  
  let cancelled = false;
  
  async function fetchData() {
    const res = await fetch(`/api/data?profile=${profile}&region=${region}`);
    const json = await res.json();
    
    // Prevent state update if component unmounted
    if (!cancelled) {
      setData(json);
    }
  }
  
  fetchData();
  
  // Cleanup function
  return () => {
    cancelled = true;
  };
}, [profile, region]);
```

## Form Handling

### Controlled Form Pattern

```typescript
const [formData, setFormData] = useState({
  profile: DEFAULT_PROFILE,
  region: DEFAULT_REGION,
  collectorType: "o365",
});
const [submitting, setSubmitting] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  
  try {
    const res = await fetch("/api/endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    
    if (!res.ok) throw new Error("Submission failed");
    
    const result = await res.json();
    setNotification({ type: "success", message: "Saved successfully!" });
  } catch (error) {
    setNotification({ type: "error", message: "Failed to save" });
  } finally {
    setSubmitting(false);
  }
};

return (
  <form onSubmit={handleSubmit}>
    <Input
      value={formData.collectorType}
      onChange={(e) => setFormData({ ...formData, collectorType: e.target.value })}
    />
    <Button type="submit" disabled={submitting}>
      {submitting ? "Saving..." : "Save"}
    </Button>
  </form>
);
```

## List Rendering & Filtering

### Filtered List Pattern

```typescript
const [data, setData] = useState<Item[]>([]);
const [filter, setFilter] = useState("");
const [selectedType, setSelectedType] = useState("");

// Memoize filtered results
const filteredData = useMemo(() => {
  return data.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase());
    const matchesType = !selectedType || item.type === selectedType;
    return matchesSearch && matchesType;
  });
}, [data, filter, selectedType]);

return (
  <>
    <Input 
      placeholder="Search..." 
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
    />
    <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
      <option value="">All Types</option>
      <option value="o365">O365</option>
      <option value="gsuite">GSuite</option>
    </Select>
    
    {filteredData.map(item => (
      <div key={item.id}>{item.name}</div>
    ))}
  </>
);
```

### Pagination Pattern

```typescript
const [currentPage, setCurrentPage] = useState(1);
const [pageSize] = useState(PAGE_SIZE); // From config

const paginatedData = useMemo(() => {
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  return filteredData.slice(start, end);
}, [filteredData, currentPage, pageSize]);

const totalPages = Math.ceil(filteredData.length / pageSize);

return (
  <>
    {paginatedData.map(item => <ItemRow key={item.id} item={item} />)}
    
    <div className="flex gap-2 justify-center mt-4">
      <Button 
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage === 1}
      >
        Previous
      </Button>
      <span>Page {currentPage} of {totalPages}</span>
      <Button 
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    </div>
  </>
);
```

## Modal/Dialog Patterns

### Flyout Pattern

```typescript
const [flyoutOpen, setFlyoutOpen] = useState(false);
const [flyoutData, setFlyoutData] = useState<DataType | null>(null);

const openFlyout = (item: DataType) => {
  setFlyoutData(item);
  setFlyoutOpen(true);
};

const closeFlyout = () => {
  setFlyoutOpen(false);
  setFlyoutData(null);
};

return (
  <>
    <Button onClick={() => openFlyout(item)}>View Details</Button>
    
    <Dialog open={flyoutOpen} onOpenChange={setFlyoutOpen}>
      <DialogContent>
        <DialogTitle>{flyoutData?.name}</DialogTitle>
        {flyoutData && (
          <div>
            {/* Flyout content */}
          </div>
        )}
      </DialogContent>
    </Dialog>
  </>
);
```

### Confirmation Dialog Pattern

```typescript
const [showConfirm, setShowConfirm] = useState(false);
const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

const confirmDelete = (item: Item) => {
  setItemToDelete(item);
  setShowConfirm(true);
};

const handleDelete = async () => {
  if (!itemToDelete) return;
  
  try {
    await fetch(`/api/delete/${itemToDelete.id}`, { method: "DELETE" });
    setData(data.filter(d => d.id !== itemToDelete.id));
    setNotification({ type: "success", message: "Deleted successfully" });
  } catch (error) {
    setNotification({ type: "error", message: "Failed to delete" });
  } finally {
    setShowConfirm(false);
    setItemToDelete(null);
  }
};

return (
  <>
    <Button onClick={() => confirmDelete(item)}>Delete</Button>
    
    <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
      <DialogContent>
        <DialogTitle>Confirm Delete</DialogTitle>
        <p>Are you sure you want to delete {itemToDelete?.name}?</p>
        <div className="flex gap-2">
          <Button onClick={handleDelete}>Delete</Button>
          <Button onClick={() => setShowConfirm(false)} variant="outline">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
);
```

## Performance Optimization

### useMemo for Expensive Calculations

```typescript
// Heavy computation - memoize it
const sortedAndFilteredData = useMemo(() => {
  return data
    .filter(item => item.name.includes(filter))
    .sort((a, b) => a.name.localeCompare(b.name));
}, [data, filter]);
```

### useCallback for Event Handlers

```typescript
// Prevents child re-renders
const handleItemClick = useCallback((id: string) => {
  setSelectedId(id);
}, []);

// Pass to child component
<ChildComponent onItemClick={handleItemClick} />
```

### Debounced Search

```typescript
import { useState, useEffect } from "react";

const [searchTerm, setSearchTerm] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchTerm);
  }, 300);
  
  return () => clearTimeout(timer);
}, [searchTerm]);

// Use debouncedSearch for API calls
useEffect(() => {
  if (debouncedSearch) {
    fetchResults(debouncedSearch);
  }
}, [debouncedSearch]);
```

## TypeScript Patterns

### Component Props Interface

```typescript
interface ComponentProps {
  data: DataType[];
  onSelect: (id: string) => void;
  loading?: boolean;
  className?: string;
}

export function Component({ data, onSelect, loading = false, className }: ComponentProps) {
  // Component logic
}
```

### API Response Types

```typescript
interface LambdaResponse {
  lambdas: LambdaFunction[];
  count: number;
  error?: string;
}

async function fetchLambdas(): Promise<LambdaResponse> {
  const res = await fetch("/api/lambdas");
  return res.json();
}
```

## Layout Patterns

### Responsive Grid

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id}>{item.name}</Card>
  ))}
</div>
```

### Flex Layout with Responsive Spacing

```typescript
<div className="flex flex-col md:flex-row gap-4 items-center">
  <div className="flex-1">Content</div>
  <div className="flex-1">Content</div>
</div>
```

## Navigation

### Navigation Component

```typescript
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MainNav() {
  const pathname = usePathname();
  
  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/zip-update", label: "Zip Update" },
    { href: "/collector-admin", label: "Collector Admin" },
  ];
  
  return (
    <nav className="flex gap-4">
      {links.map(link => (
        <Link 
          key={link.href}
          href={link.href}
          className={pathname === link.href ? "font-bold" : ""}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
```

## Error Boundaries

### Client Error Boundary

```typescript
"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Best Practices

### 1. Client Components
- Use `"use client"` directive for interactive components
- Keep client boundaries minimal
- Extract static content to server components when possible

### 2. Data Fetching
- Fetch in API routes, not directly in components
- Use query parameters for profile/region selection
- Implement proper error handling and loading states

### 3. State Management
- Use `useState` for local state
- Use `useEffect` for side effects and data fetching
- Use `useMemo` and `useCallback` for performance

### 4. TypeScript
- Define interfaces for all data structures
- Avoid `any` - use proper types
- Export shared types from separate files

### 5. Styling
- Use Tailwind CSS utility classes
- Follow existing design system
- Use responsive classes (`sm:`, `md:`, `lg:`)

## Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev/)
- [App Router Guide](https://nextjs.org/docs/app)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Key Takeaway**: Follow established patterns, prioritize type safety, optimize performance, and maintain consistent code structure.
