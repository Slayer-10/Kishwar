import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center"
      style={{
        backgroundColor: 'var(--color-secondary-deep)',
        color: '#FFFFFF',
      }}
    >
      <div className="flex flex-col items-center max-w-md gap-6">
        <img
          src="/images/kishwar-logo.png"
          alt="KISHWAR Logo"
          className="w-[96px] h-[96px] rounded-full object-cover border-2 border-white/20 shadow-xl"
        />

        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--fs-display)',
            lineHeight: 1,
            color: 'var(--color-primary)',
          }}
          className="font-bold select-none"
        >
          404
        </h1>

        <div className="flex flex-col gap-2">
          <h2
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title1)' }}
            className="font-bold uppercase tracking-tight"
          >
            This page wandered off
          </h2>
          <p className="text-sm opacity-80">
            The page you are looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <Button href="/" variant="primary" className="mt-2">
          Return Home
        </Button>
      </div>
    </div>
  );
}
