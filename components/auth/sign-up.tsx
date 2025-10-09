"use client";
import React, { useState } from "react";

type UserType = "doctor" | "individual" | "professional";

const SignUp: React.FC = () => {
    const [userType, setUserType] = useState<UserType>("individual");
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleUserTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserType(e.target.value as UserType);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle sign up logic here
        console.log({ ...form, userType });
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
            <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-2 font-medium">Account Type</label>
                    <div className="flex gap-4">
                        <label>
                            <input
                                type="radio"
                                name="userType"
                                value="doctor"
                                checked={userType === "doctor"}
                                onChange={handleUserTypeChange}
                            />
                            <span className="ml-2">Doctor</span>
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="userType"
                                value="individual"
                                checked={userType === "individual"}
                                onChange={handleUserTypeChange}
                            />
                            <span className="ml-2">Individual</span>
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="userType"
                                value="professional"
                                checked={userType === "professional"}
                                onChange={handleUserTypeChange}
                            />
                            <span className="ml-2">Professional</span>
                        </label>
                    </div>
                </div>
                <div>
                    <label className="block mb-2 font-medium" htmlFor="name">
                        Name
                    </label>
                    <input
                        className="w-full border px-3 py-2 rounded"
                        type="text"
                        id="name"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label className="block mb-2 font-medium" htmlFor="email">
                        Email
                    </label>
                    <input
                        className="w-full border px-3 py-2 rounded"
                        type="email"
                        id="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label className="block mb-2 font-medium" htmlFor="password">
                        Password
                    </label>
                    <input
                        className="w-full border px-3 py-2 rounded"
                        type="password"
                        id="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                    Sign Up
                </button>
            </form>
        </div>
    );
};

export default SignUp;