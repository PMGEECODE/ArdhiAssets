import type React from "react";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Clock, X, Shield, Lock, CheckCircle } from "lucide-react";
import { API_URL } from "../../../shared/config/constants";

interface PasswordStatusResponse {
  password_changed_at: string | null;
  requires_password_change: boolean;
  is_overdue: boolean;
  days_since_creation: number;
  days_since_password_change: number | null;
  deadline: string;
  days_until_deadline: number;
  message: string;
}

interface PasswordExpirationBannerProps {
  onNavigateToChange: () => void;
}

const BENEFITS = [
  { icon: Shield, text: "Enhanced security with regular password updates" },
  { icon: Lock, text: "Protect your account from unauthorized access" },
  { icon: CheckCircle, text: "Stay compliant with security best practices" },
  { icon: Shield, text: "Reduce risk of compromised credentials" },
];

const PasswordExpirationBanner: React.FC<PasswordExpirationBannerProps> = ({
  onNavigateToChange,
}) => {
  const [passwordStatus, setPasswordStatus] =
    useState<PasswordStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [currentBenefitIndex, setCurrentBenefitIndex] = useState(0);

  const hasFetched = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBenefitIndex((prev) => (prev + 1) % BENEFITS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchPasswordStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/dashboard/password-status`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setPasswordStatus(data);

          if (data.is_overdue) {
            onNavigateToChange();
          }
        }
      } catch (error) {
        console.error("Error fetching password status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPasswordStatus();

    const interval = setInterval(fetchPasswordStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !passwordStatus || dismissed) {
    return null;
  }

  const showBanner =
    passwordStatus.requires_password_change ||
    (passwordStatus.days_until_deadline > 0 &&
      passwordStatus.days_until_deadline <= 2);

  if (!showBanner) {
    return null;
  }

  const isExpired = passwordStatus.is_overdue;
  const isWarning =
    passwordStatus.days_until_deadline > 0 &&
    passwordStatus.days_until_deadline <= 2;
  const isNewAccount =
    passwordStatus.days_since_creation < 5 &&
    !passwordStatus.password_changed_at;

  const CurrentIcon = BENEFITS[currentBenefitIndex].icon;

  return (
    <div
      className={`w-full border-b transition-colors ${
        isExpired
          ? "bg-gradient-to-r from-red-50 to-red-100 border-red-200"
          : isWarning
          ? "bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200"
          : "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
      }`}
    >
      <div className="w-full px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div
              className={`flex-shrink-0 ${
                isExpired
                  ? "text-red-600"
                  : isWarning
                  ? "text-amber-600"
                  : "text-blue-600"
              }`}
            >
              {isExpired ? (
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={`text-sm sm:text-base font-semibold leading-tight ${
                  isExpired
                    ? "text-red-900"
                    : isWarning
                    ? "text-amber-900"
                    : "text-blue-900"
                }`}
              >
                {isExpired
                  ? "Password Expired"
                  : isNewAccount
                  ? `Set Your Password`
                  : `Password Expiring Soon`}
              </p>
              <p
                className={`text-xs sm:text-sm mt-0.5 ${
                  isExpired
                    ? "text-red-700"
                    : isWarning
                    ? "text-amber-700"
                    : "text-blue-700"
                }`}
              >
                {isExpired
                  ? "Change it immediately to continue"
                  : isNewAccount
                  ? `${passwordStatus.days_until_deadline} day(s) remaining`
                  : `${passwordStatus.days_until_deadline} day(s) until expiration`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
            <div
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0 flex-1 sm:flex-initial overflow-hidden"
              key={currentBenefitIndex}
            >
              <CurrentIcon
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${
                  isExpired
                    ? "text-red-600"
                    : isWarning
                    ? "text-amber-600"
                    : "text-blue-600"
                } animate-in fade-in slide-in-from-left-2 duration-500`}
              />
              <span
                className={`truncate sm:whitespace-normal font-medium ${
                  isExpired
                    ? "text-red-800"
                    : isWarning
                    ? "text-amber-800"
                    : "text-blue-800"
                } animate-in fade-in slide-in-from-right-2 duration-500`}
              >
                {BENEFITS[currentBenefitIndex].text}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onNavigateToChange}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md shadow-sm transition-all hover:shadow-md active:scale-95 whitespace-nowrap ${
                  isExpired
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : isWarning
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Change Now
              </button>

              {!isExpired && (
                <button
                  onClick={() => setDismissed(true)}
                  className={`p-1.5 rounded-md transition-all hover:shadow-sm active:scale-95 ${
                    isWarning
                      ? "text-amber-700 hover:bg-amber-200"
                      : "text-blue-700 hover:bg-blue-200"
                  }`}
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordExpirationBanner;
