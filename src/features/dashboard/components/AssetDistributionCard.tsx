import type React from "react";
import Card from "../../../shared/components/ui/Card";
import { Pie } from "react-chartjs-2";

interface CategoryStat {
  category: string;
  total: number;
}

interface AssetDistributionCardProps {
  categoryStats: CategoryStat[];
  totalAssets: number;
  categoryDistributionData: any;
  pieChartOptions: any;
}

export const AssetDistributionCard: React.FC<AssetDistributionCardProps> = ({
  categoryStats,
  totalAssets,
  categoryDistributionData,
  pieChartOptions,
}) => {
  return (
    <Card title="Asset Distribution" className="p-4 sm:p-6">
      <div className="space-y-4">
        <div className="h-40 sm:h-48 md:h-64 flex justify-center items-center">
          {categoryStats.length > 0 ? (
            <Pie data={categoryDistributionData} options={pieChartOptions} />
          ) : (
            <p className="text-gray-500 text-xs sm:text-sm">
              No data available
            </p>
          )}
        </div>

        {/* Custom Legend */}
        <div className="grid grid-cols-1 gap-2 pt-4 border-t border-gray-200">
          {categoryStats.map((category, _index) => {
            const colors = [
              {
                bg: "bg-indigo-100",
                text: "text-indigo-800",
                dot: "bg-indigo-500",
              },
              {
                bg: "bg-emerald-100",
                text: "text-emerald-800",
                dot: "bg-emerald-500",
              },
              {
                bg: "bg-green-100",
                text: "text-green-800",
                dot: "bg-green-500",
              },
              {
                bg: "bg-purple-100",
                text: "text-purple-800",
                dot: "bg-purple-500",
              },
              {
                bg: "bg-orange-100",
                text: "text-orange-800",
                dot: "bg-orange-500",
              },
              {
                bg: "bg-amber-100",
                text: "text-amber-800",
                dot: "bg-amber-500",
              },
              {
                bg: "bg-teal-100",
                text: "text-teal-800",
                dot: "bg-teal-500",
              },
              {
                bg: "bg-pink-100",
                text: "text-pink-800",
                dot: "bg-pink-500",
              },
            ];

            const colorScheme = colors[_index] || colors[0];
            const percentage =
              totalAssets > 0
                ? ((category.total / totalAssets) * 100).toFixed(1)
                : "0";

            return (
              <div
                key={category.category}
                className={`flex items-center justify-between p-2 rounded-lg ${colorScheme.bg}`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${colorScheme.dot}`}
                  ></div>
                  <span
                    className={`text-xs font-medium ${colorScheme.text} truncate`}
                  >
                    {category.category}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold ${colorScheme.text}`}>
                    {category.total}
                  </span>
                  <span className={`text-xs ${colorScheme.text} ml-1`}>
                    ({percentage}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
