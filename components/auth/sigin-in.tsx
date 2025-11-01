"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

const SignIn: React.FC = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState("");

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                setError(error.message);
            } else {
                setMessage("Check your email for the magic link!");
            }
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
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                },
            });

            if (error) {
                console.log(error.message)
                setError(error.message);
                
            } else {
                setMessage("OTP sent to your email!");
                setShowOtpInput(true);
            }
        } catch (err: any) {
            setError(err.message);
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'email',
            });

            if (error) {
                setError(error.message);
            } else {
                setMessage("Successfully signed in!");
                // Redirect or handle successful login
                window.location.href = "/dashboard";
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
                
                {!showOtpInput ? (
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
                            onClick={handleOtpRequest}
                            className={`w-full py-2 rounded-lg border border-indigo-600 text-indigo-600 font-semibold transition ${
                                loading ? "opacity-60 cursor-not-allowed" : "hover:bg-indigo-50"
                            }`}
                            disabled={loading}
                        >
                            {loading ? "Sending OTP..." : "Sign in with OTP"}
                        </button>
                    </form>
                ) : (
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
                                Enter the 6-digit code sent to your email
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
                            onClick={() => setShowOtpInput(false)}
                            className="w-full py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold transition hover:bg-gray-50"
                        >
                            Back
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