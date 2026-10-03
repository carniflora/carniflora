# Carniflora — Developer Setup

---

## Prerequisites

- **Node.js**: v24 (LTS)
- **npm** (bundled with Node.js)

---

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/carniflora/carniflora.git
   cd carniflora
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

---

## Available Scripts

| Command                | Description                                  |
| :--------------------- | :------------------------------------------- |
| `npm test`             | Run the test suite once via Vitest           |
| `npm run test:watch`   | Run Vitest in interactive watch mode         |
| `npm run lint`         | Lint all files with ESLint                   |
| `npm run format`       | Auto-format all files in place with Prettier |
| `npm run format:check` | Check formatting without writing changes     |

---

## Development Workflow

- **Tests:** Place test suites inside the `tests/` directory matching `*.test.js` or `*.spec.js`.
- **Pre-commit check:** Lint, check formatting, and run tests:
  ```bash
  npm run lint && npm run format:check && npm test
  ```
