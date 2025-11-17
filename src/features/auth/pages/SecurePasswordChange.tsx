"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../../shared/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../shared/components/ui/Card";
import Input from "../../../shared/components/ui/Input";
import { Alert, AlertDescription } from "../../../shared/components/ui/Alert";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader,
} from "lucide-react";
import { API_URL } from "../../../shared/config/constants";

// type Step = "otp" | "password" | "success";

// export default function SecurePasswordChange() {
//   const navigate = useNavigate();
//   const [searchParams] = useSearchParams();

//   const emailFromParam = searchParams.get("email");

//   const [step, setStep] = useState<Step>("otp");
//   const [otp, setOtp] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [message, setMessage] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [otpSent, setOtpSent] = useState(false);

//   function obfuscateEmail(email: string): string {
//     if (!email || email.length < 5) return email;
//     const [localPart, domain] = email.split("@");
//     if (!domain) return email;
//     const visibleChars = Math.ceil(localPart.length / 3);
//     const obfuscated =
//       localPart.slice(0, visibleChars) +
//       "*".repeat(Math.max(1, localPart.length - visibleChars));
//     return `${obfuscated}@${domain}`;
//   }

//   useEffect(() => {
//     if (!emailFromParam) {
//       setError("No email provided. Please login again to proceed.");
//       const timer = setTimeout(() => navigate("/login"), 3000);
//       return () => clearTimeout(timer);
//     }
//   }, [emailFromParam, navigate]);

//   useEffect(() => {
//     if (emailFromParam && !otpSent) {
//       initiateOtpSending();
//     }
//   }, [emailFromParam, otpSent]);

//   // ✅ Initiate OTP sending
//   const initiateOtpSending = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(
//         `${API_URL}/auth/secure-password-change/initiate`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ email: emailFromParam }),
//         }
//       );

//       if (!response.ok) {
//         const data = await response.json();
//         throw new Error(data.detail || "Failed to send OTP");
//       }

//       setMessage("OTP sent to your email");
//       setError("");
//       setOtpSent(true);
//     } catch (err) {
//       const errorMsg =
//         err instanceof Error
//           ? err.message
//           : "Failed to send OTP. Please try again.";
//       setError(errorMsg);
//       console.error("[SecurePasswordChange] OTP initiation error:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ✅ Verify OTP and change password
//   const handleVerifyAndChange = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");

//     if (!otp || otp.length !== 6) {
//       setError("Please enter a valid 6-digit OTP");
//       return;
//     }

//     if (!newPassword || !confirmPassword) {
//       setError("Please fill in all password fields");
//       return;
//     }

//     if (newPassword !== confirmPassword) {
//       setError("Passwords do not match");
//       return;
//     }

//     if (newPassword.length < 8) {
//       setError("Password must be at least 8 characters");
//       return;
//     }

//     setLoading(true);

//     try {
//       const response = await fetch(
//         `${API_URL}/auth/secure-password-change/verify`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             email: emailFromParam,
//             otp,
//             new_password: newPassword,
//             confirm_password: confirmPassword,
//           }),
//         }
//       );

//       if (!response.ok) {
//         const data = await response.json();
//         throw new Error(data.detail || "Failed to change password");
//       }

//       setStep("success");
//       setError("");
//     } catch (err) {
//       const errorMsg =
//         err instanceof Error ? err.message : "Failed to change password";
//       setError(errorMsg);
//       console.error("[SecurePasswordChange] Password change error:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLoginRedirect = () => {
//     navigate("/login");
//   };

//   // ✅ Resend OTP
//   const handleResendOtp = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const response = await fetch(
//         `${API_URL}/auth/secure-password-change/initiate`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ email: emailFromParam }),
//         }
//       );

//       if (!response.ok) {
//         const data = await response.json();
//         throw new Error(data.detail || "Failed to resend OTP");
//       }

