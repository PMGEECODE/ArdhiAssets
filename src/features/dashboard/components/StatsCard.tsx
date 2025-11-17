import type React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import Sparkline from "../../../shared/components/ui/Sparkline";

interface StatsCardProps {
  title: string;
  value: number;
  trend: number;
  subtitle: string;
  sparklineData: number[];
  icon: React.ReactNode;
  bgColor: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  trend,
  subtitle,
  sparklineData,
  icon,
  bgColor,
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${bgColor} p-4 sm:p-6 text-white shadow-lg transition-transform hover:scale-105`}
    >
      <div className="absolute top-3 left-3 p-2 rounded-full bg-white/20">
        {icon}
      </div>
      <div className="mt-12 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{title}</h3>
          <div className="flex items-center gap-1 text-xs font-semibold">
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        </div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-white/80">{subtitle}</p>
        <div className="mt-2">
          <Sparkline data={sparklineData} height={30} />
        </div>
      </div>
    </div>
  );
};
