# MCD-DFusion — Multimodal Sentiment & Consistency Inspector

A full-stack research and inspection prototype inspired by **Associate Professor 张留美 (Liumei Zhang)**'s research on multimodal sentiment analysis (including **MCD-DFusion**), built to inspect sentiment consistency across modalities (captions, OCR text, emojis, and image mood), evaluate conflict / low-MCD cases, test perturbation robustness, and save experiment records.

---

## System Architecture

* **Frontend (`frontend/`)**: React + Vite web application deployed on **Vercel**
* **Backend API (`backend/`)**: Node.js REST API (`server.js`) deployed on **Render**, connected to **MongoDB Atlas** (`Cluster0`) for storing experiment history
* **AI Service (`ai-service/`)**: Python service deployed on **Render** exposing multimodal analysis endpoints (such as `/analyze`)

---

## Live Deployment URLs

* **Frontend (Vercel)**: `https://mcd-dfusion-inspector.vercel.app/`
* **Backend API (Render)**: `https://mcd-dfusion-api.onrender.com`
* **AI Service (Render)**: `https://mcd-dfusion-ai.onrender.com`

---

## Project Structure

```text
mcd-dfusion-inspector/
├── frontend/     # React + Vite inspector dashboard
├── backend/      # Node.js API server & MongoDB persistence
└── ai-service/   # Python multimodal analysis service
```

---

## Environment Variables & Cloud Setup

### 1. MongoDB Atlas
* Active cluster (`Cluster0`) with `0.0.0.0/0` allowed in **Network Access** so cloud-hosted backend instances can connect.

### 2. Render — Backend (`mcd-dfusion-api`)
* `MONGO_URI` — MongoDB Atlas connection string (`mongodb+srv://...`)

### 3. Vercel — Frontend (`mcd-dfusion-inspector`)
* **Root Directory**: `frontend`
* **Framework Preset**: `Vite`
* `VITE_AI_API_URL` — `https://mcd-dfusion-ai.onrender.com`
* `VITE_API_URL` — `https://mcd-dfusion-api.onrender.com/api`

---

## Known Notes & Pending Fix

* **Render Free Tier Cold Starts**: Free instances on Render may spin down during inactivity, causing the first request after idle time to take ~30–50 seconds.
* **AI Service CORS Configuration**: Calls from `https://mcd-dfusion-inspector.vercel.app` to `https://mcd-dfusion-ai.onrender.com/analyze` require `https://mcd-dfusion-inspector.vercel.app` to be explicitly allowed in the `ai-service` CORS configuration, followed by a redeploy on Render.

---

## Local Development

1. **Clone the repository**
   ```bash
   git clone [https://github.com/Dharmendra7878/mcd-dfusion-inspector.git](https://github.com/Dharmendra7878/mcd-dfusion-inspector.git)
   cd mcd-dfusion-inspector
   ```
2. **Start the AI Service (`ai-service/`)**
   * Install Python dependencies and start the server locally.
3. **Start the Backend (`backend/`)**
   * Configure `MONGO_URI` in `backend/.env`, install dependencies (`npm install`), and run `npm start`.
4. **Start the Frontend (`frontend/`)**
   * Configure `VITE_AI_API_URL` and `VITE_API_URL` in `frontend/.env`, install dependencies (`npm install`), and run the Vite dev server.
