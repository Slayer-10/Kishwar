import { prisma } from '@/lib/prisma';

export function cleanUniversityName(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim();
}

export function assertValidUniversityName(raw: unknown): string {
  const name = cleanUniversityName(raw);
  if (name.length < 2) throw new Error('University name is required.');
  if (name.length > 120) throw new Error('University name is too long.');
  return name;
}

/** Finds a university ignoring case/extra spaces, or creates it. */
export async function findOrCreateUniversity(raw: unknown) {
  const name = assertValidUniversityName(raw);
  const find = () =>
    prisma.university.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

  const existing = await find();
  if (existing) return existing;

  try {
    return await prisma.university.create({ data: { name } });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const again = await find();
      if (again) return again;
    }
    throw err;
  }
}
