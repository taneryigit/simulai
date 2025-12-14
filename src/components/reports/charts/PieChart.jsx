// components/reports/charts/PieChart.jsx
"use client";

import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * A reusable Pie Chart component that wraps Recharts PieChart
 * 
 * @param {Object} props - Component props
 * @param {Array} props.data - The data to display in the chart
 * @param {string} props.dataKey - The key for the pie segment values
 * @param {string} props.nameKey - The key for the pie segment names
 * @param {Array} props.colors - Array of colors for pie segments
 * @param {number} props.innerRadius - Inner radius of the pie (0 for a full pie)
 * @param {number} props.outerRadius - Outer radius of the pie
 * @param {boolean} props.label - Whether to show labels on pie segments
 * @returns {JSX.Element} Pie Chart component
 */
const PieChart = ({ 
  data = [], 
  dataKey = "value", 
  nameKey = "name", 
  colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"],
  innerRadius = 0,
  outerRadius = "80%",
  label = true
}) => {
  // Default empty state
  if (!data || data.length === 0) {
    return <div className="no-chart-data">Grafik için veri bulunamadı.</div>;
  }

  // Custom label renderer if needed
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={label ? renderCustomizedLabel : false}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey={dataKey}
          nameKey={nameKey}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}`} />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

export default PieChart;