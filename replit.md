# АТТЕСТАТ БЕЗ РЕМНЯ - Telegram Mini App для образования

## Overview

АТТЕСТАТ БЕЗ РЕМНЯ is a comprehensive educational platform designed as a Telegram Mini App for learning and teaching. The platform features full Telegram integration including WebApp authentication, message synchronization, and specialized interfaces for students, teachers, and administrators. It provides interactive games, video lessons, real-time chat functionality that syncs with Telegram, achievements system, and progress tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for development tooling
- **UI Framework**: Shadcn/ui components built on Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom design system and CSS variables for theming
- **State Management**: Zustand for client-side state management with persistence
- **Server State**: TanStack Query for server state management, caching, and synchronization
- **Routing**: Wouter for lightweight client-side routing
- **Animations**: Framer Motion for smooth UI transitions and interactive animations

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Real-time Communication**: WebSocket implementation for chat and live features
- **Data Storage**: In-memory storage with interfaces designed for PostgreSQL migration
- **Authentication**: Telegram WebApp authentication with automatic user creation and session management
- **Telegram Integration**: Message synchronization, webhook support, and native Telegram bot API integration

### Database Schema Design
- **ORM**: Drizzle ORM with type-safe queries and migrations
- **Database**: PostgreSQL (configured but using in-memory storage for development)
- **Schema Structure**: 
  - Users table with role-based permissions (student, tutor, admin) and Telegram integration fields
  - Lessons table with content, difficulty levels, and author relationships
  - Progress tracking with completion status and scoring
  - Games system with scoring and leaderboards
  - Chat system with real-time messaging
  - Achievements and gamification elements
  - Quiz creation and attempt tracking
  - Telegram messages table for chat synchronization
  - Admin logs table for administrative action tracking
  - System settings table for configuration management
  - Tutor-student assignments table for relationship management

### Role-Based System
- **Student Role**: Access to lessons, games, chat with tutors, progress tracking, achievements, view tutor-created materials
- **Tutor Role**: Lesson creation, student management, quiz builder, theory materials management, Эрудит game access, analytics dashboard
- **Administrator Role**: User management, system settings, password-protected access

### Real-time Features
- **WebSocket Integration**: Real-time chat functionality between students and tutors
- **Live Updates**: Instant message delivery and online status tracking
- **Game Sessions**: Real-time scoring and leaderboard updates

### Gamification System
- **Experience Points**: XP system with levels and progression
- **Achievements**: Badge system with different rarity levels and categories
- **Streak Tracking**: Daily activity streaks with visual indicators
- **Leaderboards**: Competitive elements with filtering and time-based rankings
- **Interactive Games**: Word memory, grammar builders, pronunciation practice

### Telegram Integration
- **Web App SDK**: Native Telegram interface integration
- **Haptic Feedback**: Platform-specific tactile responses
- **Theme Adaptation**: Automatic light/dark theme support
- **Native UI Elements**: MainButton and navigation integration

### Development Architecture
- **Monorepo Structure**: Shared types and schemas between client and server
- **Type Safety**: End-to-end TypeScript with shared interfaces
- **Hot Reload**: Vite HMR with Express middleware integration
- **Build Process**: Separate client (Vite) and server (esbuild) pipelines
- **Path Aliases**: Organized imports with @ and @shared prefixes

## Recent Changes

### Standalone Web Application (August 2025)
- **Telegram Independence**: Removed mandatory Telegram authentication requirements
- **Direct Web Access**: Users can now access the application directly without Telegram
- **Role-Based Login**: Simple interface to choose between Student, Tutor, and Administrator roles
- **Demo Mode**: Automatic generation of unique demo users for testing and development

### Complete Bot Implementation (August 2025)
- **Full Function Implementation**: Replaced all placeholder/stub functions with complete implementations
- **Role-Based Features**: All student, tutor, and admin functions now fully operational
- **Analytics & Management**: Comprehensive analytics for tutors and user management for admins
- **Real Data Integration**: All functions now use actual data from storage instead of placeholders
- **TypeScript Fixes**: Resolved all type errors and improved code quality
- **Enhanced User Experience**: Rich interactive menus with detailed statistics and information

