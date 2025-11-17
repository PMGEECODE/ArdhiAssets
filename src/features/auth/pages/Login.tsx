"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  Smartphone,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

/* ----------------------------- Types ----------------------------- */
interface EmailValidationForm {
  email: string;
}

interface PasswordForm {
  password: string;
}

interface MFAForm {
  totpCode: string;
}

/* --------------------------- Config / Constants --------------------------- */
const BRUTE_FORCE_KEY_PREFIX = "bf_attempts";
const MFA_ATTEMPTS_KEY_PREFIX = "mfa_attempts";
const MAX_FAILED_ATTEMPTS = 5;
const MAX_MFA_ATTEMPTS = 5;
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

/* MFA-specific rate limiting */
function recordMFAFailedAttempt(email: string) {
  try {
    const key = `${MFA_ATTEMPTS_KEY_PREFIX}:${email.toLowerCase()}`;
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

    if (payload.attempts >= MAX_MFA_ATTEMPTS) {
      payload.lockedUntil = Date.now() + LOCKOUT_TTL_MS;
    }

    sessionStorage.setItem(key, JSON.stringify(payload));
    return payload;
  } catch {
    return { attempts: 1, firstAttemptAt: Date.now() };
  }
}

function getMFAAttemptPayload(email: string) {
  try {
    const key = `${MFA_ATTEMPTS_KEY_PREFIX}:${email.toLowerCase()}`;
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

function resetMFAAttempts(email: string) {
  try {
    const key = `${MFA_ATTEMPTS_KEY_PREFIX}:${email.toLowerCase()}`;
    sessionStorage.removeItem(key);
  } catch {}
}

/* --------------------------- Component --------------------------- */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, verifyMFA, resendMFA, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "password" | "mfa">("email");
  const [validatedEmail, setValidatedEmail] = useState<string>("");
  const [passwordExpiredEmail, setPasswordExpiredEmail] = useState<
    string | null
  >(null);
  const [countdown, setCountdown] = useState<number>(5);
  const [resending, setResending] = useState(false);

  const emailForm = useForm<EmailValidationForm>({ mode: "onBlur" });
  const passwordForm = useForm<PasswordForm>({ mode: "onBlur" });
  const mfaForm = useForm<MFAForm>({ mode: "onBlur" });

  const attemptPayload = useMemo(
    () => (validatedEmail ? getAttemptPayload(validatedEmail) : null),
    [validatedEmail, step]
  );

  const mfaAttemptPayload = useMemo(
    () => (validatedEmail ? getMFAAttemptPayload(validatedEmail) : null),
    [validatedEmail, step]
  );

  const isLocked = useMemo(
    () =>
      !!(
        attemptPayload?.lockedUntil && Date.now() < attemptPayload.lockedUntil
      ),
    [attemptPayload]
  );

  const isMFALocked = useMemo(
    () =>
      !!(
        mfaAttemptPayload?.lockedUntil &&
        Date.now() < mfaAttemptPayload.lockedUntil
      ),
    [mfaAttemptPayload]
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!passwordExpiredEmail) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate("/auth/secure-password-change");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [passwordExpiredEmail, navigate]);

  const validateEmail = async (data: EmailValidationForm) => {
    setIsLoading(true);
    setLoginError(null);

    try {
      const email = data.email.trim().toLowerCase();
      if (!email) throw new Error("Email is required");

      const payload = getAttemptPayload(email);
      if (payload?.lockedUntil && Date.now() < payload.lockedUntil) {
        const minutes = Math.ceil((payload.lockedUntil - Date.now()) / 60000);
        setLoginError(
          `Too many failed attempts. Try again in ~${minutes} minute(s).`
        );
        setIsLoading(false);
        return;
      }

      setValidatedEmail(email);
      setStep("password");
    } catch (err: any) {
      setLoginError(
        err?.message || "Error validating email. Please try again."
      );
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
        setLoginError(
          `Too many failed attempts. Try again in ~${minutes} minute(s).`
        );
        setIsLoading(false);
        return;
      }

      const password = data.password || "";
      if (password.length < MIN_PASSWORD_LENGTH) {
        setLoginError(
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
        );
        setIsLoading(false);
        return;
      }

      const result = await login({ email, password });

      if (result.requiresMFA && result.email) {
        setValidatedEmail(result.email);
        setStep("mfa");
        resetAttempts(email);
        resetMFAAttempts(email); // Fresh MFA session
      } else {
        resetAttempts(email);
        navigate("/dashboard");
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (
        errorMessage.includes("PASSWORD_EXPIRED") ||
        errorMessage.includes("password has expired")
      ) {
        setPasswordExpiredEmail(email);
        setCountdown(5);
        return;
      }

      const payload = recordFailedAttempt(email);

      if (payload.lockedUntil && Date.now() < payload.lockedUntil) {
        const minutes = Math.ceil((payload.lockedUntil - Date.now()) / 60000);
        setLoginError(
          `Too many failed attempts. Locked out for ${minutes} minute(s).`
        );
        setIsLoading(false);
        return;
      }

      const attemptsRemaining = payload.attempts
        ? Math.max(0, MAX_FAILED_ATTEMPTS - payload.attempts)
        : MAX_FAILED_ATTEMPTS - 1;
      setLoginError(
        err instanceof Error
          ? err.message
          : `Invalid credentials. ${attemptsRemaining} attempt(s) remaining.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onMFASubmit = async (data: MFAForm) => {
    if (isLoading || isMFALocked) return;
    setIsLoading(true);
    setLoginError(null);

    try {
      await verifyMFA({ email: validatedEmail, code: data.totpCode });
      resetMFAAttempts(validatedEmail);
      navigate("/dashboard");
    } catch (err: any) {
      const payload = recordMFAFailedAttempt(validatedEmail);

      if (payload.lockedUntil && Date.now() < payload.lockedUntil) {
        const minutes = Math.ceil((payload.lockedUntil - Date.now()) / 60000);
        setLoginError(
          `Too many MFA attempts. Try again in ${minutes} minute(s).`
        );
        setIsLoading(false);
        return;
      }

      const attemptsLeft = Math.max(0, MAX_MFA_ATTEMPTS - payload.attempts);
      setLoginError(`Invalid code. ${attemptsLeft} attempt(s) left.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resending || isLoading) return;
    setResending(true);
    setLoginError(null);

    try {
      await resendMFA({ email: validatedEmail });
      setLoginError("New code sent! Check your app.");
      mfaForm.reset();
    } catch (err: any) {
      setLoginError(
        err instanceof Error ? err.message : "Failed to resend code"
      );
    } finally {
      setResending(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setValidatedEmail("");
    setLoginError(null);
    passwordForm.reset();
  };

  const handleBackToPassword = () => {
    setStep("password");
    setLoginError(null);
    mfaForm.reset();
  };

  const handleSkipCountdown = () => {
    navigate("/auth/secure-password-change");
  };

  /* ======================== LAYOUT ======================== */
  return (
    <>
      {passwordExpiredEmail && (
        <div className="mb-6 p-6 bg-amber-50 border border-amber-300 rounded-lg">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">
                Password Expired
              </h3>
              <p className="text-amber-800 text-sm mb-4">
                Redirecting in{" "}
                <span className="font-bold text-lg">{countdown}</span> second
                {countdown !== 1 ? "s" : ""}.
              </p>
              <button
                type="button"
                onClick={handleSkipCountdown}
                className="inline-block px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded transition-colors text-sm"
              >
                Go now
              </button>
            </div>
          </div>
        </div>
      )}

      {!passwordExpiredEmail && loginError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 text-sm">{loginError}</p>
        </div>
      )}

      {/* EMAIL STEP */}
      {!passwordExpiredEmail && step === "email" && (
        <form
          onSubmit={emailForm.handleSubmit(validateEmail)}
          className="space-y-6"
          autoComplete="off"
        >
          <div>
            <label
              htmlFor="email"
              className="block font-medium text-slate-400 mb-2"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`w-full px-4 py-3 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                emailForm.formState.errors.email
                  ? "border-red-300"
                  : "border-slate-300"
              }`}
              placeholder="Enter your email"
              {...emailForm.register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
            />
            {emailForm.formState.errors.email && (
              <p className="mt-2 text-sm text-red-600">
                {emailForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="text-center">
            <a
              href="/forgot-password"
              className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              Forgot your password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Checking...
              </>
            ) : (
              "Continue"
            )}
          </button>
        </form>
      )}

      {/* PASSWORD STEP */}
      {!passwordExpiredEmail && step === "password" && (
        <form
          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
          className="space-y-6"
          autoComplete="off"
        >
          <div>
            <label
              htmlFor="email-display"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Email address
            </label>
            <div className="relative">
              <input
                id="email-display"
                type="email"
                value={validatedEmail}
                disabled
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleBackToEmail}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-600 hover:text-slate-900 p-2 transition-colors"
                title="Change email"
              >
                <ArrowLeft size={18} />
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className={`w-full px-4 py-3 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  passwordForm.formState.errors.password
                    ? "border-red-300"
                    : "border-slate-300"
                }`}
                placeholder="Enter your password"
                {...passwordForm.register("password", {
                  required: "Password is required",
                  minLength: {
                    value: MIN_PASSWORD_LENGTH,
                    message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
                  },
                })}
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {passwordForm.formState.errors.password && (
              <p className="mt-2 text-sm text-red-600">
                {passwordForm.formState.errors.password.message}
              </p>
            )}
          </div>

          {isLocked && attemptPayload?.lockedUntil && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-sm text-yellow-800">
                Too many failed attempts. Locked until{" "}
                <strong>
                  {new Date(attemptPayload.lockedUntil).toLocaleTimeString()}
                </strong>
                .
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isLocked}
            className="w-full py-3 px-4 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      )}

      {/* MFA STEP */}
      {!passwordExpiredEmail && step === "mfa" && (
        <form
          onSubmit={mfaForm.handleSubmit(onMFASubmit)}
          className="space-y-6"
          autoComplete="off"
        >
          <div>
            <label
              htmlFor="totp"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Verification Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Smartphone className="h-5 w-5 text-slate-500" />
              </div>
              <input
                id="totp"
                type="text"
                autoComplete="one-time-code"
                className={`block w-full pl-10 pr-3 py-3 border rounded-lg text-slate-900 placeholder-slate-400 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  mfaForm.formState.errors.totpCode
                    ? "border-red-300"
                    : "border-slate-300"
                }`}
                placeholder="000000"
                maxLength={6}
                {...mfaForm.register("totpCode", {
                  required: "Code is required",
                  pattern: {
                    value: /^[0-9]{6}$/,
                    message: "6 digits required",
                  },
                })}
              />
            </div>
            <p className="mt-2 text-xs text-slate-600 text-center">
              Enter the 6-digit code from your authenticator app
            </p>
            {mfaForm.formState.errors.totpCode && (
              <p className="mt-2 text-sm text-red-600 text-center">
                {mfaForm.formState.errors.totpCode.message}
              </p>
            )}
          </div>

          {isMFALocked && mfaAttemptPayload?.lockedUntil && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-sm text-yellow-800">
                Too many attempts. Try again after{" "}
                <strong>
                  {new Date(mfaAttemptPayload.lockedUntil).toLocaleTimeString()}
                </strong>
                .
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isMFALocked}
            className="w-full py-3 px-4 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Code"
            )}
          </button>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending || isLoading || isMFALocked}
              className="flex items-center gap-2 text-teal-600 hover:text-teal-700 disabled:text-slate-400 text-sm"
            >
              <RefreshCw
                className={`w-4 h-4 ${resending ? "animate-spin" : ""}`}
              />
              Resend Code
            </button>
          </div>

          <button
            type="button"
            onClick={handleBackToPassword}
            className="w-full py-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"
          >
            Back to login
          </button>
        </form>
      )}
    </>
  );
};

export default Login;
