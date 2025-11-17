import type React from "react";
import Card from "../../../shared/components/ui/Card";
import { Bar } from "react-chartjs-2";

interface AssetOverviewData {
  category: string;
  total: number;
  recent: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface AssetOverviewCardProps {
  assetOverviewData: AssetOverviewData[];
  assetOverviewChartData: any;
  assetOverviewChartOptions: any;
}

export const AssetOverviewCard: React.FC<AssetOverviewCardProps> = ({
  assetOverviewData,
  assetOverviewChartData,
  assetOverviewChartOptions,
}) => {
  return (
    <Card title="Asset Overview - All Categories" className="w-full p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <div className="h-48 sm:h-64 md:h-80">
            {assetOverviewData.length > 0 ? (
              <Bar
                data={assetOverviewChartData}
                options={assetOverviewChartOptions}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-xs sm:text-sm">
                  No asset data available
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 md:max-h-80 overflow-y-auto">
            {assetOverviewData.map((asset) => (
              <div
                key={asset.category}
                className={`p-2 sm:p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${asset.bgColor} border-gray-200`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div
                      className="p-1.5 sm:p-2 rounded-full text-white flex-shrink-0"
                      style={{ backgroundColor: asset.color }}
                    >
                      {asset.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                        {asset.category}
                      </h4>
                      <p className="text-xs text-gray-600">
                        +{asset.recent} this week
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm sm:text-lg font-bold text-gray-900">
                      {asset.total}
                    </p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
