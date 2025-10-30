"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

const SignUp: React.FC = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSignUp = async (e: React.FormEvent) => {
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
            <div className="bg-white shadow-lg rounded-lg px-8 py-10 w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-indigo-700 mb-6">Sign Up</h2>
                <form onSubmit={handleSignUp} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full px-4 py-2 border text-gray-600 outline-none rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                </form>
                <div className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <a href="/sign-in" className="text-indigo-600 hover:underline font-medium">
                        Sign In
                    </a>
                </div>
            </div>
        </div>
    );
};

export default SignUp;