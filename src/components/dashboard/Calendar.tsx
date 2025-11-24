'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const Calendar = () => {
  const [date, setDate] = useState(new Date());

  const prevMonth = () => {
    setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  };

  const monthName = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();

  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const today = new Date();

  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h3 className="text-gray-800 text-xl font-bold mb-4">Calendar</h3>
      <div className="bg-white p-4 rounded-md border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="text-gray-600 hover:text-gray-800">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <p className="text-gray-800 text-base font-bold">{monthName} {year}</p>
          <button onClick={nextMonth} className="text-gray-600 hover:text-gray-800">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          <p className="font-bold text-gray-500">S</p>
          <p className="font-bold text-gray-500">M</p>
          <p className="font-bold text-gray-500">T</p>
          <p className="font-bold text-gray-500">W</p>
          <p className="font-bold text-gray-500">T</p>
          <p className="font-bold text-gray-500">F</p>
          <p className="font-bold text-gray-500">S</p>
          {[...Array(firstDayOfMonth)].map((_, i) => (
            <div key={`empty-${i}`}></div>
          ))}
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && day === today.getDate();
            return (
              <button key={day} className={`hover:bg-gray-100 rounded-full w-8 h-8 mx-auto flex items-center justify-center ${isToday ? 'bg-primary-500 text-white' : ''}`}>
                {day}
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default Calendar;
