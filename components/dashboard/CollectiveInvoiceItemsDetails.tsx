'use client';

import { useState } from 'react';
import { getCollectiveInvoiceItemsAction } from '@/app/(dashboard)/admin/collective-invoices/actions';

type LineItem = {
  id: string;
  registrationId: string;
  eventName: string;
  participantName: string;
  participantEmail: string;
  participantCnic: string;
  ambassadorCode: string;
  ambassadorEmail: string;
  ambassadorUniversity: string;
  reviewStatus: string;
  paymentStatus: string;
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
};

export function CollectiveInvoiceItemsDetails({
  invoiceId,
}: {
  invoiceId: string;
}) {
  const [items, setItems] = useState<LineItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const toggleDetails = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);

    if (items === null && !loading) {
      setLoading(true);
      setError(null);

      try {
        const fetched = await getCollectiveInvoiceItemsAction(invoiceId);
        setItems(fetched);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load line items.'
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="mt-3 border-t pt-3">
      <button
        type="button"
        onClick={toggleDetails}
        aria-expanded={isOpen}
        className="flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      >
        <span>
          {isOpen
            ? 'Hide Registration Line Items'
            : 'View Included Registration Line Items'}
        </span>

        <svg
          className={`h-4 w-4 transform transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-3 text-xs">
          {loading && (
            <p className="py-2 italic text-gray-500">
              Loading line items...
            </p>
          )}

          {error && (
            <div className="flex flex-wrap items-center gap-3 py-2">
              <p className="font-medium text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setItems(null);
                  setError(null);
                  void toggleDetails();
                }}
                className="font-semibold text-indigo-600 underline"
              >
                Retry
              </button>
            </div>
          )}

          {items && items.length > 0 && (
            <div className="mt-1 overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-left">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="border p-2">Registration ID</th>
                    <th className="border p-2">Participant / Team</th>
                    <th className="border p-2">CNIC</th>
                    <th className="border p-2">Event</th>
                    <th className="border p-2">Ambassador / University</th>
                    <th className="border p-2">Review Status</th>
                    <th className="border p-2">Payment Status</th>
                    <th className="border p-2 text-right">Base Amount</th>
                    <th className="border p-2 text-right">Discount</th>
                    <th className="border p-2 text-right">Final Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border p-2 font-mono text-[10px]">
                        {item.registrationId}
                      </td>

                      <td className="border p-2 font-medium">
                        {item.participantName}
                        <span className="block text-[10px] font-normal text-gray-500">
                          {item.participantEmail}
                        </span>
                      </td>

                      <td className="border p-2">{item.participantCnic}</td>

                      <td className="border p-2">{item.eventName}</td>

                      <td className="border p-2">
                        <span className="block font-semibold">
                          {item.ambassadorUniversity}
                        </span>
                        <span className="block text-[10px] text-gray-600">
                          {item.ambassadorCode}
                        </span>
                        <span className="block text-[10px] text-gray-500">
                          {item.ambassadorEmail}
                        </span>
                      </td>

                      <td className="border p-2">{item.reviewStatus}</td>

                      <td className="border p-2">{item.paymentStatus}</td>

                      <td className="border p-2 text-right">
                        PKR {item.baseAmount.toFixed(2)}
                      </td>

                      <td className="border p-2 text-right text-green-600">
                        -PKR {item.discountAmount.toFixed(2)}
                      </td>

                      <td className="border p-2 text-right font-bold">
                        PKR {item.finalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {items && items.length === 0 && (
            <p className="py-2 italic text-gray-500">
              No line items found for this invoice.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
