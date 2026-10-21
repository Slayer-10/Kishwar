/**
 * Storage cleanup — deletes the 14 orphaned RegistrationEvidence objects
 * from the actual Supabase Storage buckets discovered during cleanup.
 * 
 * Actual buckets found: student-cards, registration-evidence, kishwar-registration-evidence
 */
import { createClient } from '@supabase/supabase-js';

const STORAGE_PATHS = [
  '727692ba-8484-48ac-827f-aac81c11673d/fdccbe35-4ca8-4198-b024-45067ed79e6e-student-card.jpg',
  'ambassador-registration/2fc66a55-eec2-4b43-a9d7-edf159494777/51ffd32b-4439-4f02-b908-e62bfee09275.png',
  'public-registration/7f50600b-ef36-4ec3-9b0c-54a879e43a16/98984ea3-b485-44e8-bf04-6833aa2e8cf0.png',
  'public-registration/7f50600b-ef36-4ec3-9b0c-54a879e43a16/c84666c6-d338-4cab-9ece-a820a1b71022.png',
  'public-registration/7f50600b-ef36-4ec3-9b0c-54a879e43a16/026dda04-3655-4e4b-a2a5-7613d6712999.png',
  'ambassador-registration/2fc66a55-eec2-4b43-a9d7-edf159494777/cf188252-3e23-4122-a724-3ec838572b61.png',
  'public-registration/b8109670-68a9-4a98-99eb-e6b66e68d41f/e4c928a5-4afc-449b-8514-9f5a4e67c0dc.png',
  'public-registration/b8109670-68a9-4a98-99eb-e6b66e68d41f/34b84311-c403-4877-be39-4ac1ad272e48.png',
  'public-registration/2462db7b-307b-4dde-bfe5-03a2afde6032/0b2e12ca-fb29-41da-8715-1c98e64186fb.png',
  'public-registration/2462db7b-307b-4dde-bfe5-03a2afde6032/97c69e92-3ae1-46a0-9169-4ef8aa8d1864.png',
  'public-registration/b8109670-68a9-4a98-99eb-e6b66e68d41f/65facdee-6fbc-419b-b02f-bd04f1ba7596.png',
  'public-registration/b8109670-68a9-4a98-99eb-e6b66e68d41f/1e0e2396-f41b-40b2-bde8-407cc8a51f3a.png',
  'public-registration/2462db7b-307b-4dde-bfe5-03a2afde6032/79f1495e-d76a-4856-9b35-df8f71a17522.png',
  'public-registration/2462db7b-307b-4dde-bfe5-03a2afde6032/9867a5d0-797a-43ad-a31c-812f270928a8.png',
];

const BUCKETS = ['student-cards', 'registration-evidence', 'kishwar-registration-evidence'];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE env vars');

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\nAttempting to delete ${STORAGE_PATHS.length} Storage objects across ${BUCKETS.length} buckets...\n`);

  const notFound: string[] = [...STORAGE_PATHS];
  const deleted: { bucket: string; path: string }[] = [];
  const failed: { bucket: string; path: string; error: string }[] = [];

  for (const bucket of BUCKETS) {
    if (notFound.length === 0) break;

    const { data, error } = await supabase.storage.from(bucket).remove(notFound);

    if (error) {
      console.log(`  [${bucket}] bulk remove error: ${error.message} — trying individually`);
      // Try individually to get per-file status
      const remaining = [...notFound];
      for (const path of remaining) {
        const { error: singleErr } = await supabase.storage.from(bucket).remove([path]);
        if (!singleErr) {
          deleted.push({ bucket, path });
          notFound.splice(notFound.indexOf(path), 1);
          console.log(`  ✅ [${bucket}] Deleted: ${path}`);
        }
      }
    } else if (data) {
      for (const obj of data) {
        // Supabase returns objects that were successfully removed
        const pathInList = notFound.find(p => p === obj.name || obj.name?.endsWith(p));
        if (pathInList) {
          deleted.push({ bucket, path: pathInList });
          notFound.splice(notFound.indexOf(pathInList), 1);
          console.log(`  ✅ [${bucket}] Deleted: ${pathInList}`);
        }
      }
      // If supabase returned no errors and data was empty, files may be in another bucket
    }
  }

  // Anything left in notFound was not found in any bucket
  console.log(`\n--- Storage Cleanup Summary ---`);
  console.log(`  Deleted: ${deleted.length}`);
  console.log(`  Not found in any bucket (may already be gone): ${notFound.length}`);
  if (notFound.length > 0) {
    console.log(`  Remaining paths (check Supabase dashboard):`);
    for (const p of notFound) console.log(`    ${p}`);
  }
  if (failed.length > 0) {
    console.log(`  Errors:`);
    for (const f of failed) console.log(`    [${f.bucket}] ${f.path}: ${f.error}`);
  }
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