//       setMessage("OTP resent to your email");
//       setError("");
//     } catch (err) {
//       const errorMsg =
//         err instanceof Error
//           ? err.message
//           : "Failed to resend OTP. Please try again.";
//       setError(errorMsg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ✅ UI rendering
//   if (!emailFromParam) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
//         <Card className="w-full max-w-md">
//           <CardHeader>
//             <CardTitle>Invalid Request</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <Alert variant="destructive" className="mb-4">
//               <AlertCircle className="h-4 w-4" />
//               <AlertDescription>
//                 No email provided. Please login again to proceed.
//               </AlertDescription>
//             </Alert>
//             <Button onClick={() => navigate("/login")} className="w-full">
//               Back to Login
//             </Button>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
//       <Card className="w-full max-w-md">
//         <CardHeader>
//           <CardTitle>Secure Password Change</CardTitle>
//           <CardDescription>
//             {step === "success"
//               ? "Password changed successfully"
//               : "Verify your identity and set a new password"}
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           {error && (
//             <Alert variant="destructive" className="mb-4">
//               <AlertCircle className="h-4 w-4" />
//               <AlertDescription>{error}</AlertDescription>
//             </Alert>
//           )}

//           {message && step !== "success" && (
//             <Alert className="mb-4 border-green-200 bg-green-50">
//               <CheckCircle2 className="h-4 w-4 text-green-600" />
//               <AlertDescription className="text-green-800">
//                 OTP sent to {obfuscateEmail(emailFromParam)}
//               </AlertDescription>
//             </Alert>
//           )}

//           {step === "success" && (
//             <div className="text-center space-y-4">
//               <div className="flex justify-center">
//                 <CheckCircle2 className="h-12 w-12 text-green-600" />
//               </div>
//               <div className="space-y-2">
//                 <p className="text-sm text-muted-foreground">
//                   Your password has been changed successfully.
//                 </p>
//                 <p className="text-sm text-muted-foreground">
//                   You can now login with your new password.
//                 </p>
//               </div>
//               <Button onClick={handleLoginRedirect} className="w-full">
//                 Go to Login
//               </Button>
//             </div>
//           )}

//           {step === "otp" && (
//             <form
//               onSubmit={(e) => {
//                 e.preventDefault();
//                 setStep("password");
//               }}
//               className="space-y-4"
//             >
//               <div className="space-y-2">
//                 <label className="text-sm font-medium">Enter OTP</label>
//                 <Input
//                   type="text"
//                   placeholder="000000"
//                   value={otp}
//                   onChange={(e) =>
//                     setOtp(e.target.value.slice(0, 6).replace(/\D/g, ""))
//                   }
//                   maxLength={6}
//                   required
//                   className="text-center text-lg tracking-widest font-mono"
//                   autoFocus
//                   disabled={loading}
//                 />
//                 <p className="text-xs text-muted-foreground">
//                   Check your email for the 6-digit OTP
//                 </p>
//               </div>
//               <Button
//                 type="submit"
//                 className="w-full"
//                 disabled={!otp || otp.length !== 6 || loading}
//               >
//                 {loading ? (
//                   <>
//                     <Loader className="h-4 w-4 mr-2 animate-spin" />
//                     Verifying...
//                   </>
//                 ) : (
//                   "Continue to Password"
//                 )}
//               </Button>
//               <Button
//                 type="button"
//                 variant="outline"
//                 className="w-full bg-transparent"
//                 onClick={handleResendOtp}
//                 disabled={loading}
//               >
//                 Resend OTP
//               </Button>
//               <Button
//                 type="button"
//                 variant="ghost"
//                 className="w-full"
//                 onClick={() => navigate("/login")}
//               >
//                 <ArrowLeft className="h-4 w-4 mr-2" />
//                 Back to Login
//               </Button>
//             </form>
//           )}

//           {step === "password" && (
//             <form onSubmit={handleVerifyAndChange} className="space-y-4">
//               <div className="space-y-2">
//                 <label className="text-sm font-medium">New Password</label>
//                 <div className="relative">
//                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
//                   <Input
//                     type={showPassword ? "text" : "password"}
//                     placeholder="At least 8 characters"
//                     value={newPassword}
//                     onChange={(e) => setNewPassword(e.target.value)}
//                     required
//                     className="pl-10"
//                     disabled={loading}
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword(!showPassword)}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
//                   >
//                     {showPassword ? "Hide" : "Show"}
//                   </button>
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <label className="text-sm font-medium">Confirm Password</label>
//                 <div className="relative">
//                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
//                   <Input
//                     type={showConfirmPassword ? "text" : "password"}
//                     placeholder="Confirm your password"
//                     value={confirmPassword}
//                     onChange={(e) => setConfirmPassword(e.target.value)}
//                     required
//                     className="pl-10"
//                     disabled={loading}
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
//                   >
//                     {showConfirmPassword ? "Hide" : "Show"}
//                   </button>
//                 </div>
//               </div>

//               {newPassword &&
//                 confirmPassword &&
//                 newPassword !== confirmPassword && (
//                   <Alert className="border-yellow-200 bg-yellow-50">
//                     <AlertCircle className="h-4 w-4 text-yellow-600" />
//                     <AlertDescription className="text-yellow-800 text-sm">
//                       Passwords do not match
//                     </AlertDescription>
//                   </Alert>
//                 )}

//               <Button type="submit" className="w-full" disabled={loading}>
//                 {loading ? (
//                   <>
//                     <Loader className="h-4 w-4 mr-2 animate-spin" />
//                     Changing Password...
//                   </>
//                 ) : (
//                   "Change Password"
//                 )}
//               </Button>
//               <Button
//                 type="button"
//                 variant="outline"
//                 className="w-full bg-transparent"
//                 onClick={() => setStep("otp")}
//                 disabled={loading}
//               >
//                 <ArrowLeft className="h-4 w-4 mr-2" />
//                 Back
//               </Button>
//             </form>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }



type Step = "otp" | "password" | "success";

export default function SecurePasswordChange() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailFromParam = searchParams.get("email");

  const [step, setStep] = useState<Step>("otp");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  function obfuscateEmail(email: string): string {
    if (!email || email.length < 5) return email;
    const [localPart, domain] = email.split("@");
    if (!domain) return email;
    const visibleChars = Math.ceil(localPart.length / 3);
    const obfuscated =
      localPart.slice(0, visibleChars) +
      "*".repeat(Math.max(1, localPart.length - visibleChars));
    return `${obfuscated}@${domain}`;
  }

  useEffect(() => {
    if (!emailFromParam) {
      setError("No email provided. Please login again to proceed.");
      const timer = setTimeout(() => navigate("/login"), 3000);
      return () => clearTimeout(timer);
    }
  }, [emailFromParam, navigate]);

  useEffect(() => {
    if (emailFromParam && !otpSent) {
      initiateOtpSending();
    }
  }, [emailFromParam, otpSent]);

  const initiateOtpSending = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/auth/secure-password-change/initiate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailFromParam }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to send OTP");
      }

      setMessage("OTP sent to your email");
      setError("");
      setOtpSent(true);
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Failed to send OTP. Please try again.";
      setError(errorMsg);
      console.error("[SecurePasswordChange] OTP initiation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/secure-password-change/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailFromParam,
            otp,
            new_password: newPassword,
            confirm_password: confirmPassword,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to change password");
      }

      setStep("success");
      setError("");
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to change password";
      setError(errorMsg);
      console.error("[SecurePasswordChange] Password change error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate("/login");
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/auth/secure-password-change/initiate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailFromParam }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to resend OTP");
      }

      setMessage("OTP resent to your email");
      setError("");
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Failed to resend OTP. Please try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!emailFromParam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <Card className="w-full max-w-sm sm:max-w-md shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl sm:text-2xl">
              Invalid Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                No email provided. Please login again to proceed.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate("/login")} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <Card className="w-full max-w-sm sm:max-w-md shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl sm:text-2xl">
            Secure Password Change
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {step === "success"
              ? "Password changed successfully"
              : "Verify your identity and set a new password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <AlertDescription className="text-xs sm:text-sm">
                  {error}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {message && step !== "success" && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-600" />
                <AlertDescription className="text-green-800 text-xs sm:text-sm">
                  OTP sent to {obfuscateEmail(emailFromParam)}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {step === "success" && (
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-green-600" />
              </div>
              <div className="space-y-2">
                <p className="text-sm sm:text-base text-gray-600">
                  Your password has been changed successfully.
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  You can now login with your new password.
                </p>
              </div>
              <Button onClick={handleLoginRedirect} className="w-full mt-6">
                Go to Login
              </Button>
            </div>
          )}

          {step === "otp" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep("password");
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium block">
                  Enter OTP
                </label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.slice(0, 6).replace(/\D/g, ""))
                  }
                  maxLength={6}
                  required
                  className="text-center text-base sm:text-lg tracking-widest font-mono"
                  autoFocus
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  Check your email for the 6-digit OTP
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!otp || otp.length !== 6 || loading}
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    <span className="text-sm">Verifying...</span>
                  </>
                ) : (
                  <span className="text-sm">Continue to Password</span>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendOtp}
                disabled={loading}
              >
                <span className="text-sm">Resend OTP</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/login")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="text-sm">Back to Login</span>
              </Button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleVerifyAndChange} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium block">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="pl-10 pr-16 text-sm"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10 pr-16 text-sm"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {newPassword &&
                confirmPassword &&
                newPassword !== confirmPassword && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-600" />
                      <AlertDescription className="text-yellow-800 text-xs sm:text-sm">
                        Passwords do not match
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    <span className="text-sm">Changing Password...</span>
                  </>
                ) : (
                  <span className="text-sm">Change Password</span>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setStep("otp")}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="text-sm">Back</span>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
