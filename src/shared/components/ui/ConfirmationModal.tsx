"use client";

import React, { useEffect, useRef } from "react";
import { X, AlertTriangle, Info, CircleCheck } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "warning" | "danger" | "info" | "success";
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
    }
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          icon: AlertTriangle,
          iconColor: "text-error-600 dark:text-error-400",
          accentBar: "bg-error-600",
          confirmButton:
            "bg-error-600 hover:bg-error-700 text-white dark:bg-error-700 dark:hover:bg-error-600",
          messageBg: "bg-error-50 dark:bg-primary-800",
          messageBorder: "border-error-200 dark:border-error-800",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          iconColor: "text-warning-600 dark:text-warning-400",
          accentBar: "bg-warning-600",
          confirmButton:
            "bg-warning-600 hover:bg-warning-700 text-white dark:bg-warning-700 dark:hover:bg-warning-600",
          messageBg: "bg-warning-50 dark:bg-primary-800",
          messageBorder: "border-warning-200 dark:border-warning-800",
        };
      case "info":
        return {
          icon: Info,
          iconColor: "text-accent-600 dark:text-accent-400",
          accentBar: "bg-accent-600",
          confirmButton:
            "bg-accent-600 hover:bg-accent-700 text-white dark:bg-accent-700 dark:hover:bg-accent-600",
          messageBg: "bg-accent-50 dark:bg-primary-800",
          messageBorder: "border-accent-200 dark:border-accent-800",
        };
      case "success":
        return {
          icon: CircleCheck,
          iconColor: "text-success-600 dark:text-success-400",
          accentBar: "bg-success-600",
          confirmButton:
            "bg-success-600 hover:bg-success-700 text-white dark:bg-success-700 dark:hover:bg-success-600",
          messageBg: "bg-success-50 dark:bg-primary-800",
          messageBorder: "border-success-200 dark:border-success-800",
        };
      default:
        return {
          icon: AlertTriangle,
          iconColor: "text-warning-600 dark:text-warning-400",
          accentBar: "bg-warning-600",
          confirmButton:
            "bg-warning-600 hover:bg-warning-700 text-white dark:bg-warning-700 dark:hover:bg-warning-600",
          messageBg: "bg-warning-50 dark:bg-primary-800",
          messageBorder: "border-warning-200 dark:border-warning-800",
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md overflow-hidden bg-white dark:bg-primary-900 rounded-xl shadow-2xl border border-primary-200 dark:border-primary-700 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent Bar + Icon Header */}
        <div className="relative p-6 pb-8">
          <div
            className={`absolute left-0 top-0 h-1 w-full ${styles.accentBar}`}
          />
          <div className="flex flex-col items-center text-center space-y-3">
            <div
              className={`p-3 rounded-full bg-opacity-10 ${styles.messageBg} border ${styles.messageBorder}`}
            >
              <Icon className={`w-6 h-6 ${styles.iconColor}`} />
            </div>
            <h3
              id="modal-title"
              className="text-lg font-semibold text-primary-900 dark:text-primary-50"
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-primary-500 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div
          className={`px-6 pb-6 ${styles.messageBg} border-t ${styles.messageBorder}`}
        >
          <p className="text-sm text-primary-700 dark:text-primary-300 text-center leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 bg-primary-50 dark:bg-primary-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300 bg-white dark:bg-primary-700 border border-primary-300 dark:border-primary-600 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-600 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-all ${styles.confirmButton} shadow-sm hover:shadow-md active:scale-95`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
