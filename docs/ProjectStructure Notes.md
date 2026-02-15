# 🧭 Notes on Structure

### Why separate `backend/` and `mobile/`?
- Clean separation of concerns.
- Each can be deployed, tested, and versioned independently.
- Makes CI/CD easier later.

### Why `migrations/` at the backend root?
- Cloudflare D1 expects SQL migrations in a predictable location.
- Keeps schema evolution clean and auditable.

### Why `hooks/` and `services/` in the mobile app?
- Encourages modular, testable logic.
- Keeps UI components clean and declarative.
- Makes Bluetooth + location tracking easier to reason about.

### Why `docs/`?
- This project has enough moving parts that documentation will matter.
- You’ll thank yourself later when revisiting the project.
