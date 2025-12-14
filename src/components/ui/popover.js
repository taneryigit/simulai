'use client';

import React, { useState, useRef, useEffect } from 'react';

export function Popover({ children }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative inline-block">
      {React.Children.map(children, (child) => {
        if (child.type === PopoverTrigger) {
          return React.cloneElement(child, {
            onClick: () => setOpen(!open),
          });
        }
        if (child.type === PopoverContent) {
          return open ? React.cloneElement(child, { onClose: () => setOpen(false) }) : null;
        }
        return child;
      })}
    </div>
  );
}

export function PopoverTrigger({ children, asChild, onClick }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        e.preventDefault();
        onClick();
        if (children.props.onClick) {
          children.props.onClick(e);
        }
      },
    });
  }
  
  return (
    <button
      type="button"
      className="inline-flex"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function PopoverContent({ children, align = 'center', className = '', onClose }) {
  const contentRef = useRef(null);
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (contentRef.current && !contentRef.current.contains(event.target)) {
        onClose();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  // Calculate position class based on alignment
  let alignmentClass = 'left-1/2 transform -translate-x-1/2'; // center (default)
  if (align === 'start') alignmentClass = 'left-0';
  if (align === 'end') alignmentClass = 'right-0';

  return (
    <div 
      ref={contentRef}
      className={`absolute z-50 mt-2 ${alignmentClass} ${className}`}
    >
      {children}
    </div>
  );
}