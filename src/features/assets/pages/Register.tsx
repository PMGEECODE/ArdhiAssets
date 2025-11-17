"use client";

import type React from "react";
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "user",
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await axios.post("/api/auth/register", form);
      setSuccess("✅ Registration successful! Redirecting...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "❌ Registration failed.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-100 to-blue-100">
      <form
        onSubmit={handleSubmit}
        className="p-10 space-y-5 w-full max-w-md bg-white rounded-2xl shadow-lg"
      >
        <h2 className="text-3xl font-semibold text-center text-blue-600">
          Create Account
        </h2>

        {error && (
          <div className="px-4 py-2 text-red-700 bg-red-100 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="px-4 py-2 text-green-700 bg-green-100 rounded">
            {success}
          </div>
        )}

        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Username
          </label>
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            className="p-2 w-full rounded border focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="p-2 w-full rounded border focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="p-2 w-full rounded border focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">
            First Name
          </label>
          <input
            type="text"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            className="p-2 w-full rounded border focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Last Name
          </label>
          <input
            type="text"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            className="p-2 w-full rounded border focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">Role</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="p-2 w-full rounded border focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          type="submit"
          className="py-2 w-full font-medium text-white bg-blue-600 rounded transition-colors hover:bg-blue-700"
        >
          Register
        </button>
      </form>
    </div>
  );
};

export default Register;
