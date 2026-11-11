# Mail App backend

## Run locally

From this directory, install dependencies and start the API:

```sh
npm ci
npm start
```

The server uses `PORT` (defaulting to `3000` locally) and reads its settings
from environment variables. For local development, copy `.env.example` to
`.env` and replace the placeholders. Do not commit `.env`.

## Deploy on Render

Create a **Web Service** connected to this repository with these settings:

- **Root Directory:** `backend`
- **Runtime:** Node
- **Build Command:** `npm ci`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`

Set these environment variables in the Render service dashboard:

- `MONGODB_URI`: MongoDB Atlas connection string for the application database.
- `GMAIL_USER`: Gmail address used to send mail.
- `GMAIL_APP_PASSWORD`: Gmail App Password for that account.
- `FRONTEND_URL`: `https://ai-email-pink.vercel.app` (no trailing slash).

Render supplies `PORT` automatically. Do not put credentials in source code or
commit `.env`. Configure MongoDB Atlas Network Access to allow connections from
the Render service's outbound IP addresses. Check Render's outbound IP
information for the service and plan; Atlas can reject connections when those
addresses are not on the project's IP Access List. Avoid allowing access from
all IP addresses as a permanent workaround.

If `/api/health` reports a disconnected database, check the Render service logs
for the sanitized MongoDB connection error, confirm `MONGODB_URI` is set on that
service and contains a valid Atlas connection string and database-user
credentials, and verify Atlas Network Access and the cluster state. Connection
errors are logged without printing the full connection URI.

In Vercel, set `VITE_API_URL` to
`https://ai-email-40a6.onrender.com` and redeploy the frontend. The frontend
uses that value as its API base URL, defaults to localhost during development,
and falls back to this Render backend URL in production if the variable is
missing.

`GET /api/health` returns the server and database states. It responds with
`200` when MongoDB is connected and `503` while the database is disconnected.
If the initial MongoDB connection fails, the backend logs a sanitized error and
retries with a delay that grows from 5 to 60 seconds. Check Atlas Network Access
and the Render service logs if the health check remains degraded.
