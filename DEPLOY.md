# Deployment Guide

## Environment Variables
The application requires the following environment variables.

### Vercel
Go to **Settings > Environment Variables** in your Vercel Project.

- `GEMINI_API_KEY`: Your Google Gemini API Key.
- `VITE_GEMINI_API_KEY`: Same as above (for Vite client-side access).

### Firebase
For Firebase Hosting, secrets are handled slightly differently or via Google Cloud Secret Manager if using Cloud Functions.
For this client-side app, the keys are bundled during build (WARNING: API Key is visible).

## Deploying to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in this directory.
3. Follow the prompts.

## Deploying to Firebase
1. Install Firebase Tools: `npm i -g firebase-tools`
2. Login: `firebase login`
3. Deploy: `firebase deploy`

## Important Notes
- **Authentication**: Ensure "Email/Password" provider is enabled in the [Firebase Console](https://console.firebase.google.com/project/padelrank-pro-app-2025/authentication/providers).
- **Security**: Your GEMINI_API_KEY is currently exposed in the client-side bundle. Set up API Key restrictions in Google Cloud Console to prevent abuse.
