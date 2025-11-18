import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { login } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { setAuthToken } from "../api/token";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });

  const mutation = useMutation({
    mutationFn: () => login(form.username, form.password),
    onSuccess: (data) => {
      setAuthToken(data.access);
      setToken(data.access);
      setUser({ username: form.username });
      navigate("/");
    },
  });

  const submit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <section className="max-w-md mx-auto bg-white border rounded-lg shadow-sm p-6 space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
      <p className="text-sm text-slate-600">Use your Django user credentials (created via createsuperuser).</p>
      <form className="space-y-3" onSubmit={submit}>
        <label className="text-sm text-slate-700 block">
          Username
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            required
          />
        </label>
        <label className="text-sm text-slate-700 block">
          Password
          <input
            type="password"
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
        </label>
        <button type="submit" className="bg-indigo-600 text-white px-3 py-2 rounded text-sm w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </button>
        {mutation.error && <p className="text-sm text-red-600">Login failed. Check credentials.</p>}
      </form>
    </section>
  );
}
