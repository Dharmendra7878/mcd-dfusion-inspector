# Deployment guide

This prototype uses Vercel for the React/Vite frontend, Render for the FastAPI
and Express services, and MongoDB Atlas for persistence. The two Render
services are described in the root `render.yaml` Blueprint.

## 1. Push the project to GitHub

Create a GitHub repository and push the contents of `mcd-dfusion-app` to its
default branch. Keep `.env` files and credentials out of Git; the root
`.gitignore` excludes local environment files and dependency folders.

## 2. Create the MongoDB Atlas database

1. Create an Atlas cluster and a database user with a strong password.
2. In **Network Access**, allow connections from Render. For a prototype, Atlas
   can allow `0.0.0.0/0`; use stricter network access where your plan and
   deployment setup permit it.
3. Copy the application connection string and replace its username, password,
   and database name as needed. URL-encode special characters in the password.
   The database name can be `mcd_dfusion`.

## 3. Deploy the frontend once to obtain its origin

1. Import the GitHub repository in Vercel.
2. Set **Root Directory** to `frontend` and framework preset to **Vite**.
3. Deploy. The page can initially show an API connection error; this first
   deployment is to establish its public `https://...vercel.app` origin.

## 4. Deploy the AI service and API on Render

1. In Render, create a **Blueprint** from the same GitHub repository and select
   the root `render.yaml`.
2. For both `FRONTEND_ORIGIN` prompts, enter the frontend's exact Vercel origin
   (scheme and hostname only, for example `https://your-project.vercel.app`,
   with no trailing slash).
3. For `MONGO_URI`, enter the Atlas application connection string.
4. Create the services. Wait for the AI `/health` and API `/api/health` checks
   to pass and copy each service's public `https://...onrender.com` URL.

Render's free web services may sleep when idle, so the first request can take
longer while a service wakes.

## 5. Point Vercel at the deployed APIs

In the Vercel project's **Settings → Environment Variables**, set the following
for Production (and Preview too, if preview deployments should use these APIs):

| Variable | Value |
|---|---|
| `VITE_AI_API_URL` | AI Render URL, e.g. `https://mcd-dfusion-ai.onrender.com` |
| `VITE_API_URL` | Node API Render URL plus `/api`, e.g. `https://mcd-dfusion-api.onrender.com/api` |

Redeploy the frontend after adding/changing build-time Vite variables. Check the
deployed page, then test both service health URLs directly.

If you later add a custom frontend domain or use Vercel Preview URLs, add each
allowed origin to `FRONTEND_ORIGIN` (or comma-separated `FRONTEND_ORIGINS`) on
both Render services, then redeploy them. CORS origins must match the browser's
origin exactly.

## Local development

Copy `backend/.env.example` to `backend/.env` and set `MONGO_URI`. Frontend
defaults to the local AI and API URLs; `frontend/.env.example` documents the
optional Vite URL overrides. See the project setup steps in the chat for local
server startup commands.
