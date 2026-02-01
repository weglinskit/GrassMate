# GrassMate

Intelligent lawn care recommendations to help homeowners plan and manage year-round lawn maintenance with clear, weather-aware suggestions.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

GrassMate is a web application designed to simplify lawn care decision-making for homeowners. The application provides intelligent, weather-aware recommendations for essential lawn maintenance tasks such as mowing, fertilizing, watering, aeration, and scarification.

### Key Features

- **Annual Schedule**: Year-round simplified maintenance schedule with seasonal recommendations
- **Weather-Aware Recommendations**: Dynamic suggestions based on current and forecasted weather conditions using Open-Meteo data
- **Task Management**: Track upcoming treatments (active treatments with proposed date in the next 10 days, shown on the dashboard; mark as completed via CompleteTreatmentDrawer), and maintain a history of all lawn care activities
- **User Profiles**: Customizable lawn profiles with settings for sun exposure, lawn size, and surface type
- **Web Push Notifications**: Browser-based notifications for scheduled treatments and weather-based recommendations
- **User Authentication**: Secure email/password authentication with user data stored in Supabase

## Tech Stack

### Frontend

- **[Astro](https://astro.build/)** v5 - Modern web framework for building fast, content-focused websites with minimal JavaScript
- **[React](https://react.dev/)** v19 - UI library for building interactive components
- **[TypeScript](https://www.typescriptlang.org/)** v5 - Type-safe JavaScript for better code quality and IDE support
- **[Tailwind CSS](https://tailwindcss.com/)** v4 - Utility-first CSS framework for rapid UI development
- **[Shadcn/ui](https://ui.shadcn.com/)** - Accessible React component library built on Radix UI

### Backend

- **[Supabase](https://supabase.com/)** - Backend-as-a-Service providing:
  - PostgreSQL database
  - User authentication
  - Real-time capabilities
  - Open-source solution with self-hosting options

### External Services

- **[Open-Meteo](https://open-meteo.com/)** - Free weather API for historical and forecasted weather data
- **[OpenRouter.ai](https://openrouter.ai/)** - AI model gateway for accessing various AI models (OpenAI, Anthropic, Google, etc.)

### Testing

- **Unit tests:** **[Vitest](https://vitest.dev/)** — test runner z integracją Vite/Astro, ESM i trybem watch; mocki przez `vi.fn()` / `vi.mocked()` (np. Supabase). Schematy Zod i funkcje czyste (auth, serwisy) testowane bez dodatkowych bibliotek.
- **React components:** **[React Testing Library](https://testing-library.com/react)** + **@testing-library/user-event** — testy formularzy i komponentów (Login, Register, CompleteTreatmentDrawer, ProfileCreate/Edit) z mockami `supabaseBrowser` i `fetch`; środowisko **jsdom** (lub happy-dom).
- **E2E tests:** **[Playwright](https://playwright.dev/)** — testy end-to-end w przeglądarce (Chromium, Firefox, WebKit); scenariusze: logowanie → dashboard → utworzenie profilu → lista zabiegów → oznaczenie zabiegu jako wykonany. Konfiguracja: `playwright.config.ts`, katalog `e2e/` z plikami `*.spec.ts`.

Szczegóły strategii i zakresu: [`.ai/test-plan.md`](.ai/test-plan.md).

### DevOps & Hosting

- **[GitHub Actions](https://github.com/features/actions)** - CI/CD pipelines
- **[DigitalOcean](https://www.digitalocean.com/)** - Application hosting via Docker containers

## Getting Started Locally

### Prerequisites

- **Node.js** v22.14.0 (as specified in `.nvmrc`)
- **npm** (comes with Node.js)

### Installation Steps

1. **Clone the repository:**

```bash
git clone https://github.com/weglinskit/GrassMate
cd GrassMate
```

2. **Install Node.js version (using nvm):**

```bash
nvm use
```

3. **Install dependencies:**

```bash
npm install
```

4. **Set up environment variables:**

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Open-Meteo API (no key required, but you can configure endpoint)
OPEN_METEO_API_URL=https://api.open-meteo.com/v1

# OpenRouter.ai (if using AI features)
OPENROUTER_API_KEY=your_openrouter_api_key
```

5. **Run the development server:**

```bash
npm run dev
```

The application will be available at `http://localhost:4321` (default Astro port).

6. **Build for production:**

```bash
npm run build
```

7. **Preview production build:**

```bash
npm run preview
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Astro development server with hot module replacement |
| `npm run build` | Build the application for production |
| `npm run preview` | Preview the production build locally |
| `npm run astro` | Run Astro CLI commands directly |
| `npm run lint` | Run ESLint to check for code quality issues |
| `npm run lint:fix` | Automatically fix ESLint issues where possible |
| `npm run format` | Format code using Prettier |
| `npm run test` | Run Vitest in watch mode (unit + integration) |
| `npm run test:run` | Run Vitest once (for CI) |
| `npm run test:unit` | Run only unit tests |
| `npm run test:integration` | Run only API integration tests |
| `npm run test:e2e` | Run Playwright E2E tests |

## Project Scope

### MVP Features (In Scope)

- ✅ User authentication (email/password)
- ✅ Annual lawn care schedule with seasonal recommendations
- ✅ Weather-aware dynamic recommendations (watering, fertilizing, mowing)
- ✅ Upcoming treatments list
- ✅ Mark treatments as completed, rejected, or expired
- ✅ Treatment history tracking
- ✅ Lawn profile management (sun exposure, size, surface type)
- ✅ Web Push notifications (with opt-in)
- ✅ Automatic recommendation refresh (every 24 hours)

### Out of Scope (Post-MVP)

- ❌ Mobile app / PWA
- ❌ Advanced image analysis or disease diagnosis
- ❌ Integration with robotic mowers or irrigation systems
- ❌ Custom user-defined treatments
- ❌ Advanced charts and statistics
- ❌ Social features, photos, lawn comparisons
- ❌ Google OAuth (planned for roadmap)

## Project Status

**Current Phase:** MVP Development (4-6 weeks)

The project is currently in active development, focusing on core MVP features as outlined in the Product Requirements Document (PRD). The roadmap includes:

### Stage 1 – MVP (Current)
- User authentication
- Annual schedule
- Open-Meteo integration
- Weather-based recommendation generation
- Web Push notifications
- Treatment list and management
- Treatment history
- Minimal UX implementation

### Stage 2 – Post-MVP (Planned)
- Google OAuth
- PWA / mobile version
- Advanced watering models
- Personalization based on soil type
- User testing with larger groups
- Robotic mower integrations

For detailed requirements and specifications, see [`.ai/prd.md`](.ai/prd.md).

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

---

**Note:** This project follows best practices for code quality, accessibility, and maintainability. For development guidelines and coding standards, refer to the AI rules in `.cursor/rules/` directory.
