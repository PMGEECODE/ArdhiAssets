// src/pages/ResetPassword.tsx

import { useForm } from "react-hook-form";
import axios from "axios";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "../../../shared/components/ui/Button";
import { Loader } from "lucide-react";

type ResetForm = {
  newPassword: string;
  confirmPassword: string;
};

const ResetPassword = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetForm>();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      toast.error("Reset token is missing or invalid.");
      navigate("/login");
    }
  }, [token, navigate]);

  const onSubmit = async (data: ResetForm) => {
    if (!token) return;

    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await axios.post(`${apiUrl}/auth/reset-password`, {
        token,
        newPassword: data.newPassword,
      });

      toast.success("Password reset successful. You can now log in.");
      navigate("/login");
    } catch (error) {
      toast.error("Failed to reset password. Link may be expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-semibold text-center text-primary-800">
        Reset your password
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
        <div>
          <label className="block text-sm font-medium text-primary-700">
            New Password
          </label>
          <input
            type="password"
            {...register("newPassword", {
              required: "New password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm 
              focus:outline-none focus:ring-accent-500 focus:border-accent-500 sm:text-sm
              ${
                errors.newPassword ? "border-error-300" : "border-primary-300"
              }`}
          />
          {errors.newPassword && (
            <p className="mt-1 text-sm text-error-600">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-primary-700">
            Confirm Password
          </label>
          <input
            type="password"
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: (value) =>
                value === watch("newPassword") || "Passwords do not match",
            })}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm 
              focus:outline-none focus:ring-accent-500 focus:border-accent-500 sm:text-sm
              ${
                errors.confirmPassword
                  ? "border-error-300"
                  : "border-primary-300"
              }`}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-error-600">
              {errors.confirmPassword.message}
            </p>
          )}
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
            "Reset Password"
          )}
        </Button>
      </form>
    </div>
  );
};

export default ResetPassword;
