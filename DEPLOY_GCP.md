# Google Cloud Deployment Guide

This guide ensures full compliance with the hackathon's "Deployed on Google Cloud" requirement (15% Weightage).

## 1. Deploying the Frontend (Firebase Hosting)

Your frontend is a React + Vite app. Firebase Hosting provides fast, secure hosting backed by Google's CDN.

1. Install Firebase CLI globally if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```
2. Login to your Google account:
   ```bash
   firebase login
   ```
3. Build the frontend:
   ```bash
   cd frontend
   npm run build
   cd ..
   ```
4. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```
   *(This uses the `firebase.json` file we've configured at the root of the project).*

## 2. Deploying the Backend (Google Cloud Run)

Cloud Run is a fully managed compute platform that automatically scales your stateless containers. We have provided a `Dockerfile`.

1. Install the Google Cloud SDK (`gcloud` CLI) and authenticate:
   ```bash
   gcloud auth login
   gcloud config set project [YOUR-GOOGLE-CLOUD-PROJECT-ID]
   ```
2. Build and submit your Docker image to Google Container Registry (or Artifact Registry):
   ```bash
   cd backend
   gcloud builds submit --tag gcr.io/[YOUR-GOOGLE-CLOUD-PROJECT-ID]/civicwatch-backend
   ```
3. Deploy the container to Cloud Run:
   ```bash
   gcloud run deploy civicwatch-backend \
     --image gcr.io/[YOUR-GOOGLE-CLOUD-PROJECT-ID]/civicwatch-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars="GEMINI_API_KEY=[YOUR_KEY],FRONTEND_URL=[YOUR_FIREBASE_HOSTING_URL]"
   ```

*(Note: Don't forget to replace the `[YOUR_KEY]` placeholders with your actual keys).*

## 3. Post-Deployment Check
1. Copy the URL provided by Cloud Run.
2. In your `frontend/.env`, set `VITE_BACKEND_URL` to the new Cloud Run URL.
3. Rebuild and deploy the frontend (`npm run build && firebase deploy --only hosting`) so it talks to the new backend.
