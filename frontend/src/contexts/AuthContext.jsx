import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    let unsubDoc;
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && db) {
        const { onSnapshot, doc } = await import('firebase/firestore');
        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubDoc = onSnapshot(docRef, (snap) => {
          setUserDoc(snap.exists() ? snap.data() : null);
        });
      } else {
        if (unsubDoc) unsubDoc();
        setUserDoc(null);
      }
      setLoading(false);
    });
    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const signup = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    if (db) {
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        displayName,
        isAuthority: false,
        verifiedReports: 0,
        civicPoints: 0,
        onboardingComplete: false,
        createdAt: new Date(),
      });
    }
    return cred.user;
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  const isAuthority = userDoc?.isAuthority === true;
  const isOnboarded = userDoc?.onboardingComplete === true;

  const updateOnboarding = async (data) => {
    if (!user || !db) return;
    const docRef = doc(db, 'users', user.uid);
    await setDoc(docRef, { ...data, onboardingComplete: true }, { merge: true });
    // Update local state immediately
    setUserDoc(prev => ({ ...prev, ...data, onboardingComplete: true }));
  };

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, signup, login, logout, isAuthority, isOnboarded, updateOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
