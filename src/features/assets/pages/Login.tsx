// src/pages/Login.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { Loader, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useCookieAuthStore } from "../store/cookieAuthStore";
import type { LoginCredentials } from "../types";
import Button from "../components/ui/Button";
import axios from "axios";
import { API_URL } from "../config";
import { useRedirectIfAuthenticated } from "../hooks/useRedirectIfAuthenticated";

/* ----------------------------- Types ----------------------------- */
interface EmailValidationForm {
  email: string;
}

interface PasswordForm {
  password: string;
}

/* --------------------------- Config / Constants --------------------------- */
const BRUTE_FORCE_KEY_PREFIX = "bf_attempts";
const REMEMBER_FLAG_KEY = "auth_remember_flag";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TTL_MS = 15 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

/* --------------------------- Utilities --------------------------- */
function recordFailedAttempt(email: string) {
  try {
    const key = `${BRUTE_FORCE_KEY_PREFIX}:${email.toLowerCase()}`;
    const raw = sessionStorage.getItem(key);
    let payload: {
      attempts: number;
      firstAttemptAt: number;
      lockedUntil?: number;
    } = {
      attempts: 0,
      firstAttemptAt: Date.now(),
    };

    if (raw) payload = JSON.parse(raw);

    if (payload.lockedUntil && Date.now() > payload.lockedUntil) {
      payload = { attempts: 0, firstAttemptAt: Date.now() };
    }

    payload.attempts = (payload.attempts || 0) + 1;

    if (payload.attempts >= MAX_FAILED_ATTEMPTS) {
      payload.lockedUntil = Date.now() + LOCKOUT_TTL_MS;
    }

    sessionStorage.setItem(key, JSON.stringify(payload));
    return payload;
  } catch {
    return { attempts: 1, firstAttemptAt: Date.now() };
  }
}

