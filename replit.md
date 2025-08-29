# Overview

BurnBoard is a client retainer burn rate tracking application built for agencies. It provides a dashboard to monitor client spend against monthly retainer amounts with sophisticated financial health indicators. The application tracks time entries, calculates burn percentages, and displays comprehensive metrics to help account managers monitor client budget utilization in real-time.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Full-Stack TypeScript Architecture
The application follows a monorepo structure with client and server code sharing types and schemas. Built with modern TypeScript throughout, using ES modules and strict type checking for reliability.

## Frontend Architecture
- **React 18** with Vite for fast development and building
- **Wouter** for lightweight client-side routing instead of React Router
- **TanStack Query** for server state management and caching
- **shadcn/ui** component library with Radix UI primitives
- **Tailwind CSS** for styling with custom CSS variables for theming
- **Recharts** for data visualization (line charts, pie charts, sparklines)

## Backend Architecture
- **Express.js** server with TypeScript
- **Drizzle ORM** with PostgreSQL for type-safe database operations
- **Zod** for runtime type validation on API endpoints
- RESTful API design with consistent error handling
- Middleware for request logging and JSON response capture

## Database Design
- **PostgreSQL** with Drizzle schema definitions
- Core entities: clients, departments, team members, time entries, burn snapshots, monthly summaries
- Enum types for client status and health indicators
- Proper foreign key relationships and indexing strategy
- Monetary values stored as cents for precision

## Data Flow and Business Logic
- Centralized metrics calculations in `lib/metrics.ts`
- Pure functions for burn rate calculations, variance analysis, and health status determination
- Real-time dashboard updates with derived metrics (burn percentage, variance, health status)
- Historical tracking with monthly summaries and daily burn snapshots

## Component Architecture
- Modular component structure with clear separation of concerns
- Reusable UI components from shadcn/ui
- Chart components wrapping Recharts with consistent theming
- Layout components for header navigation and responsive design

## State Management
- Server state managed by TanStack Query with optimistic updates
- Local UI state using React hooks
- Theme state persisted to localStorage
- No global state management library needed due to server-centric architecture

## Development Workflow
- Vite development server with HMR
- TypeScript compilation with strict mode
- Path aliases for clean imports (@/ for client, @shared for shared code)
- Build process creates both client bundle and server bundle

# External Dependencies

## Database and ORM
- **@neondatabase/serverless** - Neon PostgreSQL serverless database connection
- **drizzle-orm** and **drizzle-kit** - Type-safe ORM with migration support
- **connect-pg-simple** - PostgreSQL session store for Express

## UI Framework and Components
- **@radix-ui/** packages - Accessible UI primitives (dialog, dropdown, select, etc.)
- **@tanstack/react-query** - Server state management and caching
- **recharts** - Charting library for data visualization
- **tailwindcss** - Utility-first CSS framework
- **class-variance-authority** and **clsx** - Conditional styling utilities

## Development and Build Tools
- **vite** - Frontend build tool and dev server
- **@vitejs/plugin-react** - React support for Vite
- **tsx** - TypeScript execution engine for development
- **esbuild** - Fast JavaScript bundler for server builds

## Validation and Type Safety
- **zod** - Runtime type validation
- **zod-validation-error** - Better error formatting for Zod
- **drizzle-zod** - Integration between Drizzle and Zod

## Routing and Navigation
- **wouter** - Lightweight React router alternative
- Client-side routing with programmatic navigation

## Formatting and Utilities
- **date-fns** - Date manipulation utilities
- **nanoid** - Unique ID generation
- **ws** - WebSocket client for database connections

## Replit Integration
- **@replit/vite-plugin-runtime-error-modal** - Development error overlay
- **@replit/vite-plugin-cartographer** - Development tools integration