import {
  GoogleAuthProvider, createUserWithEmailAndPassword, sendPasswordResetEmail,
  signInWithCredential, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

function friendlyError(error) {
  const code = error?.code || '';
  if (code.includes('email-already')) return 'That email already has an account.';
  if (code.includes('invalid-credential')) return 'Email or password is incorrect.';
  if (code.includes('weak-password')) return 'Use at least 6 characters for your password.';
  if (code.includes('popup-closed')) return 'The sign-in window was closed.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Please wait and try again.';
  return 'Could not complete authentication. Check your connection and try again.';
}

async function syncUser(user) {
  const profileRef = doc(db, 'users', user.uid);
  const existing = await getDoc(profileRef);
  const profile = {
    displayName: user.displayName || user.email.split('@')[0], email: user.email,
    photoURL: user.photoURL || '', updatedAt: serverTimestamp(),
    ...(!existing.exists() ? { createdAt: serverTimestamp() } : {}),
  };
  const batch = writeBatch(db);
  batch.set(profileRef, profile, { merge: true });
  batch.set(doc(db, 'publicProfiles', user.uid), {
    displayName: profile.displayName, email: user.email, updatedAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
  return user;
}

export async function emailSignup(name, email, password) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    return await syncUser(credential.user);
  } catch (error) { throw new Error(friendlyError(error)); }
}

export async function emailLogin(email, password) {
  try { return await syncUser((await signInWithEmailAndPassword(auth, email, password)).user); }
  catch (error) { throw new Error(friendlyError(error)); }
}

export async function googleLogin() {
  try {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (!idToken) throw new Error('Google did not return an ID token.');
      const credential = GoogleAuthProvider.credential(idToken);
      return await syncUser((await signInWithCredential(auth, credential)).user);
    }
    return await syncUser((await signInWithPopup(auth, new GoogleAuthProvider())).user);
  }
  catch (error) { throw new Error(friendlyError(error)); }
}

export async function resetPassword(email) {
  try { await sendPasswordResetEmail(auth, email); }
  catch (error) { throw new Error(friendlyError(error)); }
}

export async function changeDisplayName(user, displayName) {
  await updateProfile(user, { displayName });
  await user.reload();
  await syncUser(user);
}

export const logout = () => signOut(auth);
