# Docker Setup Guide

Run the entire stack (MySQL + Spring Boot + React) on any machine with just Docker.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine + Compose (Linux)
- Git

## First-time setup on a new machine

```bash
# 1. Clone
git clone <your-repo-url>
cd project-4---ok-

# 2. Create env files from templates
cp .env.example .env
cp springboot/.env.example springboot/.env
cp reactjs/.env.example reactjs/.env
cp flutter/.env.example flutter/.env   # only if running mobile app

# 3. Edit values you need (see "What to change" below)
#    - Real OPENAI_API_KEY in springboot/.env
#    - Google OAuth client ID in .env (root) for the React build
#    - LAN IP in flutter/.env if testing on a phone

# 4. Build and start
docker compose up -d --build

# 5. Verify
docker compose ps
docker compose logs -f backend
```

Open:
- Frontend: http://localhost
- Backend API: http://localhost:8080
- MySQL: localhost:3306 (user `matcha_user`, see your `.env`)

## Stop / restart / rebuild

```bash
docker compose stop          # stop without removing
docker compose down          # stop + remove containers (data persists in volume)
docker compose down -v       # ALSO delete database volume (fresh DB next time)
docker compose up -d --build # rebuild after code changes
```

## What to change per machine

| File | Variable | When to change |
|------|----------|----------------|
| `.env` | `VITE_API_BASE_URL`, `VITE_ASSET_BASE_URL` | Set to `http://<host-LAN-ip>:8080` if accessing from another device |
| `.env` | `VITE_GOOGLE_CLIENT_ID` | Use your own Google OAuth web client ID |
| `.env` | `MYSQL_*` | Change passwords for production / shared environments |
| `.env` | `MYSQL_PORT`, `BACKEND_PORT`, `FRONTEND_PORT` | Change if those ports are taken |
| `springboot/.env` | `OPENAI_API_KEY` | Your own OpenAI API key |
| `flutter/.env` | `VITE_API_BASE_URL`, `VITE_ASSET_BASE_URL` | LAN IP of the host running the backend |

## Database initialization

The `springboot/database/` folder is auto-mounted into MySQL's
`/docker-entrypoint-initdb.d/`. Any `.sql` file there runs **once** when the
volume is first created. Currently it loads `schema-mysql.sql`.

To seed extra data, drop a `seed.sql` next to it, then:

```bash
docker compose down -v   # destroy old volume
docker compose up -d     # re-init from scratch
```

## Sharing data between machines

### Code + schema → Git (already covered)

### Database snapshot

```bash
# Machine A — export
docker exec kamatcha-mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" \
  matcha_tea > db-snapshot.sql

# Machine B — import (after `docker compose up -d`)
docker exec -i kamatcha-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" \
  matcha_tea < db-snapshot.sql
```

### Uploaded files

The host folder `springboot/uploads/` is mounted into the backend.
Sync it across machines via:
- A cloud bucket (R2/S3) — recommended for production
- Manual `rsync`/`scp` for ad-hoc transfers

## Troubleshooting

- **Port already in use** → change `*_PORT` in root `.env`
- **Backend can't reach MySQL** → check `docker compose logs mysql`; healthcheck must pass
- **Frontend shows wrong API URL** → React bakes URLs at build time. After
  changing `VITE_*` in `.env`, rebuild: `docker compose up -d --build frontend`
- **`.env` not loaded** → must be in the same dir as `docker-compose.yml`
  (project root). Double-check filename has no `.txt` extension on Windows.

## Security checklist before committing

- [ ] `.env` files NOT staged (`git status` should not show them)
- [ ] No real API keys / passwords in any `*.example` file
- [ ] `springboot/uploads/` ignored
- [ ] Rotate any key that was previously committed
