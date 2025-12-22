"use client";
import React, { useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { sendSignInLinkToEmail } from "firebase/auth";

const SignUp: React.FC = () => {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [userRole, setUserRole] = useState<'patient' | 'doctor' | 'researcher'>('patient');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSignUp = async (e: React.FormEvent) => {
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
            if (name.trim()) {
                window.localStorage.setItem('userNameForSignIn', name.trim());
            }
            // Store selected role for later use in profile creation
            window.localStorage.setItem('userRoleForSignIn', userRole);
            setMessage("Check your email for the magic link!");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020403] relative overflow-hidden">
            <div className="fixed inset-0 z-0 bg-grid pointer-events-none opacity-50"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="glass-panel px-8 py-10 w-full max-w-sm rounded-2xl relative z-10 border-white/5 overflow-hidden group">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4">
                        <span className="iconify" data-icon="lucide:user-plus" data-width="24"></span>
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Node Initialization</h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mt-1">Register New Protocol Access</p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Full Legal Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors pr-12"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="John Doe"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 iconify text-slate-600" data-icon="lucide:user" data-width="14"></span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Email Identifier</label>
                        <div className="relative">
                            <input
                                type="email"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors pr-12"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="name@domain.com"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 iconify text-slate-600" data-icon="lucide:mail" data-width="14"></span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Access Tier</label>
                        <div className="relative">
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                                value={userRole}
                                onChange={e => setUserRole(e.target.value as 'patient' | 'doctor' | 'researcher')}
                                required
                            >
                                <option value="patient" className="bg-[#020403]">Individual Patient</option>
                                <option value="doctor" className="bg-[#020403]">Medical Practitioner</option>
                                <option value="researcher" className="bg-[#020403]">Research Facility</option>
                            </select>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 iconify text-slate-600 pointer-events-none" data-icon="lucide:chevron-down" data-width="14"></span>
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-[10px] font-mono p-3 bg-red-500/5 border border-red-500/10 rounded-lg flex items-center gap-2">
                            <span className="iconify" data-icon="lucide:alert-circle" data-width="12"></span>
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="text-emerald-400 text-[10px] font-mono p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex items-center gap-2">
                            <span className="iconify" data-icon="lucide:check-circle" data-width="12"></span>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        className={`w-full py-4 rounded-xl bg-emerald-500 text-[#020403] text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 ${loading ? "opacity-60 cursor-not-allowed" : "hover:bg-emerald-400"
                            }`}
                        disabled={loading}
                    >
                        {loading && <span className="iconify animate-spin" data-icon="lucide:loader-2" data-width="16"></span>}
                        {loading ? "Transmitting..." : "Send Magic Link"}
                    </button>
                </form>
                <div className="mt-8 text-center border-t border-white/5 pt-6">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                        Already registered?{" "}
                        <Link href="/sign-in" className="text-emerald-500 hover:text-emerald-400 font-bold ml-1 transition-colors">
                            Access Node
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
