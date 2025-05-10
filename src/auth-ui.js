import { auth } from './firebase.js';
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

loginBtn.addEventListener('click', async () => {
  const email = prompt('Enter your email to sign in');
  if (!email) return;
  await sendSignInLinkToEmail(auth, email, {
    url: window.location.href,
    handleCodeInApp: true,
  });
  window.localStorage.setItem('emailForSignIn', email);
  alert('Check your email for the sign‑in link!');
});

logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('Signed‑in user:', user.email, user.uid);
    loginBtn.hidden = true;
    logoutBtn.hidden = false;
  } else {
    loginBtn.hidden = false;
    logoutBtn.hidden = true;
  }
});

// Handle the link if user clicked it in email
if (isSignInWithEmailLink(auth, window.location.href)) {
  let email = window.localStorage.getItem('emailForSignIn');
  if (!email) email = prompt('Confirm your email');
  await signInWithEmailLink(auth, email, window.location.href);
  window.localStorage.removeItem('emailForSignIn');
}
