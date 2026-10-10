import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getReviewEventSummaries } from "@/lib/registration-review";
import { RegistrationReviewQueue } from "@/components/dashboard/RegistrationReviewQueue";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationRequestsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const summaries = await getReviewEventSummaries("ADMIN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Admin Registration Review Queue
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Review public registrations from universities without active Ambassadors. Approving a request reserves a seat for the participant.
        </p>
      </div>

      <RegistrationReviewQueue
        audience="ADMIN"
        initialSummaries={summaries}
      />
    </div>
  );
}
