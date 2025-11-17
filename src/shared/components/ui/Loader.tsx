import React from "react";

const Loader: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="w-16 h-16 border-4 border-t-4 border-primary-900 rounded-full animate-spin"></div>
    </div>
  );
};

export default Loader;
