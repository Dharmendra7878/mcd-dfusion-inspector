# MCD-DFusion — Multimodal Sentiment & Consistency Inspector

A full-stack research and inspection prototype that analyzes sentiment consistency across modalities (captions, OCR text, emojis, and image mood), inspects conflict / low-MCD cases, tests perturbation robustness, and persists experiment records. Built with React + Vite, Node.js, Python, and MongoDB Atlas.

## Academic Reference & Inspiration

This project is a practical research prototype inspired by **Associate Professor 张留美 (Liumei Zhang)**'s research on multimodal sentiment analysis, including **MCD-DFusion**.

> **Note:** This application translates core research ideas around cross-modal consistency, conflict inspection, and perturbation analysis into an interactive cloud-deployed web prototype.

## System Architecture

The application uses a decoupled multi-service architecture across cloud hosting and database layers:

| Component | Tech Stack | Hosting | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React, Vite, JavaScript | Vercel | Interactive multimodal inspector dashboard and experiment viewer |
| **Backend API** | Node.js, Express, MongoDB | Render | REST API and experiment history storage in MongoDB Atlas |
| **AI Service** | Python | Render | Multimodal analysis service exposing `/analyze` |

## Live Deployment

* **Frontend**: `https://mcd-dfusion-inspector.vercel.app/`
* **Backend API**: `https://mcd-dfusion-api.onrender.com`
* **AI Service**: `https://mcd-dfusion-ai.onrender.com`

## Key Features

* **Cross-Modal Consistency Inspection**: Evaluates sentiment alignment across captions, OCR text, emojis, and image mood.
* **Conflict & Perturbation Analysis**: Highlights low-MCD / conflicting cases and lets you test how outputs respond under perturbations.
* **Persistent Experiment History**: Saves analyzed runs to MongoDB Atlas so past experiments can be reviewed and filtered.
* **Cloud Deployment Ready**: Configured across Vercel, Render, and MongoDB Atlas.

## Project Structure

```text
mcd-dfusion-inspector/
├── frontend/                  # React + Vite web application
├── backend/                   # Node.js API server & MongoDB Atlas integration
├── ai-service/                # Python multimodal analysis service
└── README.md                  # Project documentation
```

## Local Setup & Installation

### 1. Clone the Repository

```bash
git clone [https://github.com/Dharmendra7878/mcd-dfusion-inspector.git](https://github.com/Dharmendra7878/mcd-dfusion-inspector.git)
cd mcd-dfusion-inspector
```

### 2. AI Service Setup (Python)

```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Backend Setup (Node.js)

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` with your MongoDB connection string:

```env
MONGO_URI=your_mongodb_atlas_connection_string
```

Start the backend server:

```bash
npm start
```

### 4. Frontend Setup (React + Vite)

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/` pointing to your API and AI endpoints:

```env
VITE_AI_API_URL=[https://mcd-dfusion-ai.onrender.com](https://mcd-dfusion-ai.onrender.com)
VITE_API_URL=[https://mcd-dfusion-api.onrender.com/api](https://mcd-dfusion-api.onrender.com/api)
```

Start the frontend development server:

```bash
npm run dev
```

## Environment Variables & Operational Notes

* **MongoDB Atlas Network Access**: Whitelist `0.0.0.0/0` (or required cloud IPs) in MongoDB Atlas Network Access so Render can connect to the cluster.
* **Render Free Tier Cold Starts**: Free instances on Render may spin down after inactivity, which can delay initial requests by ~30–50 seconds.
* **CORS Configuration**: Ensure `https://mcd-dfusion-inspector.vercel.app` is allowed in the `ai-service` CORS settings whenever updating cross-origin rules.

## Author & Acknowledgments

* **Developer**: Dharmendra Paroda ([GitHub](https://github.com/Dharmendra7878))
* **Research Inspiration**: Associate Professor 张留美 (Liumei Zhang) and the multimodal sentiment analysis research community for foundational work in this domain.
