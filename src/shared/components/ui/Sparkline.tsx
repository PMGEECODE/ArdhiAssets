import React from "react";
import { Line } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = "rgba(255, 255, 255, 0.8)",
  height = 40,
}) => {
  const chartData = {
    labels: data.map((_, i) => i.toString()),
    datasets: [
      {
        data,
        borderColor: color,
        backgroundColor: color.replace("0.8", "0.2"),
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    elements: {
      line: {
        borderWidth: 2,
      },
    },
  };

  return (
    <div style={{ height: `${height}px`, width: "100%" }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default Sparkline;
