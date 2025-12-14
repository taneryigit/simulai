'use client';

import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';

export function Calendar({ 
  mode = 'single', 
  selected, 
  onSelect, 
  locale = tr, 
  numberOfMonths = 1,

  defaultMonth = new Date()
}) {
  const [currentMonth, setCurrentMonth] = useState(defaultMonth);
  const [selectedDate, setSelectedDate] = useState(selected);
  const [selectedRange, setSelectedRange] = useState(
    mode === 'range' && selected ? selected : { from: null, to: null }
  );

  // Update internal state when props change
  useEffect(() => {
    if (mode === 'single') {
      setSelectedDate(selected);
    } else if (mode === 'range') {
      setSelectedRange(selected || { from: null, to: null });
    }
  }, [selected, mode]);

  const onDateClick = (day) => {
    if (mode === 'single') {
      const newDate = day;
      setSelectedDate(newDate);
      onSelect(newDate);
    } else if (mode === 'range') {
      const range = { ...selectedRange };
      
      // If no start date is selected or both are selected - start a new range
      if (!range.from || (range.from && range.to)) {
        range.from = day;
        range.to = null;
      } 
      // If only start date is selected, and the clicked date is after it
      else if (range.from && !range.to && day > range.from) {
        range.to = day;
      } 
      // If only start date is selected, but clicked date is before it - swap them
      else if (range.from && !range.to && day < range.from) {
        range.to = range.from;
        range.from = day;
      }
      
      setSelectedRange(range);
      onSelect(range);
    }
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const renderHeader = (month) => {
    return (
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-gray-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="font-semibold">
          {format(month, 'MMMM yyyy', { locale })}
        </div>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-gray-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const dateFormat = 'EEEEEE';
    const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 });

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-medium text-xs py-1">
          {format(addDays(startDate, i), dateFormat, { locale }).toUpperCase()}
        </div>
      );
    }

    return <div className="grid grid-cols-7 mb-1">{days}</div>;
  };

  const renderCells = (month) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'd');
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());
        
        // Check if date is selected
        let isSelected = false;
        if (mode === 'single' && selectedDate) {
          isSelected = isSameDay(day, selectedDate);
        } else if (mode === 'range' && selectedRange.from) {
          isSelected = isSameDay(day, selectedRange.from) || 
                      (selectedRange.to && isSameDay(day, selectedRange.to));
        }
        
        // Check if date is in range
        let isInRange = false;
        if (mode === 'range' && selectedRange.from && selectedRange.to) {
          isInRange = day > selectedRange.from && day < selectedRange.to;
        }

        days.push(
          <div
            key={day.toString()}
            className={`text-center py-1 ${
              !isCurrentMonth ? 'text-gray-300' : 
              isSelected ? 'bg-blue-500 text-white rounded-full' : 
              isInRange ? 'bg-blue-100' :
              isToday ? 'text-blue-600 font-bold' : ''
            } ${isCurrentMonth ? 'cursor-pointer hover:bg-gray-200' : ''}`}
            onClick={() => isCurrentMonth && onDateClick(new Date(day))}
          >
            {formattedDate}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="text-sm">{rows}</div>;
  };

  // Render multiple months
  const renderMonths = () => {
    const months = [];
    for (let i = 0; i < numberOfMonths; i++) {
      const month = addMonths(currentMonth, i);
      months.push(
        <div key={i} className="px-2">
          {renderHeader(month)}
          {renderDays()}
          {renderCells(month)}
        </div>
      );
    }
    return months;
  };

  return (
    <div className="bg-white">
      <div className={`flex ${numberOfMonths > 1 ? 'space-x-4' : ''}`}>
        {renderMonths()}
      </div>
    </div>
  );
}