# GCP Express & PostgreSQL API

An Express.js web API and frontend application that implements:
- Endpoint `GET /testme`: returns `"testing gcp"` and logs the time of day into a PostgreSQL database.
- Interactive UI: Click a button to invoke the API, print the response live, and inspect the PostgreSQL records table.
- Ready for local development and Google Cloud Platform (GCP Cloud Run + Cloud SQL).

---

## 🚀 Quickstart (Local)

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL running locally (e.g. `brew services start postgresql@15`)

### 2. Configure Environment
Copy `.env.example` to `.env` (already created if following local setup):
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` points to your PostgreSQL database:
```env
PORT=3000
DATABASE_URL=postgres://localhost:5432/janky_db
```

### 3. Start the Server
```bash
# Production start
npm start

# Or development with hot reloading
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing the API

### Via Browser UI
1. Navigate to `http://localhost:3000`.
2. Click **"Execute GET /testme"**.
3. The UI prints `"testing gcp"` and displays the response metadata along with the database record created in PostgreSQL.

### Via Command Line (cURL)
```bash
# Call endpoint and get plain text "testing gcp"
curl -i http://localhost:3000/testme

# Optional JSON format with detailed record metadata
curl http://localhost:3000/testme?format=json

# Fetch recent database records
curl http://localhost:3000/api/records
```

### Automated Unit / Integration Tests
```bash
npm test
```

---

## ☁️ Deploying to Google Cloud Platform (GCP)

### Option A: Google Cloud Run + Cloud SQL for PostgreSQL

1. **Create Cloud SQL PostgreSQL instance:**
   ```bash
   gcloud sql instances create my-postgres-db \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1
   ```

2. **Create the database and user:**
   ```bash
   gcloud sql databases create janky_db --instance=my-postgres-db
   gcloud sql users set-password postgres --instance=my-postgres-db --password="<YOUR_DB_PASSWORD>"
   ```

3. **Deploy with Cloud Run:**
   ```bash
   gcloud run deploy janky-api \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars="DATABASE_URL=postgres://postgres:<YOUR_DB_PASSWORD>@/<DB_NAME>?host=/cloudsql/<PROJECT_ID>:us-central1:my-postgres-db" \
     --add-cloudsql-instances=<PROJECT_ID>:us-central1:my-postgres-db
   ```

---

## 📁 Project Structure

```
.
├── src/
│   ├── db.js          # PostgreSQL connection pool and query helpers
│   └── server.js      # Express application and /testme endpoint
├── public/
│   ├── index.html     # Modern interactive UI
│   ├── style.css      # Dark glassmorphism styling
│   └── app.js         # Frontend fetch logic & live table updates
├── test/
│   └── test.js        # Automated integration tests
├── Dockerfile         # Production container definition
├── .env               # Local environment configuration
└── package.json       # Project dependencies & scripts
```
