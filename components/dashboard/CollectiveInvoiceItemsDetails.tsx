'use client';

import { useState } from 'react';
import { getCollectiveInvoiceItemsAction } from '@/app/(dashboard)/admin/collective-invoices/actions';

type LineItem = {
  id: string;
  registrationId: string;
  eventName: string;
  participantName: string;
  participantEmail: string;
  reviewStatus: string;
  paymentStatus: string;
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
};

export function CollectiveInvoiceItemsDetails({ invoiceId }: { invoiceId: string }) {
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

    if (!items && !loading) {
      setLoading(true);
      try {
        const fetched = await getCollectiveInvoiceItemsAction(invoiceId);
        setItems(fetched);
      } catch (err: any) {
        setError(err?.message || 'Failed to load line items.');
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
        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
      >
        <span>{isOpen ? 'Hide Registration Line Items' : 'View Included Registration Line Items'}</span>
        <svg
          className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-3 text-xs">
          {loading && (
            <p className="text-gray-500 italic py-2">Loading line items...</p>
          )}

          {error && (
            <p className="text-red-600 font-medium py-2">{error}</p>
          )}

          {items && items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-gray-200 mt-1">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-2 border">Registration ID</th>
                    <th className="p-2 border">Participant / Team</th>
                    <th className="p-2 border">Event</th>
                    <th className="p-2 border">Review Status</th>
                    <th className="p-2 border">Payment Status</th>
                    <th className="p-2 border text-right">Base Amount</th>
                    <th className="p-2 border text-right">Discount</th>
                    <th className="p-2 border text-right">Final Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-2 border font-mono text-[10px]">{item.registrationId}</td>
                      <td className="p-2 border font-medium">
                        {item.participantName}
                        <span className="block text-[10px] text-gray-500 font-normal">
                          {item.participantEmail}
                        </span>
                      </td>
                      <td className="p-2 border">{item.eventName}</td>
                      <td className="p-2 border">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                          {item.reviewStatus}
                        </span>
                      </td>
                      <td className="p-2 border">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            item.paymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {item.paymentStatus}
                        </span>
                      </td>
                      <td className="p-2 border text-right">PKR {item.baseAmount.toFixed(2)}</td>
                      <td className="p-2 border text-right text-green-600">
                        -PKR {item.discountAmount.toFixed(2)}
                      </td>
                      <td className="p-2 border text-right font-bold">
                        PKR {item.finalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {items && items.length === 0 && (
            <p className="text-gray-500 italic py-2">No line items found for this invoice.</p>
          )}
        </div>
      )}
    </div>
  );
}

