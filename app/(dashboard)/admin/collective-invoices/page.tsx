import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  createDiscountTierAction,
  updateDiscountTierAction,
  generateCollectiveInvoicesAction,
} from './actions';
import { CollectiveInvoiceItemsDetails } from '@/components/dashboard/CollectiveInvoiceItemsDetails';
import { ConfirmPaymentButton } from '@/components/dashboard/ConfirmPaymentButton';

export const dynamic = 'force-dynamic';

export default async function CollectiveInvoicesPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  const [tiers, invoices] = await Promise.all([
    prisma.discountTier.findMany({
      orderBy: { minimumRegistrations: 'asc' },
      select: {
        id: true,
        name: true,
        minimumRegistrations: true,
        discountPercent: true,
        isActive: true,
      },
    }),

    prisma.collectiveInvoice.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        subtotal: true,
        discountPercent: true,
        discountAmount: true,
        totalAmount: true,
        createdAt: true,
        paidAt: true,
        paidConfirmedById: true,
        paidConfirmedBy: {
          select: {
            email: true,
          },
        },
        scopeKey: true,
        ambassador: {
          select: {
            ambassadorCode: true,
            user: { select: { email: true } },
            university: { select: { name: true } },
          },
        },
        _count: { select: { items: true } },
      },
    }),
  ]);

  const currency = (value: unknown) =>
    `PKR ${Number(value).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <main className="space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold">Collective Invoices</h1>
        <p className="mt-2 text-sm text-gray-500">
          Configure discount tiers, generate consolidated invoices, and confirm received bulk payments.
        </p>
      </header>

      <section className="rounded-xl border p-5 bg-white shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Add Discount Tier</h2>

        <form action={createDiscountTierAction} className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Tier Name</label>
            <input
              name="name"
              required
              placeholder="e.g. Gold Ambassador Tier"
              className="w-full rounded border p-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Min Registrations</label>
            <input
              name="minimumRegistrations"
              required
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 10"
              className="w-full rounded border p-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Discount %</label>
            <input
              name="discountPercent"
              required
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g. 15.00"
              className="w-full rounded border p-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button className="w-full rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">
              Add Tier
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border p-5 bg-white shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Configure Existing Tiers</h2>

        {tiers.length === 0 ? (
          <p className="text-sm text-gray-500">
            No discount tiers configured. Invoices will have no discount until
            a qualifying active tier is configured.
          </p>
        ) : (
          <div className="space-y-4">
            {tiers.map((tier) => (
              <form
                key={tier.id}
                action={updateDiscountTierAction}
                className="grid gap-3 border-b pb-4 sm:grid-cols-5 items-center"
              >
                <input type="hidden" name="id" value={tier.id} />
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block sm:hidden">Name</label>
                  <input
                    name="name"
                    required
                    defaultValue={tier.name}
                    className="w-full rounded border p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block sm:hidden">Min Regs</label>
                  <input
                    name="minimumRegistrations"
                    required
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={tier.minimumRegistrations}
                    className="w-full rounded border p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block sm:hidden">Discount %</label>
                  <input
                    name="discountPercent"
                    required
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    defaultValue={Number(tier.discountPercent)}
                    className="w-full rounded border p-2 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    name="isActive"
                    type="checkbox"
                    defaultChecked={tier.isActive}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Active
                </label>
                <button className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors">
                  Save Tier
                </button>
              </form>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-amber-300 p-5 bg-amber-50/50 shadow-sm">
        <h2 className="text-lg font-semibold text-amber-900">Generate Final Invoices</h2>
        <p className="my-3 text-sm text-amber-800">
          This manually creates one invoice per Ambassador for eligible
          registrations not previously invoiced. Review the eligible
          registrations and discount tiers before proceeding.
        </p>

        <form action={generateCollectiveInvoicesAction}>
          <button
            className="rounded bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 transition-colors shadow-sm text-sm"
          >
            Generate Collective Invoices
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Collective Invoices</h2>

        {invoices.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white p-5 rounded-xl border">
            No collective invoices generated yet.
          </p>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <details key={invoice.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <summary className="cursor-pointer font-medium text-gray-900 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-bold text-indigo-700">{invoice.invoiceNumber}</span>
                    {' — '}
                    {invoice.ambassador.university.name}
                  </span>
                  <div className="flex items-center space-x-3 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        invoice.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {invoice.status}
                    </span>
                    <span className="font-bold text-gray-900 text-sm">
                      {currency(invoice.totalAmount)}
                    </span>
                  </div>
                </summary>

                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div>
                    <dt className="text-gray-500 font-medium">Ambassador Code</dt>
                    <dd className="font-bold text-gray-800">{invoice.ambassador.ambassadorCode}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Ambassador Email</dt>
                    <dd className="font-semibold text-gray-800">{invoice.ambassador.user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Included Registrations</dt>
                    <dd className="font-bold text-gray-800">{invoice._count.items} registration(s)</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Subtotal</dt>
                    <dd className="font-semibold text-gray-800">{currency(invoice.subtotal)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Applied Discount</dt>
                    <dd className="font-semibold text-green-700">
                      {Number(invoice.discountPercent)}% ({currency(invoice.discountAmount)})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Final Amount</dt>
                    <dd className="font-bold text-gray-900 text-sm">
                      {currency(invoice.totalAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Billing Batch</dt>
                    <dd className="font-mono text-gray-600">{invoice.scopeKey}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Created Date</dt>
                    <dd className="text-gray-700">{new Date(invoice.createdAt).toLocaleString()}</dd>
                  </div>
                  {invoice.paidAt && (
                    <div>
                      <dt className="text-gray-500 font-medium">Payment Confirmed Date</dt>
                      <dd className="text-emerald-700 font-semibold">{new Date(invoice.paidAt).toLocaleString()}</dd>
                    </div>
                  )}
                  {invoice.paidConfirmedBy?.email && (
                    <div>
                      <dt className="text-gray-500 font-medium">Confirmed By Admin</dt>
                      <dd className="text-gray-800 font-medium">{invoice.paidConfirmedBy.email}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-gray-500 font-medium">Payment Action:</span>
                  <ConfirmPaymentButton invoiceId={invoice.id} alreadyPaid={invoice.status === 'PAID'} />
                </div>

                <CollectiveInvoiceItemsDetails invoiceId={invoice.id} />
              </details>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