### Bot Rebranding (August 2025)
- **Project Rename**: Successfully changed bot title from "RUSSIAN MENTOR BOT" to "АТТЕСТАТ БЕЗ РЕМНЯ"
- **Complete Rebranding**: Updated all interfaces, documentation, and ASCII art displays
- **Bot Functionality**: All features remain fully functional under new brand identity

### Telegram Bot Implementation (August 2025)
- **Full Telegram Bot**: Complete Telegram bot implementation with all platform functionality
- **Role Selection System**: New users can choose their role (student/tutor/admin) on first launch
- **Role Switching**: Users can change roles anytime through settings or /reset command
- **Data Integration**: Seamless integration with existing database and user system
- **Interactive Menus**: Rich inline keyboard navigation with callback handlers
- **User Management**: Automatic user creation and authentication via Telegram ID
- **Multi-Role Support**: Students can access lessons/games/progress, tutors can manage content, admins get system stats
- **Account Reset**: /reset command allows users to restart and select new role
- **Bot Commands Menu**: Automatic setup of Telegram commands menu with bot functionality
- **Smart Fallbacks**: Complex operations redirect to web app for better UX

### Enhanced Tutor Interface (January 2025)
- **Theory Materials System**: Complete file upload support for multiple formats (documents, images, audio, video)
- **Эрудит Word Game**: Fully implemented Russian word game specifically for tutors with complete game board, tile placement, and scoring system
- **Enhanced TutorDashboard**: Added "Theory Materials" and "Games" tabs with quick action buttons for easy access
- **Student Material View**: Students can now view all tutor-created content in organized blocks via TutorMaterialsView component
- **Integrated Game Access**: Tutors can access Эрудит game directly from dashboard with modal interface
- **Comprehensive Content Management**: Theory materials support categorization, difficulty levels, and file management

### Key Components Added
- `bot/index.ts`: Complete Telegram bot with role-based menus and handlers
- `bot/README.md`: Comprehensive bot documentation and setup instructions
- Telegram Bot Features:
  - Role selection on first launch and role switching capability
  - Role-based command menus (student/tutor/admin) 
  - User authentication via Telegram ID
  - Account reset functionality with /reset command
  - Progress tracking and achievements display
  - System statistics for administrators
  - Seamless database integration
  - Help system with /help command
- `TheoryMaterialsManager`: Complete CRUD interface for theory materials
- `EruditGame`: Full implementation of Russian word game with game rules
- `TutorMaterialsView`: Student interface for viewing tutor content
- Enhanced TutorDashboard with new tabs and quick actions
- Student Dashboard integration with tutor materials section

### Database Schema Updates
- Theory materials table with file support and metadata
- Game sessions and scoring system
- Enhanced user progress tracking for materials

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database driver for serverless environments
- **drizzle-orm**: Type-safe ORM with schema management and migrations
- **drizzle-zod**: Schema validation integration

### UI and Styling
- **@radix-ui/react-***: Comprehensive UI component primitives for accessibility
- **tailwindcss**: Utility-first CSS framework with custom configuration
- **framer-motion**: Animation library for smooth UI interactions
- **lucide-react**: Icon library for consistent visual elements

### State Management
- **@tanstack/react-query**: Server state management with caching and synchronization
- **zustand**: Lightweight client-side state management with persistence

### Real-time Communication
- **ws**: WebSocket library for real-time chat functionality
- **connect-pg-simple**: Session storage for PostgreSQL integration

### Development Tools
- **vite**: Build tool and development server with HMR
- **tsx**: TypeScript execution engine for development
- **esbuild**: Fast JavaScript bundler for production builds

### Telegram Integration
- **Telegram Web App SDK**: Native Telegram Mini App functionality through window.Telegram object

### Form Management
- **react-hook-form**: Form state management with validation
- **@hookform/resolvers**: Validation resolvers for form integration

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **clsx**: Conditional className utility
- **class-variance-authority**: Component variant management