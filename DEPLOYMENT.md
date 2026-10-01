# Production deployment

This project is prepared for a Linux VPS with Docker, Docker Compose, Nginx, and a domain.

1. Point `example.com` and `api.example.com` DNS records to the VPS.
2. Install Docker and Nginx, then allow ports 80 and 443 in the firewall.
3. Copy `.env.production.example` to `.env.production` and replace every placeholder with production values. Use a long random PostgreSQL password and production Clerk keys.
4. Replace the example domains in `deploy/nginx.conf`, copy it to `/etc/nginx/sites-available/mon-petit-hero`, enable it, and reload Nginx.
5. Start the application from the repository root:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

The `migrate` service applies all committed Prisma migrations before the API starts. Check the services with `docker compose -f docker-compose.production.yml ps` and verify `https://api.example.com/healthz`.

Use Certbot after DNS is active to issue certificates for both domains, then change the Nginx listeners to HTTPS and keep the HTTP listener only for the Certbot redirect. Configure the same HTTPS API URL as the Fal.ai and Clerk webhook URL in their dashboards.

For maintenance, use `docker compose ... pull`, rebuild after code changes, and back up PostgreSQL regularly. Generated local assets are kept in a Docker volume, but object storage is recommended for durable production assets; set the S3-compatible variables when available.

Never commit `.env.production` or any private API key.

## Migrating only the story catalogue

The story migration moves `StoryTemplate` records only. It includes the complete story content (`theme`, moral lesson, educational focus, world context, and every story beat), English, French, and Arabic copy, review data, and image URLs. It does not move users, generated personal stories, pages, orders, analytics, or webhook records.

From the old environment, after setting its `DATABASE_URL`:

```bash
npm run stories:export -- --file ./story-templates-export.json
```

Copy `story-templates-export.json` to the VPS, then import it after the VPS migrations have completed:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml run --rm migrate
docker compose --env-file .env.production -f docker-compose.production.yml run --rm \
  -v "$(pwd)/story-templates-export.json:/app/story-templates-export.json:ro" \
  backend npx ts-node packages/db/prisma/migrate-story-templates.ts import \
  --file /app/story-templates-export.json
```

The importer is idempotent: rerunning it updates matching template IDs and does not delete other templates.

Custom templates are excluded by default because they can belong to users who are not being migrated. Include them only when that is intentional:

```bash
npm run stories:export -- --include-custom --file ./story-templates-export.json
```

## Migrating generated stories

To migrate every generated `Story` record with its complete page content and analytics, use the separate generated-story migration:

```bash
npm run generated-stories:export -- --file ./stories-export.json
```

This exports the related user accounts required by the stories and preserves story IDs, page IDs, template links, images, audio, PDFs, and analytics. It does not export orders, payments, page events, or webhook history. Import the template catalogue first, then run:

```bash
npm run generated-stories:import -- --file ./stories-export.json
```

The generated-story importer is idempotent, but it replaces the pages for each matching story so the exported page content is authoritative. Existing users matched by ID, Clerk ID, or email are reused; missing related users are created. Back up the VPS database before importing.
