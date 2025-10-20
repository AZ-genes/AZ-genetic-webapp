"use client"
import React, { useState } from "react";

const Dashboard: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<string>("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setMessage("");
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setMessage("Please select a file to upload.");
            return;
        }
        setUploading(true);
        setMessage("");
        // Simulate upload
        setTimeout(() => {
            setUploading(false);
            setMessage("Genetic data uploaded successfully!");
            setFile(null);
        }, 1500);
    };

    return (
        <div style={{ maxWidth: 400, margin: "40px auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
            <h2>Genetic Data Dashboard</h2>
            <input
                type="file"
                accept=".csv,.txt,.json"
                onChange={handleFileChange}
                disabled={uploading}
                style={{ marginBottom: 16 }}
            />
            <button
                onClick={handleUpload}
                disabled={uploading || !file}
                style={{ padding: "8px 16px", marginBottom: 16 }}
            >
                {uploading ? "Uploading..." : "Upload"}
            </button>
            {message && <div style={{ color: "green", marginTop: 8 }}>{message}</div>}
        </div>
    );
};

export default Dashboard;