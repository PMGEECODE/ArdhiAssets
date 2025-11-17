import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  User,
  Mail,
  Lock,
  Shield,
  Phone,
  Building2,
  ArrowLeft,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";
import Button from "../../../../shared/components/ui/Button";

const roles = [
  { value: "admin", label: "Administrator", description: "Full system access" },
  { value: "user", label: "User", description: "Standard user access" },
];

const AddUser = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    personal_number: "",
    department: "",
    role: "",
    password: "",
    confirmPassword: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isValidForm =
    formData.first_name &&
    formData.last_name &&
    formData.username &&
    formData.email &&
    formData.personal_number &&
    formData.department &&
    formData.role &&
    formData.password &&
    formData.password === formData.confirmPassword &&
    formData.password.length >= 8;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          username: formData.username,
          email: formData.email,
          personal_number: formData.personal_number,
          department: formData.department,
          role: formData.role,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create user");
      }

      toast.success("User created successfully!");
      navigate("/admin/users");
    } catch (err) {
      console.error("Error creating user:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 border border-primary-200 dark:border-primary-700 rounded-lg focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100 placeholder:text-primary-500 dark:placeholder:text-primary-500 transition-all duration-200";
  const labelClass =
    "block text-sm font-medium text-primary-900 dark:text-primary-100 mb-2";

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900 transition-colors duration-200">
      <div className="sticky top-0 z-40 bg-primary-50 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/admin/users")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Users</span>
              </Button>
              <div className="h-6 w-px bg-primary-300 dark:bg-primary-700" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 dark:text-primary-50 flex items-center space-x-3">
                  <UserPlus className="w-8 h-8 text-accent-600 dark:text-accent-400" />
                  <span>Create New User</span>
                </h1>
                <p className="mt-1 text-sm text-primary-600 dark:text-primary-400">
                  Add a new user to the system with appropriate permissions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-primary-900 rounded-xl shadow-sm border border-primary-200 dark:border-primary-700 overflow-hidden transition-colors duration-200">
          <div className="px-6 py-4 border-b border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-800 transition-colors duration-200">
            <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50">
              User Information
            </h2>
            <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
              Please fill in all required fields to create a new user account
            </p>
          </div>

          <form
            className="p-6 sm:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              if (isValidForm) handleCreateUser();
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-primary-900 dark:text-primary-100 mb-4 flex items-center space-x-2">
                    <User className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                    <span>Personal Information</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="first_name" className={labelClass}>
                        First Name *
                      </label>
                      <input
                        id="first_name"
                        type="text"
                        name="first_name"
                        placeholder="Enter first name"
                        className={inputClass}
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="last_name" className={labelClass}>
                        Last Name *
                      </label>
                      <input
                        id="last_name"
                        type="text"
                        name="last_name"
                        placeholder="Enter last name"
                        className={inputClass}
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="personal_number" className={labelClass}>
                      <Phone className="w-4 h-4 inline mr-1" />
                      Personal Number *
                    </label>
                    <input
                      id="personal_number"
                      type="text"
                      name="personal_number"
                      placeholder="Enter personal/phone number"
                      className={inputClass}
                      value={formData.personal_number}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="department" className={labelClass}>
                      <Building2 className="w-4 h-4 inline mr-1" />
                      Department *
                    </label>
                    <input
                      id="department"
                      type="text"
                      name="department"
                      placeholder="Enter department name"
                      className={inputClass}
                      value={formData.department}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-primary-900 dark:text-primary-100 mb-4 flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                    <span>Account Information</span>
                  </h3>

                  <div className="mb-4">
                    <label htmlFor="username" className={labelClass}>
                      Username *
                    </label>
                    <input
                      id="username"
                      type="text"
                      name="username"
                      placeholder="Enter username"
                      className={inputClass}
                      value={formData.username}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="email" className={labelClass}>
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email Address *
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      placeholder="Enter email address"
                      className={inputClass}
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="role" className={labelClass}>
                      <Shield className="w-4 h-4 inline mr-1" />
                      Role *
                    </label>
                    <select
                      id="role"
                      name="role"
                      className={inputClass}
                      value={formData.role}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Role</option>
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label} - {role.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-primary-200 dark:border-primary-700 transition-colors duration-200">
              <h3 className="text-lg font-medium text-primary-900 dark:text-primary-100 mb-4 flex items-center space-x-2">
                <Lock className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                <span>Security</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className={labelClass}>
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter password (min. 8 characters)"
                      className={inputClass}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors duration-200"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {formData.password && formData.password.length < 8 && (
                    <p className="mt-1 text-sm text-error-600 dark:text-error-400">
                      Password must be at least 8 characters
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className={labelClass}>
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm password"
                      className={inputClass}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors duration-200"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {formData.password &&
                    formData.confirmPassword &&
                    formData.password !== formData.confirmPassword && (
                      <p className="mt-1 text-sm text-error-600 dark:text-error-400">
                        Passwords do not match
                      </p>
                    )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-primary-200 dark:border-primary-700 transition-colors duration-200">
              <div className="flex flex-col sm:flex-row gap-4 sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto px-8 py-3"
                  onClick={() => navigate("/admin/users")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full sm:w-auto px-8 py-3 flex items-center justify-center space-x-2"
                  disabled={!isValidForm || submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating User...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create User</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="mt-6 bg-accent-50 dark:bg-accent-950 border border-accent-200 dark:border-accent-800 rounded-lg p-4 transition-colors duration-200">
          <h4 className="text-sm font-medium text-accent-900 dark:text-accent-300 mb-2">
            Password Requirements
          </h4>
          <ul className="text-sm text-accent-800 dark:text-accent-400 space-y-1">
            <li>• Minimum 8 characters long</li>
            <li>• Must match confirmation password</li>
            <li>• User will be required to change password on first login</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AddUser;
