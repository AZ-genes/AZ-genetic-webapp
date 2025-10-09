"use client";
import React, { useState } from "react";

const SignIn: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        // TODO: Add your sign-in logic here
        setTimeout(() => {
            setLoading(false);
            // Simulate error
            if (email !== "test@example.com" || password !== "password") {
                setError("Invalid email or password.");
            }
        }, 1200);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
            <div className="bg-white shadow-lg rounded-lg px-8 py-10 w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-indigo-700 mb-6">Sign In</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    {error && (
                        <div className="text-red-500 text-sm text-center">{error}</div>
                    )}
                    <button
                        type="submit"
                        className={`w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold transition ${
                            loading ? "opacity-60 cursor-not-allowed" : "hover:bg-indigo-700"
                        }`}
                        disabled={loading}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>
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