// components/reports/charts/BarChart.jsx
"use client";

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * A reusable Bar Chart component that wraps Recharts BarChart
 * 
 * @param {Object} props - Component props
 * @param {Array} props.data - The data to display in the chart
 * @param {Array} props.dataKeys - Array of data keys to display as bars
 * @param {string} props.xAxisKey - The key for the X-axis data
 * @param {Array} props.colors - Array of colors for each bar
 * @param {Array} props.legends - Array of legend labels for each bar
 * @returns {JSX.Element} Bar Chart component
 */
const BarChart = ({ 
  data = [], 
  dataKeys = ["value"], 
  xAxisKey = "name", 
  colors = ["#8884d8"], 
  legends = ["Value"] 
}) => {
  // Default empty state
  if (!data || data.length === 0) {
    return <div className="no-chart-data">Grafik için veri bulunamadı.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip />
        <Legend />
        {dataKeys.map((key, index) => (
          <Bar 
            key={key}
            dataKey={key} 
            fill={colors[index] || colors[0]} 
            name={legends[index] || key} 
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;