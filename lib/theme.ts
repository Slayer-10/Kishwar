export const categoryColorVars = {
  creatives: "var(--color-cat-creatives)",
  technical: "var(--color-cat-technical)",
  esports: "var(--color-cat-esports)",
  indoor: "var(--color-cat-indoor)",
  outdoor: "var(--color-cat-outdoor)",
  socials: "var(--color-cat-socials)",
  literary: "var(--color-cat-literary)",
} as const;

/** Maps any Event.category string to a theme color. Falls back to primary. */
export function getCategoryColor(category?: string | null): string {
  const c = (category ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (c.includes("creative")) return categoryColorVars.creatives;
  if (c.includes("technical") || c.includes("tech")) return categoryColorVars.technical;
  if (c.includes("esport") || c.includes("gaming")) return categoryColorVars.esports;
  if (c.includes("indoor")) return categoryColorVars.indoor;
  if (c.includes("outdoor")) return categoryColorVars.outdoor;
  if (c.includes("social")) return categoryColorVars.socials;
  if (c.includes("literary") || c.includes("literature")) return categoryColorVars.literary;
  return "var(--color-primary)";
}
