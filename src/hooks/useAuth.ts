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
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';
import type { UserRole } from '../types/tracking';

const LOGISTICS_EMAILS = new Set([
    'yannett@dynaproco.com',
    'emilka.guerra@dynaproequipment.com',
]);

const defaultRoleFor = (email: string | null | undefined): UserRole => {
    if (email && LOGISTICS_EMAILS.has(email.toLowerCase())) return 'logistics';
    return 'sales';
};

const loadOrSeedRole = async (user: User): Promise<UserRole> => {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const data = snap.data();
        const role = data.role as UserRole | undefined;
        if (role === 'logistics' || role === 'sales' || role === 'cas' || role === 'admin') {
            return role;
        }
    }
    const role = defaultRoleFor(user.email);
    await setDoc(ref, {
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        role,
        created_at: serverTimestamp(),
    }, { merge: true });
    return role;
};

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
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
            await updateDoc(sessionDoc, {
                endTime: serverTimestamp(),
            });
            sessionIdRef.current = null;
        } catch (err) {
            console.error('Error ending session:', err);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                if (authUser.email?.endsWith('@dynaproco.com') || authUser.email?.endsWith('@dynaproequipment.com')) {
                    setUser(authUser);
                    if (!sessionIdRef.current) {
                        startSession(authUser.email);
                    }
                    try {
                        const resolvedRole = await loadOrSeedRole(authUser);
                        setRole(resolvedRole);
                    } catch (err) {
                        console.error('Error loading role:', err);
                        setRole(defaultRoleFor(authUser.email));
                    }
                } else {
                    signOut(auth);
                    setUser(null);
                    setRole(null);
                    setError('Access restricted to @dynaproco.com or @dynaproequipment.com.');
                }
            } else {
                if (sessionIdRef.current) {
                    endSession();
                }
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        const handleUnload = () => {
            if (sessionIdRef.current) {
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
            const loggedInUser = result.user;

            if (!loggedInUser.email?.endsWith('@dynaproco.com') && !loggedInUser.email?.endsWith('@dynaproequipment.com')) {
                await signOut(auth);
                setError('Access restricted to @dynaproco.com or @dynaproequipment.com.');
                setUser(null);
                setRole(null);
            } else {
                setUser(loggedInUser);
                await startSession(loggedInUser.email);
                try {
                    const resolvedRole = await loadOrSeedRole(loggedInUser);
                    setRole(resolvedRole);
                } catch (err) {
                    console.error('Error loading role:', err);
                    setRole(defaultRoleFor(loggedInUser.email));
                }
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
            setRole(null);
        } catch (err: any) {
            console.error('Logout error:', err);
            setError(err.message || 'Failed to sign out');
        } finally {
            setLoading(false);
        }
    };

    return { user, role, loading, error, loginWithGoogle, logout };
};
