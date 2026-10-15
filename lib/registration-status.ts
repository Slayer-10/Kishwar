// Pure helper — no server/client dependency, safe to import from both.

export type RegistrationStatusInput = {
  reviewStatus?: string | null;
  paymentStatus?: string | null;
  individualInvoiceStatus?: string | null;
  collectiveInvoiceStatus?: string | null;
  hasIndividualInvoice?: boolean;
  hasCollectiveInvoice?: boolean;
};

export type RegistrationDisplayStatus = {
  label: string;
  /** Tailwind class string for the badge background + text colour. */
  className: string;
};

/**
 * Derives an explicit, human-readable registration status label from the
 * combination of review status, payment status, and invoice state.
 *
 * Priority order (highest → lowest):
 *   1. Rejection (review OR payment rejected)
 *   2. Approval-pending states
 *   3. Unknown review state (not yet one of the known enum values)
 *   4. Payment completed (payment field, OR either invoice confirmed paid)
 *   5. Awaiting collective payment
 *   6. Awaiting individual payment
 *   7. Approved, no invoice, no payment
 *   8. Fallback
 */
export function getRegistrationDisplayStatus({
  reviewStatus,
  paymentStatus,
  individualInvoiceStatus,
  collectiveInvoiceStatus,
  hasIndividualInvoice = false,
  hasCollectiveInvoice = false,
}: RegistrationStatusInput): RegistrationDisplayStatus {
  const review = (reviewStatus ?? "").toUpperCase();
  const payment = (paymentStatus ?? "").toUpperCase();
  const individualInvoice = (individualInvoiceStatus ?? "").toUpperCase();
  const collectiveInvoice = (collectiveInvoiceStatus ?? "").toUpperCase();

  // 1. Rejection takes priority over everything else.
  if (review === "REJECTED" || payment === "REJECTED") {
    return {
      label: "REGISTRATION REJECTED",
      className: "bg-red-100 text-red-700",
    };
  }

  // 2. Approval-pending states — must be shown before any payment label.
  if (review === "PENDING_ADMIN") {
    return {
      label: "WAITING FOR ADMIN APPROVAL",
      className: "bg-amber-100 text-amber-800",
    };
  }

  if (review === "PENDING_AMBASSADOR") {
    return {
      label: "WAITING FOR AMBASSADOR APPROVAL",
      className: "bg-amber-100 text-amber-800",
    };
  }

  // 3. Guard: if the review status is not a known approved value, surface the
  //    inconsistency rather than silently showing a payment label.
  if (review !== "APPROVED") {
    return {
      label: "STATUS UNKNOWN — CHECK REGISTRATION",
      className: "bg-gray-100 text-gray-700",
    };
  }

  // From here onward the registration is APPROVED.

  // 4. Payment completed — any confirmed-paid signal is sufficient.
  if (
    payment === "PAID" ||
    collectiveInvoice === "PAID" ||
    individualInvoice === "PAID"
  ) {
    return {
      label: "PAYMENT COMPLETED",
      className: "bg-green-100 text-green-700",
    };
  }

  // 5. Awaiting collective payment — only when a collective invoice exists and
  //    has not been paid yet.
  if (hasCollectiveInvoice && collectiveInvoice && collectiveInvoice !== "PAID") {
    return {
      label: "AWAITING COLLECTIVE PAYMENT",
      className: "bg-orange-100 text-orange-800",
    };
  }

  // 6. Awaiting individual payment.
  if (hasIndividualInvoice && individualInvoice && individualInvoice !== "PAID") {
    return {
      label: "AWAITING INDIVIDUAL PAYMENT",
      className: "bg-orange-100 text-orange-800",
    };
  }

  // 7. Approved, invoiced but status string empty for some reason.
  if (hasCollectiveInvoice) {
    return {
      label: "AWAITING COLLECTIVE PAYMENT",
      className: "bg-orange-100 text-orange-800",
    };
  }

  if (hasIndividualInvoice) {
    return {
      label: "AWAITING INDIVIDUAL PAYMENT",
      className: "bg-orange-100 text-orange-800",
    };
  }

  // 8. Approved, no invoice created yet.
  if (payment === "PENDING" || payment === "INVOICED" || payment === "") {
    return {
      label: "APPROVED — PAYMENT NOT MADE",
      className: "bg-orange-100 text-orange-800",
    };
  }

  // 9. Any remaining mapped payment statuses.
  return {
    label: payment.replaceAll("_", " "),
    className: "bg-gray-100 text-gray-700",
  };
}
