This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


✅ New Components Created:
page.tsx - Main dashboard page with:

Authentication interface
Inactive collectors table with grouping by customer
Search and filtering capabilities
Individual and bulk delete functionality
Export to JSON feature
Real-time status updates
API Routes:

route.ts - Authentication with Alert Logic API
route.ts - Fetch inactive users and their collectors
route.ts - Delete individual collectors
Configuration:

.env.example - Environment variables template
INACTIVE_COLLECTORS.md - Feature documentation
Updated navigation in layout.tsx
 Key Features Implemented:
Authentication System:

Secure login with Alert Logic credentials
Token-based authentication for API calls
Password clearing for security
Data Management:

Fetches inactive users from Alert Logic API
Scans AWS Lambda functions for collector types
Maps collectors to customer IDs
Filters out only inactive user collectors
User Interface:

Clean, responsive design with Tailwind CSS
Customer-grouped table view
Search and filter capabilities
Real-time loading states
Success/error notifications
Bulk Operations:

Individual collector deletion
Bulk delete all collectors for a customer
Confirmation dialogs for all delete operations
Progress tracking during operations
Data Export:

Export filtered data to JSON
Includes metadata and timestamps
Downloadable file with date stamp
✅ Technical Improvements:
Type Safety:

TypeScript interfaces for all data structures
Proper error handling and validation
Null/undefined safety checks
Performance:

Cached AWS clients (from existing optimization)
Efficient state management
Optimized API calls
User Experience:

Loading states and progress indicators
Clear error messages and success feedback
Responsive design for all screen sizes
Tooltips and help text
 Environment Setup:
To use this feature:

Copy .env.example to .env.local
Set US_URL_PROD=https://api.us.alertlogic.com
Navigate to /inactive-collectors
Authenticate with Alert Logic credentials
Select AWS profile/region and fetch collectors
Manage collectors using the interface
The implementation maintains all the core functionality of the original Python script while providing a modern, user-friendly web interface with enhanced features like bulk operations, real-time updates, and data export capabilities.