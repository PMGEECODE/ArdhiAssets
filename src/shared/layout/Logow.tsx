import React from "react";
import { Database } from "lucide-react";

const Logo: React.FC = () => {
  return (
    <div className="flex items-center space-x-2">
      <Database size={24} className="text-accent-500" />
      <span className="text-lg font-bold text-white">DeviceMS</span>
    </div>
  );
};

export default Logo;
