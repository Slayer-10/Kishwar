import React from 'react';
import {
  getRegistrationDisplayStatus,
  type RegistrationStatusInput,
} from '@/lib/registration-status';

// ---------------------------------------------------------------------------
// Legacy single-status badge — used by every existing caller that passes only
// a raw `status` string (payment status, invoice status, event status, etc.).
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status?: string | null;
  // Semantic registration-status props (optional — activate the richer path).
  reviewStatus?: string | null;
  paymentStatus?: string | null;
  individualInvoiceStatus?: string | null;
  collectiveInvoiceStatus?: string | null;
  hasIndividualInvoice?: boolean;
  hasCollectiveInvoice?: boolean;
  /** @deprecated Use reviewStatus + paymentStatus + invoice fields instead. */
  invoiceType?: 'INDIVIDUAL' | 'COLLECTIVE' | null;
  className?: string;
}

export function StatusBadge({
  status,
  reviewStatus,
  paymentStatus,
  individualInvoiceStatus,
  collectiveInvoiceStatus,
  hasIndividualInvoice,
  hasCollectiveInvoice,
  invoiceType,
  className = '',
}: StatusBadgeProps) {
  // Use the rich semantic path when any semantic prop is provided.
  const useSemanticPath =
    reviewStatus !== undefined ||
    paymentStatus !== undefined ||
    individualInvoiceStatus !== undefined ||
    collectiveInvoiceStatus !== undefined ||
    hasIndividualInvoice !== undefined ||
    hasCollectiveInvoice !== undefined;

  let label: string;
  let bgStyle: string | undefined;
  let tailwindClass = '';

  if (useSemanticPath) {
    // Derive hasIndividualInvoice / hasCollectiveInvoice from legacy invoiceType
    // when the caller has not yet migrated to the explicit boolean props.
    const resolvedHasIndividual =
      hasIndividualInvoice ?? (invoiceType === 'INDIVIDUAL');
    const resolvedHasCollective =
      hasCollectiveInvoice ?? (invoiceType === 'COLLECTIVE');

    const result = getRegistrationDisplayStatus({
      reviewStatus,
      paymentStatus: paymentStatus ?? status,
      individualInvoiceStatus,
      collectiveInvoiceStatus,
      hasIndividualInvoice: resolvedHasIndividual,
      hasCollectiveInvoice: resolvedHasCollective,
    });

    label = result.label;
    tailwindClass = result.className;
    bgStyle = undefined; // let Tailwind classes drive the colour
  } else {
    // Legacy path: only a raw `status` string was supplied.
    const s = (status ?? 'UNKNOWN').toUpperCase();
    label = s;
    tailwindClass = '';

    if (s.includes('PENDING') || s.includes('INVOICED')) {
      bgStyle = 'var(--color-warning)';
    } else if (
      s.includes('CONFIRMED') ||
      s.includes('VERIFIED') ||
      s.includes('PAID') ||
      s.includes('VALID') ||
      s.includes('OPEN')
    ) {
      bgStyle = 'var(--color-success)';
    } else if (
      s.includes('REJECTED') ||
      s.includes('CANCELLED') ||
      s.includes('INVALID') ||
      s.includes('CLOSED')
    ) {
      bgStyle = 'var(--color-danger)';
    } else {
      bgStyle = 'var(--color-info)';
    }
  }

  if (bgStyle) {
    // Legacy path — uses CSS custom properties.
    return (
      <span
        className={`inline-flex items-center justify-center font-bold ${className}`}
        style={{
          backgroundColor: bgStyle,
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

  // Semantic path — uses Tailwind utility classes.
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${tailwindClass} ${className}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Convenience wrapper for registration-specific status display.
// Pass all available invoice and review data for the most accurate label.
// ---------------------------------------------------------------------------

export function RegistrationStatusBadge(
  props: RegistrationStatusInput & { className?: string }
) {
  const { className, ...statusProps } = props;
  return (
    <StatusBadge
      reviewStatus={statusProps.reviewStatus}
      paymentStatus={statusProps.paymentStatus}
      individualInvoiceStatus={statusProps.individualInvoiceStatus}
      collectiveInvoiceStatus={statusProps.collectiveInvoiceStatus}
      hasIndividualInvoice={statusProps.hasIndividualInvoice}
      hasCollectiveInvoice={statusProps.hasCollectiveInvoice}
      className={className}
    />
  );
}
