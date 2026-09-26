# Bridge to College (CollegeQuest) 🎓

An interactive, AI-powered web platform designed to streamline and demystify the college admissions process for high school students. Powered by Google Gemini and Firebase, Bridge to College provides personalized essay brainstorming, curated college lists, major discovery, and interactive drafting tools.

---

## ✨ Features

- **🤖 AI Essay Brainstorming**: Interactive prompts powered by Gemini 2.5 Flash to help students uncover unique personal essay topics and narratives.
- **🏫 College List Builder**: Discover and track reach, target, and safety colleges with personalized criteria.
- **🔍 Major Exploration**: Explore academic disciplines, career trajectories, and tailored recommendation pathways.
- **✍️ Essay Editor & Feedback**: Draft supplemental and personal essays with real-time AI guidance and structure recommendations.
- **🔐 Secure Authentication**: Firebase Authentication with support for email login, registration, and anonymous guest sessions.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, React Router v7
- **AI / LLM**: Google Gemini 2.5 Flash API
- **Backend & Serverless**: Node.js, Vercel Serverless Functions
- **Database & Auth**: Firebase Authentication, Cloud Firestore

---

## 🔒 Security & Architecture

This project follows enterprise-grade security practices to safeguard API keys and sensitive credentials:

1. **Zero Client-Side Secret Leakage**:
   - The `GEMINI_API_KEY` is **never** bundled into the client build or exposed to user browsers.
   - All AI requests are routed through a serverless backend proxy (`/api/gemini`), ensuring complete separation between the frontend UI and generative AI credentials.

2. **Scoped Cloud Permissions**:
   - Google Cloud API keys are strictly restricted to the **Generative Language API** (Gemini) with HTTP referrers and unauthorized APIs blocked.

3. **Environment Isolation**:
   - All secrets and environment variables are managed via `.env` files (strictly ignored by Git) and securely injected at runtime through Vercel's encrypted environment variables.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm or yarn

### 1. Clone Repository

```bash
git clone https://github.com/DishitaJoshi/bridgeToCollege.git
cd bridgeToCollege
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the template environment file:

```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:

```env
# Gemini API Key (Serverless / Proxy only)
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration (Client-side)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Run Locally

Start the local Gemini backend proxy:
```bash
npm run api
```

In a separate terminal, start the Vite development server:
```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🚢 Deployment

### Deploy to Vercel

1. Push this repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Under **Settings > Environment Variables**, add:
   - `GEMINI_API_KEY`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
4. Deploy! The `/api/gemini` serverless function handles AI proxying automatically.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
