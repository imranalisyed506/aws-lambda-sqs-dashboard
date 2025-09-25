
# Project Requirement Guide

This document outlines the requirements, user stories, and feature functionality for the AWS Lambda SQS Dashboard project.

## Feature Overview Table

| Story # | Feature                        | Description                                                                                 |
|---------|--------------------------------|---------------------------------------------------------------------------------------------|
| 1       | Lambda Dashboard Home          | View all AWS Lambda functions in a sortable, filterable, paginated table.                   |
| 2       | Lambda Zip Update Workflow     | Upload and update Lambda function code using zip files, with status and history.            |
| 3       | Profile & Region Filters       | Select AWS profile and region globally to filter all Lambda data.                           |
| 4       | Table Column Customization     | Show/hide columns in the Lambda table and save preferences.                                 |
| 5       | Lambda Details & Env Variables | View/edit Lambda environment variables in a flyout.                                         |
| 6       | CloudWatch Logs Viewer         | View recent CloudWatch logs for a Lambda in a flyout.                                       |
| 7       | Notifications & Alerts         | See success/error notifications for all actions.                                            |
| 8       | Loader & UX Enhancements       | Loader centered in table/flyouts, modern responsive UI.                                     |
| 9       | Navigation & Routing           | Navigate between dashboard and zip update pages with a navigation bar.                      |

---

## More Info

Each feature is described in detail below, including user story, functionality, and acceptance criteria.

## Table of Contents
- [1. Lambda Dashboard Home](#1-lambda-dashboard-home)
- [2. Lambda Zip Update Workflow](#2-lambda-zip-update-workflow)
- [3. Profile & Region Filters](#3-profile--region-filters)
- [4. Table Column Customization](#4-table-column-customization)
- [5. Lambda Details & Environment Variables](#5-lambda-details--environment-variables)
- [6. CloudWatch Logs Viewer](#6-cloudwatch-logs-viewer)
- [7. Notifications & Alerts](#7-notifications--alerts)
- [8. Loader & UX Enhancements](#8-loader--ux-enhancements)
- [9. Navigation & Routing](#9-navigation--routing)

----

## 1. Lambda Dashboard Home
**Story #1**
- **Description:** As a user, I want to view all AWS Lambda functions in a table with key details, so I can monitor and manage them easily.
- **Functionality:**
  - Table lists Lambda functions with columns: Name, Description, Last Modified, Runtime, etc.
  - Table supports sorting, filtering, and pagination.
  - Function name is a clickable link to open details.

## 2. Lambda Zip Update Workflow
**Story #2**
- **Description:** As a user, I want to upload and update Lambda function code using zip files, so I can deploy new versions easily.
- **Functionality:**
  - Upload zip files and select target Lambda(s).
  - Trigger update and view status/logs.
  - See available zip files and update history.

## 3. Profile & Region Filters
**Story #3**
- **Description:** As a user, I want to select AWS profile and region globally, so I can manage resources across accounts and regions.
- **Functionality:**
  - Profile and region dropdowns filter all Lambda data.
  - Persist selection across navigation.

## 4. Table Column Customization
**Story #4**
- **Description:** As a user, I want to customize visible columns in the Lambda table, so I can focus on relevant data.
- **Functionality:**
  - Settings (wheel) icon opens column selection dialog.
  - Show/hide columns and save preferences (localStorage).

## 5. Lambda Details & Environment Variables
**Story #5**
- **Description:** As a user, I want to view and edit Lambda environment variables, so I can manage configuration securely.
- **Functionality:**
  - Click function name to open details flyout.
  - View, edit, add, and remove environment variables.
  - Save changes and see confirmation.

## 6. CloudWatch Logs Viewer
**Story #6**
- **Description:** As a user, I want to view recent CloudWatch logs for a Lambda, so I can debug and monitor executions.
- **Functionality:**
  - View last 1 hour logs in a flyout.
  - Loader and error handling for logs.

## 7. Notifications & Alerts
**Story #7**
- **Description:** As a user, I want to see success and error notifications, so I know the result of my actions.
- **Functionality:**
  - Alerts for API errors, updates, and saves.
  - Success and error variants.

## 8. Loader & UX Enhancements
**Story #8**
- **Description:** As a user, I want to see loading indicators and have a modern, responsive UI.
- **Functionality:**
  - Loader centered in table and flyouts.
  - Responsive, modern design with Tailwind and shadcn/ui.

## 9. Navigation & Routing
**Story #9**
- **Description:** As a user, I want to navigate between dashboard and zip update pages easily.
- **Functionality:**
  - Navigation bar with links.
  - Routing with Next.js app directory.

---

For technical details, see the codebase and README.
