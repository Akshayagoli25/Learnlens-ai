import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  activeRole: UserRole | null;
  setActiveRole: (role: UserRole) => void;
  register: (name: string, email: string, pass: string, role: 'student' | 'teacher') => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: (preferredRole?: 'student' | 'teacher') => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (name: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const BOOTSTRAP_ADMIN_EMAIL = 'goliakshaya07@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (user: User): Promise<UserProfile | null> => {
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        // Check for bootstrap admin elevation
        if (user.email === BOOTSTRAP_ADMIN_EMAIL && data.role !== 'admin') {
          const updated = { ...data, role: 'admin' as UserRole };
          await updateDoc(userDocRef, { role: 'admin' });
          return updated;
        }
        return data;
      } else {
        // Create initial profile if missing
        const isBootstrapAdmin = user.email === BOOTSTRAP_ADMIN_EMAIL;
        const initialProfile: UserProfile = {
          id: user.uid,
          email: user.email || '',
          name: user.displayName || user.email?.split('@')[0] || 'User',
          role: isBootstrapAdmin ? 'admin' : 'student',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, initialProfile);
        return initialProfile;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await fetchProfile(user);
        setUserProfile(profile);
        if (profile) {
          setActiveRole(profile.role);
        }
      } else {
        setUserProfile(null);
        setActiveRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (currentUser) {
      const profile = await fetchProfile(currentUser);
      setUserProfile(profile);
    }
  };

  const register = async (name: string, email: string, pass: string, role: 'student' | 'teacher') => {
    // Ordinary registration does not allow admin role
    const assignedRole: UserRole = email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL ? 'admin' : role;

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });

    const newProfile: UserProfile = {
      id: cred.user.uid,
      email: email.trim(),
      name: name.trim(),
      role: assignedRole,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      setUserProfile(newProfile);
      setActiveRole(newProfile.role);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${cred.user.uid}`);
    }
  };

  const loginWithGoogle = async (preferredRole: 'student' | 'teacher' = 'teacher') => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;
    const isBootstrapAdmin = user.email?.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;

    const userDocRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        if (isBootstrapAdmin && data.role !== 'admin') {
          const updated = { ...data, role: 'admin' as UserRole };
          await updateDoc(userDocRef, { role: 'admin' });
          setUserProfile(updated);
          setActiveRole('admin');
          return;
        }
        setUserProfile(data);
        setActiveRole(data.role);
      } else {
        const initialProfile: UserProfile = {
          id: user.uid,
          email: user.email || '',
          name: user.displayName || user.email?.split('@')[0] || 'User',
          role: isBootstrapAdmin ? 'admin' : preferredRole,
          createdAt: new Date().toISOString(),
          photoURL: user.photoURL || undefined,
        };
        await setDoc(userDocRef, initialProfile);
        setUserProfile(initialProfile);
        setActiveRole(initialProfile.role);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const login = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const profile = await fetchProfile(cred.user);
    setUserProfile(profile);
    if (profile) {
      setActiveRole(profile.role);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setActiveRole(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (name: string) => {
    if (!currentUser || !userProfile) return;
    await updateProfile(currentUser, { displayName: name });
    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userDocRef, { name });
      setUserProfile((prev) => (prev ? { ...prev, name } : null));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        activeRole,
        setActiveRole,
        register,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        updateUserProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
