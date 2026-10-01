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
