import React from 'react';

interface StatusBadgeProps {
  status?: string | null;
  reviewStatus?: string | null;
  paymentStatus?: string | null;
  invoiceType?: 'INDIVIDUAL' | 'COLLECTIVE' | null;
  className?: string;
}

export function StatusBadge({
  status,
  reviewStatus,
  paymentStatus,
  invoiceType,
  className = '',
}: StatusBadgeProps) {
  // When the new semantic props are provided, use the richer logic.
  // When only the legacy `status` is provided, fall back to the original
  // colour-mapping behaviour so all existing callers remain unaffected.
  const hasSemanticProps =
    reviewStatus !== undefined ||
    paymentStatus !== undefined ||
    invoiceType !== undefined;

  let label: string;
  let bg: string;

  if (hasSemanticProps) {
    const review = (reviewStatus ?? '').toUpperCase();
    const payment = (paymentStatus ?? status ?? '').toUpperCase();

    if (review === 'REJECTED' || payment === 'REJECTED') {
      label = 'REJECTED';
      bg = 'var(--color-danger)';
    } else if (
      review === 'PENDING_ADMIN' ||
      review === 'PENDING_AMBASSADOR'
    ) {
      label = 'APPROVAL PENDING';
      bg = 'var(--color-warning)';
    } else if (payment === 'PAID') {
      label = 'PAID';
      bg = 'var(--color-success)';
    } else if (review === 'APPROVED') {
      if (invoiceType === 'COLLECTIVE') {
        label = 'COLLECTIVE PAYMENT PENDING';
      } else {
        label = 'PAYMENT PENDING';
      }
      bg = 'var(--color-warning)';
    } else {
      const labels: Record<string, string> = {
        PENDING: 'PAYMENT PENDING',
        INVOICED: 'PAYMENT PENDING',
        CONFIRMED: 'CONFIRMED',
        VERIFIED: 'VERIFIED',
      };
      label = labels[payment] ?? (payment || 'UNKNOWN').replaceAll('_', ' ');
      bg =
        payment.includes('PENDING') || payment === 'INVOICED'
          ? 'var(--color-warning)'
          : 'var(--color-info)';
    }
  } else {
    // Legacy path: only `status` was supplied.
    const s = (status ?? 'UNKNOWN').toUpperCase();
    label = s;

    if (s.includes('PENDING') || s.includes('INVOICED')) {
      bg = 'var(--color-warning)';
    } else if (
      s.includes('CONFIRMED') ||
      s.includes('VERIFIED') ||
      s.includes('PAID') ||
      s.includes('VALID') ||
      s.includes('OPEN')
    ) {
      bg = 'var(--color-success)';
    } else if (
      s.includes('REJECTED') ||
      s.includes('CANCELLED') ||
      s.includes('INVALID') ||
      s.includes('CLOSED')
    ) {
      bg = 'var(--color-danger)';
    } else {
      bg = 'var(--color-info)';
    }
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-bold ${className}`}
      style={{
        backgroundColor: bg,
        color: '#FFFFFF',
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--fs-caption1)',
        lineHeight: 'var(--lh-caption1)',
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
      }}
    >
      {label}
    </span>
  );
}
