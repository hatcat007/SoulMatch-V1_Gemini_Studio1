# SoulMatch: Technical Documentation & Feature Overview

## 1. Introduction

**SoulMatch** is an innovative, non-profit application designed to combat the growing issue of loneliness in Denmark. Its core mission is to facilitate meaningful, safe, and real-world connections between individuals. The app achieves this by combining advanced AI-powered matching, a curated list of social events and partner venues, and a strong emphasis on encouraging physical meetups over endless digital conversations.

The platform serves both individual users seeking connection and organizations (NGOs, community centers, businesses) that want to host social events and contribute to the cause.

## 2. Core Features

### 2.1. Onboarding & Authentication

*   **Multi-step Onboarding:** A visually engaging, multi-step onboarding process introduces new users to the app's core value propositions: AI matching, personality analysis, and a strong focus on safety.
*   **User Authentication:** Standard email/password login and signup flows are available.
*   **Organization Onboarding:** A streamlined process for organizations to create profiles. It features an AI-powered data import functionality that can scrape information from a Facebook page to pre-fill the profile, simplifying the setup process.
*   **Safety First:** The concept heavily emphasizes user safety, mentioning mandatory **MitID verification** and facial recognition to ensure genuine identities and create a secure environment.

### 2.2. Main Navigation

The app uses a persistent bottom navigation bar (which becomes a sidebar on larger screens) for easy access to its main sections:

*   **Home:** The main feed for discovering social events.
*   **Places:** A directory of partner venues offering deals to encourage meetups.
*   **Create:** A dedicated flow for users or organizations to create new social events.
*   **Chat:** A list of active conversations and online users.
*   **Profile:** The user's personal profile page.

### 2.3. Event System

*   **Event Discovery (`HomePage`):** Users can browse a dynamic list of upcoming social events. Events are presented as visually distinct cards, showing the title, time, participant count, host, and an identifying icon/color.
*   **Event Details (`EventDetailPage`):** Tapping an event reveals a detailed view with a full description, a list of participants, and information about the host organization.
*   **Join & Share:** Users can join events with a single tap. They can also share the event with their "Soulmates" (connections) directly within the app.
*   **Filtering (`EventFilterPage`):** A dedicated filter page allows users to discover events by category (e.g., Mad, Musik, Brætspil), making it easy to find activities that match their interests.
*   **Event Creation (`CreateEventPage`):** A comprehensive form allows users to create their own events. They can specify an emoji, name, description, date/time, location, add descriptive tags, and upload up to three images. A "Diagnose venligt" toggle is included to promote inclusivity.

### 2.4. Places & Partnerships

*   **Place Discovery (`PlacesPage`):** This section showcases partner venues (cafes, bars, restaurants) that support the fight against loneliness by offering special deals (e.g., "2 x gratis kaffe").
*   **Place Details:** A modal provides detailed information about a place, including its offer, description, contact information, and opening hours.
*   **NFC Check-in (`CheckinPage`):** A key feature to promote real-world interaction. When two users meet at a partner venue, they can "check-in" by tapping their phones together. The app simulates this with a sophisticated **NFC animation**, which, upon completion, confirms the meetup and unlocks the venue's offer. This action is also crucial for extending the chat timer.
*   **Filtering (`PlacesFilterPage`):** Similar to events, users can filter places by category (e.g., Café, Bar, Gratis).

### 2.5. Chat & Connections

*   **Chat List (`ChatListPage`):** Displays all message threads, highlighting online users and unread message counts.
*   **Real-time Chat (`ChatPage`):** A standard chat interface for one-on-one conversations.
*   **The 3-Day Rule:** A unique gamification mechanic. A chat connection automatically expires after **3 days** unless the users meet in person and confirm it via the NFC check-in feature. A countdown timer is visibly displayed in the chat header, creating a sense of urgency to meet.
*   **Safety Features:** User profiles in chat are marked with a shield icon, indicating they are verified, enhancing trust.

### 2.6. User & Organization Profiles

*   **User Profile (`ProfilePage`):** Displays the user's photo, name, bio, interests (represented by emojis), and photos. It also features a "Personlighed" section with sliders representing traits (e.g., Abstrakt vs. Konkret, Emotionel vs. Rationel) and a personality type (e.g., INFJ).
*   **Organization Profile (`OrganizationProfilePage`):** A detailed page for partner organizations, showcasing their logo, description, contact information, and a list of social "opportunities" they offer.

### 2.7. Notifications System

*   **Real-time Toasts:** The app provides instant, non-intrusive toast notifications for new events, messages, friend requests, and profile views.
*   **Notification Center (`NotificationsPage`):** A dedicated page that lists all historical notifications, grouped by date (I dag, I går, etc.). Unread notifications are automatically marked as read upon visiting this page.
*   **Unread Count Badge:** The navigation and header icons display a badge with the count of unread notifications, ensuring users don't miss important updates.

## 3. Technical Information

### 3.1. Frontend Stack

*   **Framework:** React 19
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (with a custom theme for colors, fonts, and dark mode).
*   **Routing:** `react-router-dom` (using `HashRouter`).
*   **Icons:** `lucide-react`.
*   **Animation:** `framer-motion` (used for the NFC check-in animation).
*   **State Management:** React Context API (`ThemeContext`, `NotificationContext`).

### 3.2. Backend & Services

*   **Database & Auth (Conceptual):** `@supabase/supabase-js` is configured, suggesting Supabase is the intended backend-as-a-service for handling users, data storage, and authentication.
*   **Artificial Intelligence:** `@google/genai` (Gemini API) is integrated for specific AI tasks:
    *   **Matchmaking (`getAiMatches`):** A conceptual function demonstrates how Gemini could analyze user profiles to generate a ranked list of compatible matches.
    *   **Organization Data Scraping (Conceptual):** The organization creation flow is designed around the idea of using an AI model to parse a Facebook page URL and automatically extract relevant information like name, description, and contact details.

### 3.3. Project Structure & Setup

The application is structured as a single-page application (SPA) with a simple setup:

*   `index.html`: The main entry point. It uses an **import map** to load ES modules directly from a CDN, eliminating the need for a local `node_modules` folder or a complex build step.
*   `index.tsx`: The React application's root, which mounts the main `App` component.
*   `App.tsx`: Handles top-level routing and distinguishes between authenticated and unauthenticated user views.
*   `/pages`: Contains all the main screen components.
*   `/components`: Contains reusable UI components (`BottomNav`, `ShareModal`, etc.).
*   `/services`: Contains logic for interacting with external APIs like Supabase and Gemini.
*   `/contexts`: Holds React Context providers for global state (Theme, Notifications).
*   `/hooks`: Custom React hooks (`useNotifications`).
*   `types.ts`: Centralized TypeScript type definitions.
*   `metadata.json`: Application metadata.

### 3.4. Key Design Principles

*   **Mobile-First & Responsive:** The UI is designed for mobile devices but adapts cleanly to larger screens.
*   **Dark Mode:** A fully implemented dark mode is available and can be toggled in the settings, with theme persistence via `localStorage`.
*   **Accessibility:** Semantic HTML and ARIA attributes (e.g., `aria-label`) are used to improve accessibility.
*   **User Experience (UX):** The app focuses on a clean, intuitive, and visually appealing interface to create a positive user experience, with smooth transitions and animations.
