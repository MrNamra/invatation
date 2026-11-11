"use client";

import { useState } from "react";
import { Database, Eye, EyeOff, Lock, UserPlus } from "lucide-react";
import type { StorageBackendState } from "@/lib/db";

interface LoginViewProps {
  storageBackend: StorageBackendState;
  registrationEnabled: boolean;
  maxUsers: number;
}

type AuthTab = "login" | "register";

export function LoginView({
  storageBackend,
  registrationEnabled,
  maxUsers,
}: LoginViewProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const data = (await res.json()) as {
        authenticated?: boolean;
        error?: string;
      };
      if (!res.ok || !data.authenticated) {
        throw new Error(data.error || "Invalid email or password");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisabledRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
        }),
      });
      const data = (await res.json()) as { error?: string };
      setError(
        data.error ||
          "Registration is disabled by default. Only one host user can sign in"
      );
    } catch {
      setError(
        "Registration is disabled by default. Only one host user can sign in"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#f7f4ee] text-[#1f1b16] px-4 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-[420px] rounded-2xl bg-[#fdfbf7] border border-[#1f1b16]/12 p-6 shadow-[0_8px_24px_rgba(31,27,22,0.05)]">
        {/* Flat Patrika Studio Brand Mark matching HostDashboard */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#a63429] flex items-center justify-center shrink-0">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="w-5 h-5"
            >
              <path
                d="M4.5 15.5V9C4.5 6 6.96243 4 10 4C13.0376 4 15.5 6 15.5 9V15.5"
                stroke="#fdfbf7"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="10" cy="9.5" r="1.5" fill="#fdfbf7" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-[18px] leading-tight font-medium tracking-[-0.01em] text-[#1f1b16]">
              Patrika Studio
            </h1>
            <p className="text-[13px] text-[#5e554a] mt-0.5">
              Host workspace login
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div
          role="tablist"
          aria-label="Authentication mode"
          className="grid grid-cols-2 gap-1 bg-[#efe9df] p-1 rounded-lg border border-[#1f1b16]/10 mt-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "login"}
            onClick={() => {
              setActiveTab("login");
              setError(null);
            }}
            className={`h-8 rounded-md text-[13px] flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer ${
              activeTab === "login"
                ? "bg-[#fdfbf7] text-[#1f1b16] font-medium border border-[#1f1b16]/10"
                : "text-[#5e554a] hover:text-[#1f1b16]"
            }`}
          >
            <Lock className="w-4 h-4 text-[#7b7266]" strokeWidth={1.5} />
            Sign in
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "register"}
            onClick={() => {
              setActiveTab("register");
              setError(null);
            }}
            className={`h-8 rounded-md text-[13px] flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer ${
              activeTab === "register"
                ? "bg-[#fdfbf7] text-[#1f1b16] font-medium border border-[#1f1b16]/10"
                : "text-[#5e554a] hover:text-[#1f1b16]"
            }`}
          >
            <UserPlus className="w-4 h-4 text-[#7b7266]" strokeWidth={1.5} />
            <span>Register</span>
            {!registrationEnabled ? (
              <span className="text-[11px] text-[#7b7266] font-normal">
                (Off)
              </span>
            ) : null}
          </button>
        </div>

        {activeTab === "login" ? (
          <form onSubmit={handleLoginSubmit} className="mt-5 flex flex-col gap-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-[13px] text-[#5e554a] mb-1.5"
              >
                Host email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@patrika.local"
                className="w-full h-10 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[14px] text-[#1f1b16] placeholder:text-[#7b7266] focus:outline-none focus:border-[#1f1b16]/30"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-[13px] text-[#5e554a] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter host password"
                  className="w-full h-10 pl-3 pr-10 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[14px] text-[#1f1b16] placeholder:text-[#7b7266] focus:outline-none focus:border-[#1f1b16]/30"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[#7b7266] hover:text-[#1f1b16] absolute right-1 top-1/2 -translate-y-1/2 transition-colors duration-150 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg bg-[#b91c1c]/10 border border-[#b91c1c]/20 px-3 py-2 text-[13px] text-[#b91c1c]"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="h-10 w-full rounded-lg bg-[#1f1b16] text-[#fdfbf7] text-[14px] font-medium hover:bg-[#332d25] disabled:opacity-50 transition-[background-color,transform] duration-150 active:scale-[0.98] cursor-pointer"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleDisabledRegisterSubmit}
            className="mt-5 flex flex-col gap-4"
          >
            <div className="rounded-lg bg-[#f7f4ee] border border-[#1f1b16]/12 px-3 py-2.5">
              <p className="text-[13px] font-medium text-[#1f1b16]">
                Registration disabled
              </p>
              <p className="text-[12px] text-[#5e554a] mt-0.5 leading-snug">
                Public account creation is turned off by default. Currently only one configured host user can log in
              </p>
            </div>

            <div>
              <label
                htmlFor="reg-name"
                className="block text-[13px] text-[#7b7266] mb-1.5"
              >
                Full name
              </label>
              <input
                id="reg-name"
                type="text"
                disabled={!registrationEnabled}
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Host Admin"
                className="w-full h-10 px-3 rounded-lg bg-[#efe9df]/60 border border-[#1f1b16]/10 text-[14px] text-[#7b7266] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-[13px] text-[#7b7266] mb-1.5"
              >
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                disabled={!registrationEnabled}
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="newuser@patrika.local"
                className="w-full h-10 px-3 rounded-lg bg-[#efe9df]/60 border border-[#1f1b16]/10 text-[14px] text-[#7b7266] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-[13px] text-[#7b7266] mb-1.5"
              >
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                disabled={!registrationEnabled}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Disabled by default"
                className="w-full h-10 px-3 rounded-lg bg-[#efe9df]/60 border border-[#1f1b16]/10 text-[14px] text-[#7b7266] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg bg-[#b91c1c]/10 border border-[#b91c1c]/20 px-3 py-2 text-[13px] text-[#b91c1c]"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!registrationEnabled || submitting}
              className="h-10 w-full rounded-lg bg-[#1f1b16] text-[#fdfbf7] text-[14px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Registration disabled
            </button>
          </form>
        )}

        {/* Single-line quiet footer */}
        <div className="mt-6 pt-4 border-t border-[#1f1b16]/10 flex items-center justify-between gap-3 text-[12px] text-[#7b7266]">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <Database className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span className="truncate">
              {storageBackend === "supabase"
                ? "Supabase PostgreSQL"
                : storageBackend === "supabase_needs_schema"
                  ? "Local store · SQL pending"
                  : "Local file store"}
            </span>
          </span>
          <span className="font-mono-tabular shrink-0">
            Single user ({maxUsers})
          </span>
        </div>
      </div>
    </div>
  );
}
