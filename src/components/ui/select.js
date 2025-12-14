'use client';

import React, { useState, useRef, useEffect } from 'react';

export function Select({ defaultValue, children, className = '' }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const selectRef = useRef(null);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      {React.Children.map(children, (child) => {
        if (child.type === SelectTrigger) {
          return React.cloneElement(child, {
            onClick: () => setOpen(!open),
            open,
            value,
          });
        }
        if (child.type === SelectContent) {
          return open
            ? React.cloneElement(child, {
                onValueChange: (newValue) => {
                  setValue(newValue);
                  setOpen(false);
                },
                value,
              })
            : null;
        }
        return child;
      })}
    </div>
  );
}

export function SelectTrigger({ children, className = '', open, onClick }) {
  return (
    <button
      className={`flex items-center justify-between w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        open ? 'border-blue-500' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export function SelectValue({ placeholder, className = '' }) {
  return <span className={`block truncate ${className}`}>{placeholder}</span>;
}

export function SelectContent({ children, className = '', onValueChange, value }) {
  return (
    <div
      className={`absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 max-h-60 overflow-auto ${className}`}
    >
      {React.Children.map(children, (child) => {
        if (child.type === SelectItem) {
          return React.cloneElement(child, {
            onSelect: () => onValueChange(child.props.value),
            isSelected: value === child.props.value,
          });
        }
        return child;
      })}
    </div>
  );
}

export function SelectItem({ children, className = '', onSelect, isSelected }) {
  return (
    <div
      className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
        isSelected ? 'bg-blue-50 text-blue-600' : ''
      } ${className}`}
      onClick={onSelect}
    >
      {children}
    </div>
  );
}