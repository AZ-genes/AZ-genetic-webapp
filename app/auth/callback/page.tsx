"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged } from 'firebase/auth';

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const run = async () => {
            try {
                if (isSignInWithEmailLink(auth, window.location.href)) {
                    let email = window.localStorage.getItem('emailForSignIn') || '';
                    if (!email) {
                        email = window.prompt('Please provide your email for confirmation') || '';
                    }
                    if (email) {
                        await signInWithEmailLink(auth, email, window.location.href);
                        const userName = window.localStorage.getItem('userNameForSignIn');
                        const userRole = window.localStorage.getItem('userRoleForSignIn') || 'patient';
                        const isSignUp = !!userName;
                        window.localStorage.removeItem('emailForSignIn');
                        window.localStorage.removeItem('userNameForSignIn');
                        window.localStorage.removeItem('userRoleForSignIn');
                        
                        // Ensure profile exists (with or without name for sign-up)
                        try {
                            const token = await auth.currentUser?.getIdToken();
                            const response = await fetch('/api/get-profile', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: userName ? JSON.stringify({ name: userName, user_role: userRole }) : '{}'
                            });
                            
                            // Check if this is a new user or existing user logging in
                            if (response.status === 201) {
                                // New profile created (sign up)
                                window.localStorage.setItem('showWelcomeMessage', 'true');
                            } else {
                                // Existing profile (login)
                                window.localStorage.setItem('showLoginSuccessMessage', 'true');
                            }
                        } catch (err) {
                            console.error('Failed to create profile:', err);
                            window.localStorage.setItem('showLoginSuccessMessage', 'true');
                        }
                        
                        router.push('/dashboard');
                        return;
                    }
                }
                onAuthStateChanged(auth, (user) => {
                    if (user) router.push('/dashboard');
                    else router.push('/sign-in');
                });
            } catch {
                router.push('/sign-in');
            }
        };
        run();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Completing sign in...</p>
            </div>
        </div>
    );
}
