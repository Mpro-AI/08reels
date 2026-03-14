/**
 * Supabase → Firestore Migration Script
 * 
 * Prerequisites:
 *   npm install firebase-admin node-fetch
 *   Download service account key from:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   Save as: scripts/serviceAccountKey.json
 *
 * Run: node scripts/migrate-supabase-to-firestore.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://ahglddhcfbbxrhmdqvrz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZ2xkZGhjZmJieHJobWRxdnJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIwNDIzOCwiZXhwIjoyMDg4NzgwMjM4fQ.EjTEdcjyJSun-zIVN9Xs8vj_cgf3fHRARWPjMjxOm7E';
const SERVICE_ACCOUNT_PATH = join(__dirname, 'serviceAccountKey.json');
// ────────────────────────────────────────────────────────────────────────────

// Check service account key
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
} catch {
  console.error('❌ Service account key not found!');
  console.error('   Download from: Firebase Console → Project Settings → Service Accounts → Generate new private key');
  console.error(`   Save to: ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}

// Init Firebase Admin
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Supabase fetch helper
async function supaFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log('🚀 Starting Supabase → Firestore migration...\n');

  // 1. Fetch all active videos
  const videos = await supaFetch('videos?select=*&is_deleted=eq.false&order=uploaded_at.asc');
  console.log(`📹 Found ${videos.length} active videos`);

  // 2. Fetch all versions
  const allVersions = await supaFetch('versions?select=*&order=version_number.asc');
  console.log(`🎬 Found ${allVersions.length} versions`);

  // 3. Fetch all comments
  const allComments = await supaFetch('comments?select=*&order=created_at.asc');
  console.log(`💬 Found ${allComments.length} comments`);

  // 4. Fetch all annotations (if table exists)
  let allAnnotations = [];
  try {
    allAnnotations = await supaFetch('annotations?select=*');
    console.log(`📌 Found ${allAnnotations.length} annotations`);
  } catch {
    console.log('ℹ️  No annotations table');
  }

  console.log('\n⏳ Migrating to Firestore...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const video of videos) {
    try {
      // Get versions for this video
      const versions = allVersions
        .filter(v => v.video_id === video.id)
        .map(v => {
          // Get comments for this version
          const comments = allComments
            .filter(c => c.version_id === v.id)
            .map(c => ({
              id: c.id,
              timecode: c.timecode || 0,
              timecodeFormatted: c.timecode_formatted || '00:00:00',
              text: c.text || '',
              author: {
                id: c.author_id || 'unknown',
                name: c.author_name || 'Unknown',
              },
              createdAt: c.created_at || new Date().toISOString(),
            }));

          // Get annotations for this version
          const annotations = allAnnotations
            .filter(a => a.version_id === v.id)
            .map(a => ({
              id: a.id,
              type: a.type || 'pen',
              data: a.data || {},
              author: {
                id: a.author_id || 'unknown',
                name: a.author_name || 'Unknown',
              },
              createdAt: a.created_at || new Date().toISOString(),
              timecode: a.timecode || 0,
            }));

          return {
            id: v.id,
            versionNumber: v.version_number,
            status: v.status || 'pending_review',
            videoUrl: v.video_url || '',
            thumbnailUrl: v.thumbnail_url || '',
            notes: v.notes || '',
            qualities: v.qualities || [],
            isCurrentActive: v.is_current_active || false,
            uploaderName: v.uploader_name || 'Unknown',
            uploaderId: v.uploader_id || null,
            createdAt: v.created_at || new Date().toISOString(),
            comments,
            annotations,
          };
        });

      // Build Firestore document
      const firestoreDoc = {
        id: video.id,
        title: video.title || 'Untitled',
        thumbnailUrl: video.thumbnail_url || '',
        videoUrl: video.video_url || (versions[0]?.videoUrl || ''),
        authorId: video.author_id || null,
        authorName: video.author_name || 'Unknown',
        assignedUserIds: video.assigned_user_ids || [],
        isDeleted: false,
        uploadedAt: video.uploaded_at || new Date().toISOString(),
        versions,
      };

      // Write to Firestore
      await db.collection('videos').doc(video.id).set(firestoreDoc);
      successCount++;
      console.log(`  ✅ ${video.title || video.id} (${versions.length} versions, ${versions.reduce((s,v) => s + v.comments.length, 0)} comments)`);

    } catch (err) {
      errorCount++;
      console.error(`  ❌ Failed: ${video.id} — ${err.message}`);
    }
  }

  // Migrate users
  console.log('\n👥 Migrating users...');
  try {
    const users = await supaFetch('users?select=*');
    for (const user of users) {
      await db.collection('users').doc(user.id).set({
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email || null,
        photoURL: user.photo_url || null,
        role: user.role || 'employee',
        createdAt: user.created_at || new Date().toISOString(),
      });
    }
    console.log(`  ✅ ${users.length} users migrated`);
  } catch (err) {
    console.error(`  ❌ Users failed: ${err.message}`);
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Success: ${successCount} videos`);
  console.log(`   Errors:  ${errorCount} videos`);
  
  if (errorCount === 0) {
    console.log('\n🎉 All data migrated to Firestore successfully!');
    console.log('   Next step: Set Firebase Storage rules to allow authenticated reads');
  }
}

main().catch(console.error);
