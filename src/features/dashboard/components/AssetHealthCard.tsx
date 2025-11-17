import type React from "react";
import Card from "../../../shared/components/ui/Card";
import { CheckCircle, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { Bar } from "react-chartjs-2";

interface AssetHealthCardProps {
  totalAssets: number;
  assetHealthData: {
    labels: string[];
    datasets: any[];
  };
  assetHealthChartOptions: any;
}

export const AssetHealthCard: React.FC<AssetHealthCardProps> = ({
  totalAssets,
  assetHealthData,
  assetHealthChartOptions,
}) => {
  return (
    <Card title="Asset Health Overview" className="lg:col-span-2 p-4 sm:p-6">
      <div className="space-y-3 sm:space-y-4">
        <div className="h-40 sm:h-48 md:h-64">
          {assetHealthData.labels.length > 0 ? (
            <Bar data={assetHealthData} options={assetHealthChartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-xs sm:text-sm">
                Loading asset health data...
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200">
          <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle size={12} className="text-white sm:w-4 sm:h-4" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-green-800">
              Excellent
            </p>
            <p className="text-sm sm:text-lg font-bold text-green-900">
              {Math.floor(totalAssets * 0.4)}
            </p>
          </div>

          <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 bg-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp size={12} className="text-white sm:w-4 sm:h-4" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-blue-800">Good</p>
            <p className="text-sm sm:text-lg font-bold text-blue-900">
              {Math.floor(totalAssets * 0.35)}
            </p>
          </div>

          <div className="text-center p-2 sm:p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 bg-amber-500 rounded-full flex items-center justify-center">
              <Clock size={12} className="text-white sm:w-4 sm:h-4" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-amber-800">
              Fair
            </p>
            <p className="text-sm sm:text-lg font-bold text-amber-900">
              {Math.floor(totalAssets * 0.2)}
            </p>
          </div>

          <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle size={12} className="text-white sm:w-4 sm:h-4" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-red-800">Poor</p>
            <p className="text-sm sm:text-lg font-bold text-red-900">
              {Math.floor(totalAssets * 0.05)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
