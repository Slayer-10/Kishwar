'use client';

import { useState, useEffect } from 'react';

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isStarted: boolean;
};

export function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isStarted: false,
  });

  useEffect(() => {
    setMounted(true);

    function calculateTimeLeft(): TimeLeft {
      const difference = new Date(targetDate).getTime() - new Date().getTime();

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isStarted: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isStarted: false,
      };
    }

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!mounted) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(22, 36, 73, 0.8)',
        padding: '16px 24px',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ height: '48px', width: '192px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
      </div>
    );
  }

  if (timeLeft.isStarted) {
    return (
      <div style={{
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-primary)',
        backgroundColor: 'rgba(164, 100, 52, 0.1)',
        padding: '16px 24px',
        textAlign: 'center',
      }}>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
          KISHWAR 2026 HAS BEGUN!
        </p>
      </div>
    );
  }

  const units = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {units.map((unit, index) => (
          <div key={unit.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: 'rgba(22, 36, 73, 0.9)',
              padding: '12px 16px',
              minWidth: '72px',
              boxShadow: 'var(--shadow-card)',
            }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 700, color: 'var(--color-text-on-dark)' }}>
                {String(unit.value).padStart(2, '0')}
              </span>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)' }}>
                {unit.label}
              </span>
            </div>
            {index < units.length - 1 && (
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
                :
              </span>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px', fontSize: '12px', color: 'rgba(242, 241, 241, 0.7)' }}>
        <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: 'var(--color-accent)' }}></span>
        <span>Countdown to Mega Event Opening</span>
      </div>
    </div>
  );
}

