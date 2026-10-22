## Running the project

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose on Linux), installed and **running**
- Git

### Setup

1. Clone the repository:

```bash
   git clone <repo-url>
   cd end-spec-task2
```

2. Create a file named `.env` inside `apps/api/` (the full path is `apps/api/.env`) and add the Supabase values:

```
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_KEY=<your-supabase-key>
```

   Use no quotes and no spaces around `=`. On Windows, make sure the file is named `.env` and not `.env.txt`.

3. Build and start the containers:

```bash
   docker compose build
   docker compose up
```

### Usage

| Service  | URL                          |
| -------- | ---------------------------- |
| Frontend | http://localhost:3000        |
| API      | http://localhost:3001        |
| Health   | http://localhost:3001/health |

Stop with `Ctrl+C`, then `docker compose down` to remove the containers.

### Troubleshooting

- **`api` exits immediately with "Supabase configuration is incomplete"**: `apps/api/.env` is missing, empty, or uses different variable names than the ones listed above. Fix it and run `docker compose up` again.
- **`ENOTFOUND api` in the web logs**: the `api` container crashed. Run `docker compose logs api` to see why.
