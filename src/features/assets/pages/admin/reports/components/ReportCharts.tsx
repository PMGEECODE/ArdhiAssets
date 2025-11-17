"use client";

import type React from "react";
import { Suspense, lazy } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import Card from "../../../../../../shared/components/ui/Card";
import Loader from "../../../../../../shared/components/ui/Loader";
import type { ChartData } from "../types";

// Register chart components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Lazy load chart components
const BarChart = lazy(() =>
  import("react-chartjs-2").then((module) => ({ default: module.Bar }))
);
const LineChart = lazy(() =>
  import("react-chartjs-2").then((module) => ({ default: module.Line }))
);

interface ReportChartsProps {
  chartData: ChartData;
  isLoading: boolean;
  chartType: "bar" | "line";
  title: string;
}

export const ReportCharts: React.FC<ReportChartsProps> = ({
  chartData,
  isLoading,
  chartType,
  title,
}) => {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000 },
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        labels: {
          font: { size: 12, weight: "500" as const },
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: { size: 13, weight: "bold" as const },
        bodyFont: { size: 12 },
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        displayColors: true,
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toLocaleString();
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
        },
        ticks: {
          font: { size: 11 },
          callback: (value: any) => value.toLocaleString(),
        },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
  };

  return (
    <Card className="w-full">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        <div className="h-96 w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader />
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader />
                </div>
              }
            >
              {chartType === "line" ? (
                <LineChart data={chartData} options={chartOptions} />
              ) : (
                <BarChart data={chartData} options={chartOptions} />
              )}
            </Suspense>
          )}
        </div>
      </div>
    </Card>
  );
};
