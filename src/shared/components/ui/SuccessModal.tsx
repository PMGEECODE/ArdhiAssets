import React from "react";
import Button from "./Button";

interface SuccessModalProps {
  message?: string;
  onClose: () => void;
  title?: string;
  buttonLabel?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  message = "Operation completed successfully.",
  onClose,
  title = "Success!",
  buttonLabel = "Close",
}) => {
  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
      <div className="p-6 w-full max-w-sm text-center bg-white rounded-lg shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-green-600">{title}</h2>
        <p className="mb-6">{message}</p>
        <Button variant="primary" onClick={onClose}>
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
};

export default SuccessModal;
