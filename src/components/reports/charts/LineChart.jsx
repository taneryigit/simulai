// components/reports/charts/LineChart.jsx
"use client";

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * A reusable Line Chart component that wraps Recharts LineChart
 * 
 * @param {Object} props - Component props
 * @param {Array} props.data - The data to display in the chart
 * @param {Array} props.dataKeys - Array of data keys to display as lines
 * @param {string} props.xAxisKey - The key for the X-axis data
 * @param {Array} props.colors - Array of colors for each line
 * @param {Array} props.legends - Array of legend labels for each line
 * @param {boolean} props.grid - Whether to show grid lines
 * @param {boolean} props.dots - Whether to show dots on data points
 * @returns {JSX.Element} Line Chart component
 */
const LineChart = ({ 
  data = [], 
  dataKeys = ["value"], 
  xAxisKey = "name", 
  colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe"], 
  legends = [], 
  grid = true,
  dots = true
}) => {
  // Default empty state
  if (!data || data.length === 0) {
    return <div className="no-chart-data">Grafik için veri bulunamadı.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {grid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip />
        <Legend />
        {dataKeys.map((key, index) => (
          <Line 
            key={key}
            type="monotone"
            dataKey={key} 
            stroke={colors[index % colors.length]} 
            name={legends[index] || key}
            dot={dots}
            activeDot={{ r: 8 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

export default LineChart;