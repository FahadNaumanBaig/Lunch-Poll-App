// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// --- 5.1  paste your project’s dev config here -------------
const firebaseConfig = {
  apiKey: "AIzaSyBwCsdvs_hz6HAled6-6vCKW47qQQHL3zs",
  authDomain: "lunchvote-dev.firebaseapp.com",
  databaseURL: "https://lunchvote-dev-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lunchvote-dev",
  appId: "1:123456789:web:abcdef",
};
// -----------------------------------------------------------

const app = initializeApp(firebaseConfig);

// App Check (reCAPTCHA v3)
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_FIREBASE_RECAPTCHA_KEY),
  isTokenAutoRefreshEnabled: true,
});

// Export Auth instance so UI can use it in Step 1.2
export const auth = getAuth(app);
export default app;
