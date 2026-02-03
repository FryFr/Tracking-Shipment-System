import { useState, useEffect, useRef } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    type User,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    const startSession = async (email: string) => {
        try {
            const docRef = await addDoc(collection(db, 'usage_sessions'), {
                email,
                startTime: serverTimestamp(),
                endTime: null,
                durationSeconds: null,
            });
            sessionIdRef.current = docRef.id;
        } catch (err) {
            console.error('Error starting session:', err);
        }
    };

    const endSession = async () => {
        if (!sessionIdRef.current) return;
        try {
            const sessionDoc = doc(db, 'usage_sessions', sessionIdRef.current);
            // We can't easily calculate duration in Firestore serverTimestamp if we want it in the same doc immediately
            // Better to just record end time.
            await updateDoc(sessionDoc, {
                endTime: serverTimestamp(),
            });
            sessionIdRef.current = null;
        } catch (err) {
            console.error('Error ending session:', err);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Double check domain even if already logged in
                if (user.email?.endsWith('@dynaproco.com')) {
                    setUser(user);
                    if (!sessionIdRef.current) {
                        startSession(user.email);
                    }
                } else {
                    signOut(auth);
                    setUser(null);
                    setError('Access restricted to @dynaproco.com domain.');
                }
            } else {
                if (sessionIdRef.current) {
                    endSession();
                }
                setUser(null);
            }
            setLoading(false);
        });

        // Handle tab closing
        const handleUnload = () => {
            if (sessionIdRef.current) {
                // navigator.sendBeacon is better for this but Firestore SDK won't work in unload
                // We'll just try our best with endSession (it might fail if async)
                endSession();
            }
        };
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            unsubscribe();
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, []);

    const loginWithGoogle = async () => {
        setLoading(true);
        setError(null);
        try {
            await setPersistence(auth, browserLocalPersistence);
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            if (!user.email?.endsWith('@dynaproco.com')) {
                await signOut(auth);
                setError('Access restricted to @dynaproco.com domain.');
                setUser(null);
            } else {
                setUser(user);
                await startSession(user.email);
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await endSession();
            await signOut(auth);
            setUser(null);
        } catch (err: any) {
            console.error('Logout error:', err);
            setError(err.message || 'Failed to sign out');
        } finally {
            setLoading(false);
        }
    };

    return { user, loading, error, loginWithGoogle, logout };
};
