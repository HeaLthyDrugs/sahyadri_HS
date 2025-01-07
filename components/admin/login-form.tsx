"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Cookies from 'js-cookie';

export function LoginForm() {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    if (isAuthenticated) {
      router.push("/admin");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (credentials.email === "admin@example.com" && credentials.password === "admin123") {
        // Set authentication in both localStorage and cookie
        localStorage.setItem("isAuthenticated", "true");
        Cookies.set('isAuthenticated', 'true', { expires: 7 }); // Cookie expires in 7 days
        
        // Force a hard navigation to the admin page
        window.location.href = "/admin";
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/logo.png"
          alt="Logo"
          width={60}
          height={60}
          className="rounded-full mb-4"
        />
        <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={credentials.email}
            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
} 