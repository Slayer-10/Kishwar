import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getReviewEventSummaries } from "@/lib/registration-review";
import { RegistrationReviewQueue } from "@/components/dashboard/RegistrationReviewQueue";

export const dynamic = "force-dynamic";

export default async function AmbassadorRequestsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "AMBASSADOR" || !user.ambassador) {
    redirect("/login");
  }

  const summaries = await getReviewEventSummaries(
    "AMBASSADOR",
    user.ambassador.id
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Registration Review Queue
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Review public registrations submitted for your university. Approving a request reserves a seat for the participant.
        </p>
      </div>

      <RegistrationReviewQueue
        audience="AMBASSADOR"
        initialSummaries={summaries}
      />
    </div>
  );
}
