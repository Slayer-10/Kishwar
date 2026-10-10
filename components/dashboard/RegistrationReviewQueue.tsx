"use client";

import { useState } from "react";
import {
  getPendingEventRegistrationsAction,
  reviewRegistrationAction,
  type ReviewQueueItem,
} from "@/app/(dashboard)/registration-review-actions";

type EventSummary = {
  eventId: string;
  eventName: string;
  eventDate: Date | string;
  seatCapacity: number | null;
  pendingCount: number;
  universities: { name: string; count: number }[];
};

type Props = {
  audience: "AMBASSADOR" | "ADMIN";
  initialSummaries: EventSummary[];
};

export function RegistrationReviewQueue({ audience, initialSummaries }: Props) {
  const [summaries, setSummaries] = useState<EventSummary[]>(initialSummaries);
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
  const [cachedEventData, setCachedEventData] = useState<Record<string, ReviewQueueItem[]>>({});
  const [loadingEventIds, setLoadingEventIds] = useState<Set<string>>(new Set());

  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [actionState, setActionState] = useState<Record<string, { loading: boolean; error?: string; success?: string }>>({});

  const toggleEventExpand = async (eventId: string) => {
    const next = new Set(expandedEventIds);
    if (next.has(eventId)) {
      next.delete(eventId);
      setExpandedEventIds(next);
      return;
    }

    next.add(eventId);
    setExpandedEventIds(next);

    // If not cached in client state, fetch dedicated event pending registrations
    if (!cachedEventData[eventId] && !loadingEventIds.has(eventId)) {
      setLoadingEventIds((prev) => new Set(prev).add(eventId));
      try {
        const items = await getPendingEventRegistrationsAction(eventId, audience);
        setCachedEventData((prev) => ({ ...prev, [eventId]: items }));
      } catch (err: any) {
        console.error("Error fetching event registrations:", err);
      } finally {
        setLoadingEventIds((prev) => {
          const updated = new Set(prev);
          updated.delete(eventId);
          return updated;
        });
      }
    }
  };

  const handleReview = async (
    registrationId: string,
    eventId: string,
    decision: "APPROVE" | "REJECT"
  ) => {
    const reason = rejectionReasons[registrationId] ?? "";

    if (decision === "REJECT" && !reason.trim()) {
      setActionState((prev) => ({
        ...prev,
        [registrationId]: { loading: false, error: "Please provide a rejection reason." },
      }));
      return;
    }

    setActionState((prev) => ({
      ...prev,
      [registrationId]: { loading: true },
    }));

    try {
      const res = await reviewRegistrationAction(
        registrationId,
        decision,
        audience,
        decision === "REJECT" ? reason : undefined
      );

      setActionState((prev) => ({
        ...prev,
        [registrationId]: { loading: false, success: res.success },
      }));

      // Update cached event data by removing the reviewed registration
      setCachedEventData((prev) => {
        const currentItems = prev[eventId] || [];
        return {
          ...prev,
          [eventId]: currentItems.filter((item) => item.id !== registrationId),
        };
      });

      // Update event pending summary count
      setSummaries((prev) =>
        prev
          .map((s) => {
            if (s.eventId === eventId) {
              const updatedPending = s.pendingCount - 1;
              return {
                ...s,
                pendingCount: updatedPending,
              };
            }
            return s;
          })
          .filter((s) => s.pendingCount > 0)
      );
    } catch (err: any) {
      setActionState((prev) => ({
        ...prev,
        [registrationId]: {
          loading: false,
          error: err?.message || "Action failed. Please try again.",
        },
      }));
    }
  };

  if (summaries.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 shadow-sm">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          No Pending Registration Requests
        </h3>
        <p className="text-sm text-gray-500">
          All submitted public registration requests for your queue have been processed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summaries.map((eventSummary) => {
        const isExpanded = expandedEventIds.has(eventSummary.eventId);
        const isLoading = loadingEventIds.has(eventSummary.eventId);
        const registrations = cachedEventData[eventSummary.eventId] || [];

        // Group registrations by University
        const groupedByUniv = new Map<string, ReviewQueueItem[]>();
        for (const reg of registrations) {
          const uName = reg.participant?.universityName || "University not recorded";
          if (!groupedByUniv.has(uName)) {
            groupedByUniv.set(uName, []);
          }
          groupedByUniv.get(uName)!.push(reg);
        }

        return (
          <div
            key={eventSummary.eventId}
            className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden"
          >
            {/* Header Accordion Bar */}
            <button
              type="button"
              onClick={() => toggleEventExpand(eventSummary.eventId)}
              className="w-full text-left px-6 py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors border-b border-gray-200"
            >
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-bold text-gray-900">
                    {eventSummary.eventName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    {eventSummary.pendingCount} pending
                  </span>
                </div>
                <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                  <span>
                    Event Date:{" "}
                    {new Date(eventSummary.eventDate).toLocaleDateString()}
                  </span>
                  <span>
                    Seat Capacity:{" "}
                    {eventSummary.seatCapacity === null
                      ? "Unlimited"
                      : eventSummary.seatCapacity}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-gray-400">
                <span className="text-sm font-medium text-gray-600 hidden sm:inline">
                  {isExpanded ? "Collapse" : "Expand Details"}
                </span>
                <svg
                  className={`w-5 h-5 transform transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {/* Event Summary Pills / Quick breakdown when collapsed */}
            {!isExpanded && (
              <div className="px-6 py-3 bg-white flex flex-wrap gap-2 text-xs text-gray-600">
                <span className="font-semibold text-gray-700">Universities:</span>
                {eventSummary.universities.map((u) => (
                  <span
                    key={u.name}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700"
                  >
                    {u.name} ({u.count})
                  </span>
                ))}
              </div>
            )}

            {/* Expanded Registrations List */}
            {isExpanded && (
              <div className="p-6 bg-gray-50/50 space-y-6">
                {isLoading ? (
                  <div className="py-8 text-center text-sm text-gray-500 flex items-center justify-center space-x-2">
                    <svg
                      className="animate-spin h-5 w-5 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Loading registration details...</span>
                  </div>
                ) : registrations.length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-4">
                    No pending requests found for this event.
                  </p>
                ) : (
                  Array.from(groupedByUniv.entries()).map(([univName, items]) => (
                    <div key={univName} className="space-y-4">
                      {/* University Grouping Header */}
                      <div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
                          {univName} ({items.length})
                        </h3>
                      </div>

                      {/* Items Cards */}
                      <div className="grid grid-cols-1 gap-4">
                        {items.map((reg) => {
                          const state = actionState[reg.id] || {};
                          const rejectionReason = rejectionReasons[reg.id] || "";

                          return (
                            <div
                              key={reg.id}
                              className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm space-y-4"
                            >
                              {/* Top Bar: Participant Info, Reg ID & Waiting Status */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h4 className="text-base font-bold text-gray-900">
                                      {reg.participant?.fullName ?? "Unknown Name"}
                                    </h4>
                                    <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                                      ID: {reg.id}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Registered on:{" "}
                                    {new Date(reg.createdAt).toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    {reg.reviewStatus === "PENDING_AMBASSADOR"
                                      ? "Waiting for Ambassador Review"
                                      : "Waiting for Admin Review"}
                                  </span>
                                </div>
                              </div>

                              {/* Participant & Registration Details */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="text-gray-500 block font-medium">Email Address</span>
                                  <span className="text-gray-900 font-semibold">{reg.participant?.email}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block font-medium">Phone Number</span>
                                  <span className="text-gray-900 font-semibold">{reg.participant?.phone || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block font-medium">CNIC / B-Form</span>
                                  <span className="text-gray-900 font-semibold">{reg.participant?.cnic || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block font-medium">University</span>
                                  <span className="text-gray-900 font-semibold">{reg.participant?.universityName}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block font-medium">Accommodation Option</span>
                                  <span className="text-gray-900 font-semibold">
                                    {reg.accommodationSelection === "THREE_DAY_STAY_WITH_FOOD"
                                      ? `3-Day Stay with Food (${reg.accommodationGender || "N/A"})`
                                      : "None / Self Arranged"}
                                  </span>
                                </div>
                              </div>

                              {/* Evidence Documents Section */}
                              <div className="pt-2">
                                <span className="text-xs font-semibold text-gray-700 block mb-2">
                                  Verification Evidence & Attachments:
                                </span>
                                <div className="flex flex-wrap gap-3">
                                  {reg.evidence.length === 0 ? (
                                    <span className="text-xs text-gray-400 italic">No evidence uploaded.</span>
                                  ) : (
                                    reg.evidence.map((ev) => (
                                      <a
                                        key={ev.id}
                                        href={ev.signedUrl || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium border ${
                                          ev.signedUrl
                                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                            : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                        } transition-colors`}
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                          />
                                        </svg>
                                        <span>
                                          {ev.type === "STUDENT_DOCUMENT"
                                            ? "Student ID Evidence"
                                            : "Payment Screenshot"}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-gray-200 text-gray-700 uppercase">
                                          {ev.reviewStatus}
                                        </span>
                                      </a>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* Feedback / Alerts */}
                              {state.error && (
                                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs font-medium">
                                  {state.error}
                                </div>
                              )}
                              {state.success && (
                                <div className="p-2.5 bg-green-50 border border-green-200 text-green-700 rounded text-xs font-medium">
                                  {state.success}
                                </div>
                              )}

                              {/* Controls Bar */}
                              <div className="pt-3 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex-1 max-w-md">
                                  <input
                                    type="text"
                                    placeholder="Rejection reason (required if rejecting)..."
                                    value={rejectionReason}
                                    onChange={(e) =>
                                      setRejectionReasons((prev) => ({
                                        ...prev,
                                        [reg.id]: e.target.value,
                                      }))
                                    }
                                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={state.loading}
                                  />
                                </div>

                                <div className="flex items-center space-x-3">
                                  <button
                                    type="button"
                                    onClick={() => handleReview(reg.id, eventSummary.eventId, "REJECT")}
                                    disabled={state.loading}
                                    className="px-4 py-2 rounded text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors shadow-sm"
                                  >
                                    {state.loading ? "Processing..." : "Reject Request"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleReview(reg.id, eventSummary.eventId, "APPROVE")}
                                    disabled={state.loading}
                                    className="px-4 py-2 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors shadow-sm"
                                  >
                                    {state.loading ? "Processing..." : "Approve & Reserve Seat"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
