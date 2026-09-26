import { prisma } from '../lib/prisma';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const email = 'fdo-test@kishwar.local';
  const password = 'TestPassword123!';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User with email ${email} already exists (role: ${existing.role}). Nothing to do.`);
    return;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    console.error('Failed to create Supabase Auth user:', error?.message);
    process.exit(1);
  }

  await prisma.user.create({
    data: { id: data.user.id, email, role: 'FDO' },
  });

  await prisma.fDO.create({
    data: { userId: data.user.id },
  });

  console.log(`FDO test account created.`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
