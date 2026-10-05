'use client';

import React, { useState, useEffect } from 'react';

interface CountdownProps {
  targetDate: string;
}

export function Countdown({ targetDate }: CountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    setMounted(true);

    function calculateTime() {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    }

    calculateTime();
    const timer = setInterval(calculateTime, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const padNumber = (num: number) => {
    if (!mounted) return '00';
    return String(num).padStart(2, '0');
  };

  const units = [
    { label: 'Days', value: padNumber(timeLeft.days) },
    { label: 'Hours', value: padNumber(timeLeft.hours) },
    { label: 'Minutes', value: padNumber(timeLeft.minutes) },
    { label: 'Seconds', value: padNumber(timeLeft.seconds) },
  ];

  return (
    <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 my-6">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="flex flex-col items-center justify-center transition-all"
          style={{
            width: '88px',
            height: '88px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '36px',
              color: '#FFFFFF',
              lineHeight: 1,
            }}
            className="font-bold"
          >
            {unit.value}
          </span>
          <span
            style={{
              fontSize: 'var(--fs-caption1)',
              lineHeight: 'var(--lh-caption1)',
              color: 'var(--color-accent)',
              fontFamily: 'var(--font-body)',
              marginTop: '4px',
            }}
            className="uppercase font-medium tracking-wider"
          >
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}
