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

| Command              | Description                                     |
| :------------------- | :---------------------------------------------- |
| `npm test`           | Run the test suite once via Vitest              |
| `npm run test:watch` | Run Vitest in interactive watch mode            |
| `npm run lint`       | Check formatting across all files with Prettier |
| `npm run format`     | Auto-format all files in place with Prettier    |

---

## Development Workflow

- **Tests:** Place test suites inside the `tests/` directory matching `*.test.js` or `*.spec.js`.
- **Pre-commit check:** Run tests and ensure code conforms to format:
  ```bash
  npm run format && npm test
  ```
