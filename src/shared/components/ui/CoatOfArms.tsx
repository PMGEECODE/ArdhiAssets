import React from "react";
import coa from "../../../assets/coa-2.png";

interface CoatOfArmsProps {
  className?: string;
  height?: number | string;
}

const CoatOfArms: React.FC<CoatOfArmsProps> = ({
  className = "",
  height = 64,
}) => {
  return (
    <img
      src={coa}
      alt="Coat of Arms of Kenya"
      className={`object-contain ${className}`}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        width: "auto",
      }}
    />
  );
};

export default CoatOfArms;
