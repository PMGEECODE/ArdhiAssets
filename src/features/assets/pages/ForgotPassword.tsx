"use client";

import { useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "react-toastify";
import { Loader, CheckCircle, Mail, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../shared/components/ui/Button";
import Card from "../../../shared/components/ui/Card";

type ForgotPasswordForm = {
  email: string;
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>();
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.post(`${apiUrl}/auth/forgot-password`, data);
      setIsEmailSent(true);
      setSentEmail(data.email);
      toast.success("Reset link sent to your email.");
    } catch (error) {
      toast.error("Error sending reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOkay = () => {
    navigate("/login");
  };

  /* ------------------------------------------------------------------ */
  /* SUCCESS SCREEN – styled exactly like AdminUserPermissions cards    */
  /* ------------------------------------------------------------------ */
  if (isEmailSent) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-success-600 dark:text-success-400" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-primary-900 dark:text-primary-50">
              Check Your Email
            </h2>

            {/* Email */}
            <div className="text-center space-y-1">
              <p className="text-sm text-primary-600 dark:text-primary-400">
                We’ve sent a password-reset link to:
              </p>
              <p className="font-medium text-primary-800 dark:text-primary-200">
                {sentEmail}
              </p>
            </div>

            {/* Info box – same as the warning / success boxes in AdminUserPermissions */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-primary-700 dark:text-primary-300">
                Click the link in the email to create a new password. If you
                don’t see it, check your spam folder.
              </p>
            </div>

            {/* Button */}
            <Button
              onClick={handleOkay}
              variant="primary"
              fullWidth
              className="bg-accent-600 hover:bg-accent-700 focus:ring-accent-500"
            >
              Okay, Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="sticky top-0 bg-primary-50 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700 p-4 flex items-center space-x-2">
          <Mail className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          <h1 className="text-xl font-bold text-primary-900 dark:text-primary-50">
            Forgot Password
          </h1>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-center text-primary-600 dark:text-primary-400">
            Enter your email address and we’ll send you a link to reset your
            password.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-primary-700 dark:text-primary-300"
              >
                Email address
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`
                    block w-full px-3 py-2 rounded-md border
                    bg-primary-50 dark:bg-primary-800
                    text-primary-900 dark:text-primary-100
                    placeholder:text-primary-500 dark:placeholder:text-primary-500
                    focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500
                    transition-all duration-200
                    ${errors.email ? "border-error-300" : "border-primary-300"}
                  `}
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-error-600 dark:text-error-400">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              className="bg-accent-600 hover:bg-accent-700 focus:ring-accent-500"
            >
              {isLoading ? (
                <Loader className="animate-spin w-5 h-5" />
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          {/* Back to login – subtle link matching the admin UI */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center text-sm text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;
