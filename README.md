# Tradebox

# Frontend Documentation

## Overview
This is the documentation for the frontend of the project, built with [Next.js](https://nextjs.org/), a React framework for server-rendered applications. This frontend utilizes a range of librari for UI component, data handling, state management, and styling.

---

## Table of Contents
1. [Scripts](#scripts)
2. [Dependencies](#dependencies)
    - [UI Libraries](#ui-libraries)
    - [State Management](#state-management)
    - [Data Fetching](#data-fetching)
    - [Utilities](#utilities)
    - [Styling](#styling)
    - [Other Libraries](#other-libraries)
3. [Dev Dependencies](#dev-dependencies)
    - [TypeScript and Typings](#typescript-and-typings)
    - [Linting and Formatting](#linting-and-formatting)
    - [CSS Preprocessing](#css-preprocessing)

---

### Scripts

- **`dev`**: Runs the development server with live reloading.
- **`build`**: Compiles the application for production.
- **`start`**: Starts the production server.
- **`lint`**: Runs ESLint to check for code quality and formatting issues.

---

### Dependencies

#### UI Libraries

- **@radix-ui/react-\***: Radix UI components for accessible and customizable UI elements:
  - Accordion, Dialog, Avatar, Checkbox, Popover, etc.
- **@cyntler/react-doc-viewer**: Viewer for displaying documents in various formats.
- **cmdk**: Command menu component for quick navigation.
- **embla-carousel-react** & **embla-carousel-autoplay**: Carousel components with autoplay functionality.
- **framer-motion**: Animations and transitions for UI elements.
- **lucide-react**: Icon library with a React wrapper.

#### State Management

- **@reduxjs/toolkit**: Toolkit for managing state using Redux.
- **react-redux**: React bindings for Redux, integrating it with React.

#### Data Fetching

- **swr**: React Hooks for data fetching and caching, especially useful for handling server-side data.

#### Utilities

- **calendar-link**: Generates calendar event links for sharing.
- **country-state-city**: Utility to fetch country, state, and city information.
- **clsx**: Utility for conditionally combining class names.
- **get-video-id**: Extracts video IDs from various video URLs.
- **millify**: Converts numbers into human-readable formats.
- **react-day-picker**: A component for date selection.
- **react-icons**: Library of SVG icons as React components.
- **react-select**: Select component with support for search and multi-selection.
- **react-virtualized-auto-sizer** & **react-window**: For handling lists and tables with virtualization.
- **socket.io-client**: Provides real-time bidirectional communication for handling sockets.
- **xlsx**: Reads, writes, and processes Excel files.

#### Styling

- **tailwind-merge**: Utility for merging Tailwind CSS classes.
- **tailwind-scrollbar** & **tailwindcss-animate**: Plugins for handling scrollbars and animations in Tailwind CSS.
- **next-themes**: For managing themes in Next.js applications.

#### Other Libraries

- **@vercel/speed-insights**: Provides insights into the performance of the Next.js application.

---

### Dev Dependencies

#### TypeScript and Typings

- **typescript**: Adds support for TypeScript.
- **@types/node**: Type definitions for Node.js.
- **@types/react**, **@types/react-dom**, **@types/react-window**, **@types/uniqid**: Type definitions for React and related libraries.

#### Linting and Formatting

- **eslint** & **eslint-config-next**: Linter for JavaScript/TypeScript code quality, with Next.js configuration.

#### CSS Preprocessing

- **postcss**: CSS processing tool, typically used with Tailwind.
- **autoprefixer**: Adds vendor prefixes to CSS rules.

---

# Routing Structure Documentation

This document provides an overview of the routing structure of the application. The project uses a folder-based routing system where each folder and file represents a route in the application. The routing is organized within the `src/app` directory, which contains various directories and files for specific sections and functionality.

---

## Route Overview

- **(footer)**: _(Purpose not specified in the image)_ – This folder may contain footer components or routes related to footer content, which could be shared across multiple pages.

- **api**: Contains backend API routes or endpoints to handle server-side logic, data fetching, or data submission for the application. This structure may align with Next.js API routes, providing serverless functions.

- **auth**: Contains routes and components related to user authentication, such as login, signup, and password recovery. It handles all authentication-related tasks and pages.

- **dashboard**: Likely contains routes for the user dashboard where users can view and manage their profile, settings, and other personalized content.

- **market-watch**: Contains routes related to monitoring financial markets. This could include real-time market data, charts, and analytics features for users to keep track of specific markets.

- **service-providers**: Contains routes for listing and managing service providers within the application. It could be a section where users can view available service providers or connect with them.

- **view**: A general-purpose folder that could hold additional pages or sections for viewing content. The exact purpose would depend on its specific use in the app.

---

## Core Files

- **globals.css**: This file contains global CSS rules and styles that apply across the entire application. It is imported at the top level to ensure consistent styling.

- **layout.tsx**: This file defines the layout component for the application, which may include the header, footer, and other persistent elements. It serves as a wrapper for all pages and routes.

- **page.tsx**: Acts as the main entry point or home page of the application. It’s likely the root route (`/`) and may include navigation to various sections of the app.

- **Providers.tsx**: A component that wraps the application with various providers, such as context providers for state management or theme providers.

- **RouteToPage.tsx**: A routing helper component, possibly used to handle conditional routing or route redirection based on certain conditions.

- **StoreData.tsx**: This file may handle data storage logic, possibly connecting to a global state or data management library. It could be a shared utility for managing and accessing application-wide data.

---


# Project Setup Guide

This guide provides instructions for setting up the project on your local machine.

## Prerequisites

Make sure you have the following tools installed on your device:
- **Node.js**: Version 14.x or higher. [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**: For managing dependencies.
- **Git**: Version control to clone the repository. [Download Git](https://git-scm.com/)

## Steps to Set Up the Project Locally

1. ### Clone the Repository

   Open a terminal and clone the project repository using Git:
   ```bash
   git clone <repository-url>

2. ### Clone the Repository

   Open a terminal and clone the project repository using Git:
   ```bash
   git clone <repository-url>



## Additional Notes

- **Routing Convention**: Each folder corresponds to a route, and each `.tsx` file represents a page within that route. Nested folders indicate nested routes, providing a hierarchical structure to the application's navigation.
- **Dynamic Routing**: If applicable, additional files or folders with square brackets `[ ]` (e.g., `[id].tsx`) could be used to represent dynamic routes, allowing for more flexible and parameterized navigation.

---

This structure provides an organized approach to routing, making it easy to scale the application and manage different sections efficiently. For specific route functionality, please refer to individual component or page documentation.



## Additional Notes

- **Project Structure**: [Add details on the folder structure, if relevant]
- **Code Conventions**: [Add conventions used, such as naming, component structure]
- **Testing**: [If applicable, mention any testing libraries or practices]

---

This document provides an overview of the libraries and tools used in this frontend project. Refer to the individual documentation for each library for further details on their usage and configuration.
