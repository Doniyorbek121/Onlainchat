# Deployment guide

This is a standard Next.js (Node) app with a Postgres database. It runs anywhere
that can run a Node server or a container: a VPS, Fly.io, Railway, Render, or a
Kubernetes cluster.

## 1. Provision

- **Postgres** (managed is easiest: Supabase, Neon, RDS, or your own).
- A host that terminates **HTTPS** (required for PWA/Play, secure cookies, HSTS).
- Optional: **Redis** (multi-instance rate limiting), **S3/R2** (avatar storage),
  an **SMTP** provider (password reset + email verification), **Sentry**.

## 2. Configure environment

Copy `.env.example` and fill it in. The minimum for a real deployment:

```bash
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgres://user:pass@host:5432/onlainchat
DATABASE_SSL=true                     # if your provider requires TLS
APP_URL=https://your-domain.com       # canonical URL (emails, OG, sitemap, SEO)
ADMIN_EMAILS=you@your-domain.com      # bootstraps the first /admin user
SMTP_URL=smtp://user:pass@smtp.host:587
SMTP_FROM=Character AI <no-reply@your-domain.com>
```

Recommended for launch (all optional, off by default):

```bash
REDIS_URL=redis://...                 # shared rate limiting across replicas
REQUIRE_EMAIL_VERIFICATION=true       # require verified email to create characters
SENTRY_DSN=...                        # server error tracking
NEXT_PUBLIC_SENTRY_DSN=...            # browser error tracking
SECURITY_CONTACT=mailto:security@your-domain.com
CSAM_REPORT_WEBHOOK=https://...       # compliance escalation endpoint (see below)
# Object storage for avatars (else stored inline):
S3_BUCKET=... S3_REGION=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... S3_PUBLIC_URL=https://cdn...
# Android/Play (see PLAYSTORE.md):
ANDROID_PACKAGE_NAME=com.yourcompany.characterai
ANDROID_CERT_SHA256=<fingerprint1>,<fingerprint2>
```

## 3. Run

### Docker Compose (app + Postgres)

```bash
ANTHROPIC_API_KEY=sk-ant-... docker compose up --build -d
```

### Docker (bring your own Postgres)

```bash
docker build -t character-ai .
docker run -d -p 3000:3000 --env-file .env character-ai
```

### Node directly

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start           # serves on :3000
```

Put Nginx/Caddy/your platform's load balancer in front to terminate TLS and
proxy to `:3000`. The schema is created automatically on first boot.

## 4. Health & monitoring

- **Health probe:** `GET /api/health` → `{"ok":true,"db":"up"}` (503 if the DB is
  down). Point your load balancer / Kubernetes readiness+liveness probes here.
- **Logs** are structured JSON (`level`, `event`, `time`, …) — ship them to your
  aggregator. Set `LOG_LEVEL` (`debug|info|warn|error`).
- **Errors** go to Sentry when `SENTRY_DSN` is set.

## 5. Safety / compliance escalation

The baseline filter blocks the sexualisation of minors and calls the escalation
hook in `src/lib/safety.ts`. In production, set `CSAM_REPORT_WEBHOOK` to an
endpoint you control that forwards to **NCMEC's CyberTipline** (US operators are
legally required to report — 18 U.S.C. §2258A). Have counsel review your
obligations for your jurisdiction.

## 6. Pre-launch checklist

- [ ] HTTPS working; `curl -I https://your-domain.com` shows the security headers
      (CSP, HSTS, X-Frame-Options).
- [ ] `GET /api/health` returns ok.
- [ ] `ADMIN_EMAILS` set and `/admin` reachable by you only.
- [ ] SMTP verified: password reset + verification emails actually arrive
      (check spam; configure SPF/DKIM/DMARC on your sending domain).
- [ ] `Terms` and `Privacy` reviewed by a lawyer and updated with your entity.
- [ ] `SECURITY_CONTACT` and `CSAM_REPORT_WEBHOOK` configured.
- [ ] Database backups scheduled.
- [ ] `/manifest.webmanifest` and `/.well-known/assetlinks.json` return correctly
      (see `PLAYSTORE.md`).
- [ ] Run `pnpm test` and `pnpm test:e2e` green against a build.

See `SCALING.md` for scaling to large traffic and `PLAYSTORE.md` for the Android
app.
