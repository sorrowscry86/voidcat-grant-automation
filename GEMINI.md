# GEMINI Project Context: VoidCat RDC Federal Grant Automation Platform

## Project Overview

This is a full-stack web application designed to help startups and small businesses find and apply for federal grants. It uses an AI-powered backend to automate grant discovery and proposal generation.

- **Backend:** The API is a Cloudflare Worker built with Hono.js. It is defined in the `/api` directory.
  - **Database:** Cloudflare D1 (`voidcat-users`)
  - **Storage:** Cloudflare R2 (`voidcat-assets`) and KV (`OAUTH_KV`)
  - **Deployment:** The production API is deployed to `grant-search-api.sorrowscry86.workers.dev`.

- **Frontend:** The frontend is a single `index.html` file located in the `/frontend` directory. It is a static site that uses Alpine.js for interactivity and Tailwind CSS for styling, both included via CDN. It communicates directly with the Cloudflare Worker API.

- **Testing:** The project uses Playwright for end-to-end testing. Test configurations are in `playwright.config.ts` and test-related scripts are in `package.json`.

## Building and Running

### Backend (Cloudflare Worker)

The backend is managed by Wrangler.

- **Dependencies:** Navigate to the `/api` directory and run `npm install`.
- **Deployment:** To deploy the API to the Cloudflare `production` environment, run the following command from the `/api` directory:
  ```bash
  npx wrangler deploy --env production
  ```

### Frontend

The frontend is a static HTML file and does not have a build step. It can be served from any static hosting provider or opened directly in a browser. It is configured to communicate with the production API endpoint.

### Testing

The project uses Playwright for end-to-end tests.

- **Install Playwright browsers:**
  ```bash
  npx playwright install
  ```
- **Run all tests:**
  ```bash
  npm test
  ```
- **Run tests with UI:**
  ```bash
  npm run test:ui
  ```
- **View test report:**
  ```bash
  npm run test:report
  ```

## Development Conventions

- The application is split into two main parts: `/api` for the backend and `/frontend` for the client-side application.
- The backend is written in JavaScript (as per `api/wrangler.toml` pointing to `src/index.js`) and uses the Hono.js framework.
- The frontend logic is self-contained within the `<script>` tag in `frontend/index.html`, using the Alpine.js framework for reactive UI components.
- All major functionalities like user registration, grant searching, and proposal generation are handled through API calls from the frontend to the backend.
- Stripe integration is planned for payment processing, with placeholder keys in the `wrangler.toml`.
