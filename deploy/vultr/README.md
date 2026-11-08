# Deploy the FastAPI backend on Vultr

Gets `backend/` running on a small Vultr server with HTTPS, so the live site (`https://skillshare.app.space`) can reach it.
Needed for **MLH: Best Use of Vultr**.

## 1. Create the server (Vultr dashboard)
1. Sign up at vultr.com and add a payment method (or an MLH/hackathon credit code if you have one).
2. **Deploy → Cloud Compute → Regular Performance** (the cheapest plan, 1 vCPU / 1 GB, is enough).
3. Location: Seattle (closest), **Ubuntu 24.04**.
4. Add your SSH key (or use the root password Vultr shows). Deploy, then copy the server's **IP address**.

## 2. Pick the API address (HTTPS is required)
The site is HTTPS, so the API must be HTTPS too (browsers block mixed content).
- **No domain needed:** turn the IP into a hostname with dashes + `.sslip.io`.
  `66.42.1.2` becomes `66-42-1-2.sslip.io`. Caddy gets a real certificate for it automatically.
- **Or use your own domain:** add a DNS **A record** `api` pointing to the IP, then use `api.yourdomain.com`.

## 3. Run the setup script on the server
```bash
ssh root@<server-ip>
curl -fsSL https://raw.githubusercontent.com/goople-tech/skillshare/main/deploy/vultr/setup.sh -o setup.sh
bash setup.sh 66-42-1-2.sslip.io        # your API hostname
```

## 4. Fill in the secrets (on the server)
```bash
nano /opt/skillshare/backend/.env
```
Set `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` (must be **your own Auth0 API identifier**, see below), `GEMINI_API_KEY`.
`CORS_ORIGINS` already allows `https://skillshare.app.space` and `http://localhost:5174`.
```bash
systemctl restart skillshare-api
```
Check `https://<api-hostname>/docs` loads in your browser.

## 5. Point the frontend at it
In `frontend/.env` set `VITE_API_URL=https://<api-hostname>` and rebuild and redeploy the frontend.
The Vite build bakes this value in, so the live site only uses it after a rebuild.

## 6. Auth0 settings (dashboard)
- Create an **API** (Applications → APIs) with an identifier such as `https://skillshare-api`.
  Use that same value for `AUTH0_AUDIENCE` on the server and `VITE_AUTH0_AUDIENCE` in the frontend.
- On your Auth0 application add `https://skillshare.app.space` and `https://skillshare.app.space/auth`
  to Allowed Callback URLs, Allowed Logout URLs and Allowed Web Origins.

## Updating later
```bash
ssh root@<server-ip> bash /opt/skillshare/deploy/vultr/update.sh
```

## For the Devpost submission
Say the backend runs on a Vultr Cloud Compute instance behind Caddy (automatic HTTPS), and opt in to **Best Use of Vultr**.

## Notes
- The database is a SQLite file on the server disk (`/opt/skillshare/backend/ubchub.db`). Fine for a demo. To use Postgres, set `DATABASE_URL`.
- Never commit `backend/.env`; the secrets stay on the server.
