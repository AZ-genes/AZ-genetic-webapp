"use client";
import React, { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { sendSignInLinkToEmail, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useRouter } from "next/navigation";

const SignIn: React.FC = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
    const [confirmationResult, setConfirmationResult] = useState<any>(null);
    const [signInMethod, setSignInMethod] = useState<'email' | 'phone' | 'otp_sent'>('email'); // New state for sign-in method
    const router = useRouter();

    useEffect(() => {
        // Cleanup reCAPTCHA when component unmounts or signInMethod changes
        return () => {
            if (recaptchaVerifier && typeof window !== 'undefined') {
                try {
                    recaptchaVerifier.clear();
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        };
    }, [recaptchaVerifier]);

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const actionCodeSettings = {
                url: `${window.location.origin}/auth/callback`,
                handleCodeInApp: true,
            };
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            setMessage("Check your email for the magic link!");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpRequest = async () => {
        setLoading(true);
        setError("");
        setMessage("");
        try {
            // Check if recaptcha container exists
            if (typeof window === 'undefined') {
                throw new Error('Window is not defined');
            }
            
            const container = document.getElementById('recaptcha-container');
            if (!container) {
                throw new Error('reCAPTCHA container not found');
            }

            // Clean up existing verifier if it exists
            if (recaptchaVerifier) {
                try {
                    recaptchaVerifier.clear();
                } catch (error) {
                    // Ignore cleanup errors
                }
            }

            // Initialize new RecaptchaVerifier
            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response: any) => {
                    // reCAPTCHA solved automatically for invisible
                },
                'expired-callback': () => {
                    setError("reCAPTCHA expired. Please try again.");
                    setLoading(false);
                }
            });

            // Render the verifier
            await verifier.render();
            setRecaptchaVerifier(verifier);

            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
            setConfirmationResult(confirmation);
            setSignInMethod('otp_sent');
            setMessage("OTP sent to your phone number!");
        } catch (err: any) {
            console.error('OTP request error:', err);
            setError(err.message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");
        try {
            if (confirmationResult) {
                await confirmationResult.confirm(otp);
                setMessage("Successfully signed in with OTP!");
                router.push("/dashboard"); // Redirect to dashboard on successful sign-in
            } else {
                setError("OTP confirmation failed. Please try again.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
            <div className="bg-white shadow-lg rounded-lg px-8 py-10 w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-indigo-700 mb-6">Sign In</h2>
                
                {signInMethod === 'email' && (
                    <form onSubmit={handleMagicLink} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-600"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="Enter your email"
                            />
                        </div>
                        
                        {error && (
                            <div className="text-red-500 text-sm text-center p-2 bg-red-50 rounded">{error}</div>
                        )}
                        
                        {message && (
                            <div className="text-green-600 text-sm text-center p-2 bg-green-50 rounded">{message}</div>
                        )}
                        
                        <button
                            type="submit"
                            className={`w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold transition ${
                                loading ? "opacity-60 cursor-not-allowed" : "hover:bg-indigo-700"
                            }`}
                            disabled={loading}
                        >
                            {loading ? "Sending magic link..." : "Send Magic Link"}
                        </button>
                        
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or</span>
                            </div>
                        </div>
                        
                        <button
                            type="button"
                            onClick={() => setSignInMethod('phone')}
                            className={`w-full py-2 rounded-lg border border-indigo-600 text-indigo-600 font-semibold transition ${
                                loading ? "opacity-60 cursor-not-allowed" : "hover:bg-indigo-50"
                            }`}
                            disabled={loading}
                        >
                            Sign in with Phone Number
                        </button>
                    </form>
                )}

                {signInMethod === 'phone' && (
                    <form onSubmit={e => { e.preventDefault(); handleOtpRequest(); }} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (e.g., +11234567890)</label>
                            <input
                                type="tel"
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-600"
                                value={phoneNumber}
                                onChange={e => setPhoneNumber(e.target.value)}
                                required
                                autoComplete="tel"
                                placeholder="Enter your phone number"
                            />
                        </div>
                        
                        {error && (
                            <div className="text-red-500 text-sm text-center p-2 bg-red-50 rounded">{error}</div>
                        )}
                        
                        {message && (
                            <div className="text-green-600 text-sm text-center p-2 bg-green-50 rounded">{message}</div>
                        )}
                        
                        <button
                            type="submit"
                            className={`w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold transition ${
                                loading ? "opacity-60 cursor-not-allowed" : "hover:bg-indigo-700"
                            }`}
                            disabled={loading}
                        >
                            {loading ? "Sending OTP..." : "Send OTP"}
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => setSignInMethod('email')}
                            className="w-full py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold transition hover:bg-gray-50"
                        >
                            Back to Email Sign-in
                        </button>
                        {/* reCAPTCHA container - invisible */}
                        <div id="recaptcha-container" style={{ display: 'none' }}></div>
                    </form>
                )}

                {signInMethod === 'otp_sent' && (
                    <form onSubmit={verifyOtp} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center text-xl tracking-widest"
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                required
                                maxLength={6}
                                placeholder="000000"
                            />
                            <p className="text-sm text-gray-500 mt-2 text-center">
                                Enter the 6-digit code sent to your phone number
                            </p>
                        </div>
                        
                        {error && (
                            <div className="text-red-500 text-sm text-center p-2 bg-red-50 rounded">{error}</div>
                        )}
                        
                        {message && (
                            <div className="text-green-600 text-sm text-center p-2 bg-green-50 rounded">{message}</div>
                        )}
                        
                        <button
                            type="submit"
                            className={`w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold transition ${
                                loading ? "opacity-60 cursor-not-allowed" : "hover:bg-indigo-700"
                            }`}
                            disabled={loading}
                        >
                            {loading ? "Verifying..." : "Verify OTP"}
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => setSignInMethod('phone')}
                            className="w-full py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold transition hover:bg-gray-50"
                        >
                            Back to Phone Number
                        </button>
                    </form>
                )}
                
                <div className="mt-6 text-center text-sm text-gray-600">
                    Don't have an account?{" "}
                    <a href="/sign-up" className="text-indigo-600 hover:underline font-medium">
                        Sign Up
                    </a>
                </div>
            </div>
        </div>
    );
};

export default SignIn;