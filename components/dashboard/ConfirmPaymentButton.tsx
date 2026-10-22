'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { confirmCollectiveInvoicePaymentAction } from '@/app/(dashboard)/admin/collective-invoices/actions';

type Props = {
  invoiceId: string;
  alreadyPaid: boolean;
  /** When true, the button is rendered disabled regardless of loading state. */
  disabled?: boolean;
  /** Shown below the disabled button to explain why confirmation is blocked. */
  disabledReason?: string;
};

export function ConfirmPaymentButton({
  invoiceId,
  alreadyPaid,
  disabled = false,
  disabledReason,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const router = useRouter();

  function handleConfirm() {
    const approved = window.confirm(
      "Confirm that Kishwar has received this invoice's full payment? " +
        "The invoice and its eligible registrations will be marked as paid."
    );

    if (!approved) return;

    setMessage('');

    startTransition(async () => {
      const result = await confirmCollectiveInvoicePaymentAction(invoiceId);
      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  if (alreadyPaid) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
        Paid
      </span>
    );
  }

  const isDisabled = disabled || isPending;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isDisabled}
        title={disabled && disabledReason ? disabledReason : undefined}
        className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {isPending ? 'Confirming...' : 'Confirm Payment'}
      </button>

      {disabled && disabledReason && (
        <p className="text-[11px] text-amber-700 font-medium">
          ⚠ {disabledReason}
        </p>
      )}

      {message ? (
        <p role="status" className="text-[11px] font-medium text-gray-700 mt-1">
          {message}
        </p>
      ) : null}
    </div>
  );
}