function getAttemptPayload(email: string) {
  try {
    const key = `${BRUTE_FORCE_KEY_PREFIX}:${email.toLowerCase()}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const payload = JSON.parse(raw) as {
      attempts: number;
      firstAttemptAt: number;
      lockedUntil?: number;
    };
    if (payload.lockedUntil && Date.now() > payload.lockedUntil) {
      sessionStorage.removeItem(key);
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function resetAttempts(email: string) {
  try {
    const key = `${BRUTE_FORCE_KEY_PREFIX}:${email.toLowerCase()}`;
    sessionStorage.removeItem(key);
  } catch {}
}

/* --------------------------- Component --------------------------- */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, initialized, isAuthenticated } = useCookieAuthStore();

  useRedirectIfAuthenticated();

  // ✅ All hooks must be called unconditionally
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      return localStorage.getItem(REMEMBER_FLAG_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "password">("email");
  const [validatedEmail, setValidatedEmail] = useState<string>("");
  const submitRef = useRef<HTMLButtonElement | null>(null);

  const emailForm = useForm<EmailValidationForm>({ mode: "onBlur" });
  const passwordForm = useForm<PasswordForm>({ mode: "onBlur" });

  const attemptPayload = useMemo(
    () => (validatedEmail ? getAttemptPayload(validatedEmail) : null),
    [validatedEmail, step]
  );

  const isLocked = useMemo(
    () =>
      !!(
        attemptPayload?.lockedUntil && Date.now() < attemptPayload.lockedUntil
      ),
    [attemptPayload]
  );

  useEffect(() => {}, []);

  if (!initialized || isAuthenticated) {
    // show nothing (or a spinner)
    return null;
  }

  const setRememberFlag = (flag: boolean) => {
    try {
      if (flag) localStorage.setItem(REMEMBER_FLAG_KEY, "1");
      else localStorage.removeItem(REMEMBER_FLAG_KEY);
      setRememberMe(flag);
    } catch {
      setRememberMe(flag);
    }
  };

  const validateEmail = async (data: EmailValidationForm) => {
    setIsLoading(true);
    setLoginError(null);

    try {
      const email = data.email.trim().toLowerCase();
      if (!email) throw new Error("Email is required");

      const payload = getAttemptPayload(email);
      if (payload?.lockedUntil && Date.now() < payload.lockedUntil) {
        const minutes = Math.ceil((payload.lockedUntil - Date.now()) / 60000);
        const msg = `Too many failed attempts. Try again in ~${minutes} minute(s).`;
        setLoginError(msg);
        toast.error(msg);
        setIsLoading(false);
        return;
      }

      const response = await axios.post(
        `${API_URL}/auth/validate-email`,
        { email },
        { withCredentials: true }
      );

      if (response.data?.valid) {
        setValidatedEmail(email);
        setStep("password");
      } else {
        const msg = "Email not found. Please check your email address.";
        setLoginError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.detail ||
        err?.message ||
        "Error validating email. Please try again.";
      setLoginError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    if (isLoading) return;
    setIsLoading(true);
    setLoginError(null);

    const email = validatedEmail.trim().toLowerCase();

    try {
      const existing = getAttemptPayload(email);
      if (existing?.lockedUntil && Date.now() < existing.lockedUntil) {
        const minutes = Math.ceil((existing.lockedUntil - Date.now()) / 60000);
        const msg = `Too many failed attempts. Try again in ~${minutes} minute(s).`;
        setLoginError(msg);
        toast.error(msg);
        setIsLoading(false);
        return;
      }

      const password = data.password || "";
      if (password.length < MIN_PASSWORD_LENGTH) {
        const msg = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
        setLoginError(msg);
        toast.error(msg);
        setIsLoading(false);
        return;
      }

      const credentials: LoginCredentials = { email, password };
      await login(credentials, rememberMe);
      resetAttempts(email);
      setRememberFlag(rememberMe);
      navigate("/dashboard");
    } catch (err: any) {
      const responseMessage = err?.response?.data?.message;
      const locked = err?.response?.data?.locked;
      const payload = recordFailedAttempt(email);

      if (responseMessage === "2FA_REQUIRED") {
        sessionStorage.setItem("email", email);
        toast.info("Two-factor code sent to your email.");
        navigate("/2fa");
        setIsLoading(false);
        return;
      }

      if (locked || (payload.lockedUntil && Date.now() < payload.lockedUntil)) {
        const until = payload.lockedUntil || Date.now() + LOCKOUT_TTL_MS;
        const minutes = Math.ceil((until - Date.now()) / 60000);
        const msg =
          responseMessage ||
          `Too many failed attempts. You are locked out for ${minutes} minute(s).`;
        setLoginError(msg);
        toast.error(msg);
        setIsLoading(false);
        return;
      }

      const attemptsRemaining =
        payload && payload.attempts
          ? Math.max(0, MAX_FAILED_ATTEMPTS - payload.attempts)
          : MAX_FAILED_ATTEMPTS - 1;
      const msg =
        responseMessage ||
        `Invalid credentials. ${attemptsRemaining} attempt(s) remaining before temporary lockout.`;
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setValidatedEmail("");
    setLoginError(null);
    passwordForm.reset();
  };

  /* ------------------------ UI ------------------------ */
  if (step === "email") {
    return (
      <form
        onSubmit={emailForm.handleSubmit(validateEmail)}
        className="space-y-4 sm:space-y-6"
        autoComplete="off"
      >
        <div>
          <label
            htmlFor="email"
            className="block text-xs sm:text-sm font-medium text-primary-700"
          >
            Email address
          </label>
          <div className="mt-2 sm:mt-1">
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`appearance-none block w-full px-3 sm:px-3 py-3 sm:py-2 text-base sm:text-sm border rounded-md shadow-sm focus:outline-none focus:ring-accent-500 focus:border-accent-500 ${
                emailForm.formState.errors.email
                  ? "border-error-300"
                  : "border-primary-300"
              }`}
              {...emailForm.register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
            />
            {emailForm.formState.errors.email && (
              <p className="mt-2 text-xs sm:text-sm text-error-600">
                {emailForm.formState.errors.email.message}
              </p>
            )}
          </div>
        </div>

        {loginError && (
          <p className="mt-3 sm:mt-2 text-xs sm:text-sm text-error-600 bg-error-50 p-3 rounded-md">
            {loginError}
          </p>
        )}

        <div className="text-xs sm:text-sm text-center">
          <Link
            to="/forgot-password"
            className="font-medium text-accent-600 hover:text-accent-500"
          >
            Forgot your password?
          </Link>
        </div>

        <div>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            className="bg-accent-600 hover:bg-accent-700 focus:ring-accent-500 py-3 sm:py-2 text-base sm:text-sm"
            aria-label="Continue with email"
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
      className="space-y-4 sm:space-y-6"
      autoComplete="off"
    >
      <div>
        <label
          htmlFor="email-display"
          className="block text-xs sm:text-sm font-medium text-primary-700"
        >
          Email address
        </label>
        <div className="mt-2 sm:mt-1 relative">
          <input
            id="email-display"
            type="email"
            value={validatedEmail}
            disabled
            className="appearance-none block w-full px-3 sm:px-3 py-3 sm:py-2 text-base sm:text-sm border rounded-md shadow-sm bg-gray-50 text-gray-500 border-gray-300"
          />
          <button
            type="button"
            onClick={handleBackToEmail}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-accent-600 hover:text-accent-700 p-2 sm:p-1"
            title="Change email"
            aria-label="Change email"
          >
            <ArrowLeft size={18} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs sm:text-sm font-medium text-primary-700"
        >
          Password
        </label>
        <div className="relative mt-2 sm:mt-1">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className={`appearance-none block w-full px-3 sm:px-3 py-3 sm:py-2 text-base sm:text-sm border rounded-md shadow-sm focus:outline-none focus:ring-accent-500 focus:border-accent-500 ${
              passwordForm.formState.errors.password
                ? "border-error-300"
                : "border-primary-300"
            }`}
            {...passwordForm.register("password", {
              required: "Password is required",
              minLength: {
                value: MIN_PASSWORD_LENGTH,
                message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
              },
            })}
            onPaste={(e) => {
              e.preventDefault();
              toast.info(
                "Pasting into password field is disabled for security reasons."
              );
            }}
            onCopy={(e) => e.preventDefault()}
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="flex absolute inset-y-0 right-0 items-center px-3 text-primary-500 focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff size={20} className="sm:w-[18px] sm:h-[18px]" />
            ) : (
              <Eye size={20} className="sm:w-[18px] sm:h-[18px]" />
            )}
          </button>
          {passwordForm.formState.errors.password && (
            <p className="mt-2 text-xs sm:text-sm text-error-600">
              {passwordForm.formState.errors.password.message}
            </p>
          )}
        </div>
      </div>

      {loginError && (
        <p className="mt-3 sm:mt-2 text-xs sm:text-sm text-error-600 bg-error-50 p-3 rounded-md">
          {loginError}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberFlag(e.target.checked)}
            className="w-4 h-4 rounded text-accent-600 focus:ring-accent-500 border-primary-300"
            aria-label="Remember me"
          />
          <label
            htmlFor="remember-me"
            className="block ml-2 text-xs sm:text-sm text-primary-700"
          >
            Remember me
          </label>
        </div>
        <div className="text-xs sm:text-sm">
          <Link
            to="/forgot-password"
            className="font-medium text-accent-600 hover:text-accent-500"
          >
            Forgot your password?
          </Link>
        </div>
      </div>

      {isLocked && attemptPayload?.lockedUntil && (
        <div className="rounded-md bg-yellow-50 p-3 text-xs sm:text-sm">
          <p>
            Too many failed attempts. Access is temporarily locked until{" "}
            <strong>
              {new Date(attemptPayload.lockedUntil).toLocaleTimeString()}
            </strong>
            . Please try again later or contact your administrator.
          </p>
        </div>
      )}

      <div>
        <Button
          ref={(el) => (submitRef.current = el)}
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isLoading}
          disabled={
            isLoading ||
            !!(
              isLocked &&
              attemptPayload?.lockedUntil &&
              Date.now() < attemptPayload.lockedUntil
            )
          }
          className="bg-accent-600 hover:bg-accent-700 focus:ring-accent-500 py-3 sm:py-2 text-base sm:text-sm"
          aria-label="Sign in"
        >
          {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : "Sign in"}
        </Button>
      </div>
    </form>
  );
};

export default Login;
