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
                        window.localStorage.removeItem('emailForSignIn');
                        window.localStorage.removeItem('userNameForSignIn');
                        
                        // Create profile with name if this is first sign-in
                        if (userName) {
                            try {
                                const token = await auth.currentUser?.getIdToken();
                                await fetch('/api/get-profile', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ name: userName })
                                });
                            } catch (err) {
                                console.error('Failed to create profile:', err);
                            }
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
