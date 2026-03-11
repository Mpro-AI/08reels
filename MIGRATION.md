# Firebase → Supabase Migration Spec

## Goal
Migrate 08reels (video review platform) from Firebase to Supabase so it works in mainland China.

## Supabase Credentials
- **URL:** https://ahglddhcfbbxrhmdqvrz.supabase.co
- **Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZ2xkZGhjZmJieHJobWRxdnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDQyMzgsImV4cCI6MjA4ODc4MDIzOH0.jbk4_2jSQkIpTpzJilmLM01k52wb5Bd0_5f-IzgPW9c

## Current Architecture (Firebase)
- **Auth:** Firebase Auth (Email/Password + Google OAuth)
- **DB:** Firestore with 2 collections: `users`, `videos` (videos has nested versions/comments/annotations)
- **Storage:** Firebase Storage for videos, thumbnails, annotation images
- **AI:** Genkit + Gemini (keep as-is, server-side)

## Target Architecture (Supabase)
- **Auth:** Supabase Auth (Email/Password only, remove Google OAuth)
- **DB:** Supabase PostgreSQL (normalize nested Firestore data into tables)
- **Storage:** Supabase Storage (buckets for videos, thumbnails, annotations)
- **AI:** Genkit stays unchanged

## PostgreSQL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (linked to Supabase Auth)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Anonymous',
  email TEXT,
  photo_url TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  thumbnail_hint TEXT DEFAULT 'video thumbnail',
  author_id UUID REFERENCES public.users(id),
  author_name TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  video_url TEXT,
  assigned_user_ids UUID[] DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

-- Versions table (was nested array in Firestore videos doc)
CREATE TABLE public.versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'needs_changes', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  uploader_id UUID REFERENCES public.users(id),
  uploader_name TEXT,
  is_current_active BOOLEAN DEFAULT FALSE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  notes TEXT,
  qualities JSONB DEFAULT '[]'
);

-- Comments table (was nested array in versions)
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES public.versions(id) ON DELETE CASCADE,
  timecode FLOAT NOT NULL DEFAULT 0,
  timecode_formatted TEXT,
  text TEXT NOT NULL,
  author_id UUID REFERENCES public.users(id),
  author_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Annotations table (was nested array in versions)
CREATE TABLE public.annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES public.versions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pen', 'image', 'text')),
  data JSONB NOT NULL,
  author_id UUID REFERENCES public.users(id),
  author_name TEXT,
  timecode FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

-- Users: authenticated users can read all, update own
CREATE POLICY "Users can read all users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Videos: authenticated users can read all, admins can write
CREATE POLICY "Authenticated can read videos" ON public.videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert videos" ON public.videos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update videos" ON public.videos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete videos" ON public.videos FOR DELETE TO authenticated USING (true);

-- Same for versions, comments, annotations
CREATE POLICY "Authenticated can read versions" ON public.versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert versions" ON public.versions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update versions" ON public.versions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can read comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete comments" ON public.comments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can read annotations" ON public.annotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert annotations" ON public.annotations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update annotations" ON public.annotations FOR UPDATE TO authenticated USING (true);
```

## Storage Buckets
Create these buckets in Supabase Storage:
- `videos` — video files (public read, authenticated write)
- Path structure: `{videoId}/versions/{versionId}/{filename}`
- Thumbnails go in: `{videoId}/thumbnail.jpg` or `{videoId}/versions/{versionId}/thumbnail.jpg`
- Annotation images: `{videoId}/versions/{versionId}/annotations/{filename}`

## Migration Steps

### Step 1: Install Supabase client
```bash
npm install @supabase/supabase-js
npm uninstall firebase
```

### Step 2: Create Supabase client config
Create `src/supabase/client.ts` with:
- createBrowserClient for client-side
- Environment variables for URL + anon key (or hardcode like Firebase config did)

### Step 3: Create Supabase provider
Replace `src/firebase/provider.tsx` and `src/firebase/client-provider.tsx` with a single `src/supabase/provider.tsx` that provides the Supabase client via context.

### Step 4: Rewrite Auth
Replace `src/hooks/use-auth.tsx`:
- Remove Google OAuth (loginWithGoogle)
- Keep Email/Password (loginWithEmail, signupWithEmail)
- Use Supabase Auth: supabase.auth.signInWithPassword, supabase.auth.signUp
- Listen to auth state: supabase.auth.onAuthStateChange
- On signup/login, upsert user profile in `users` table
- Admin detection: check users.role column instead of Firebase custom claims
- Hardcoded admin UID logic needs to be adapted (use email match instead)

### Step 5: Rewrite Firestore operations → Supabase queries
Replace `src/firebase/firestore/videos.ts`:
- `addVideo` → supabase.from('videos').insert() + supabase.from('versions').insert()
- `setVideo` → supabase.from('videos').update()
- `deleteVideo` → supabase.from('videos').delete() (cascade handles versions/comments/annotations)
- `addCommentToVersion` → supabase.from('comments').insert()
- `deleteCommentFromVersion` → supabase.from('comments').delete()
- `setVersionStatus` → supabase.from('versions').update()
- `addAnnotationsToVersion` → supabase.from('annotations').insert()
- `updateAnnotationInVersion` → supabase.from('annotations').update()
- `addNewVersion` → supabase.from('versions').insert()
- `updateVideoAssignedUsers` → supabase.from('videos').update()

Replace `src/firebase/firestore/users.ts`:
- `getAllUsers` → supabase.from('users').select()
- `getAllEmployees` → supabase.from('users').select().eq('role', 'employee')

### Step 6: Rewrite real-time listeners
Replace `src/firebase/firestore/use-collection.tsx` and `use-doc.tsx`:
- Firestore `onSnapshot` → Supabase Realtime `supabase.channel().on('postgres_changes', ...)`
- The useCollection hook should subscribe to table changes
- The useDoc hook should subscribe to single row changes
- IMPORTANT: Videos in Firestore had nested versions/comments/annotations. In Supabase, these are separate tables. The hooks need to JOIN or fetch related data.

### Step 7: Rewrite Storage
Replace `src/firebase/storage.ts`:
- `uploadVideoAndGetUrl` → supabase.storage.from('videos').upload() + getPublicUrl()
- `uploadThumbnail` → supabase.storage.from('videos').upload()
- `uploadAnnotationImage` → supabase.storage.from('videos').upload()
- `generateVideoThumbnail` → keep as-is (client-side canvas logic)
- `verifyRangeSupport` → keep as-is (just a fetch check)
- Delete: supabase.storage.from('videos').remove()

### Step 8: Update all imports
- Search all files for `@/firebase` imports and update to `@/supabase`
- Update layout.tsx, page.tsx, and all components
- Remove `src/firebase/` directory entirely

### Step 9: Update environment / config
- Remove `.firebaserc`, `firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`
- Update `next.config.ts` if needed
- Add Supabase env vars or config file

### Step 10: Clean up
- Remove `functions/` directory (Firebase Functions)
- Remove `dataconnect/` directory
- Remove firebase-related config files
- Update package.json scripts
- Keep Genkit AI files as-is

## Important Notes
1. The `Video` type currently has nested `versions[]` with nested `comments[]` and `annotations[]`. After migration, fetching a video needs to JOIN versions, comments, and annotations from separate tables.
2. The hardcoded admin UID `VPkSokn932hWjebe6HpAqEcUWnX2` is a Firebase UID. After migration, admin detection should use email or a flag in the users table.
3. Google OAuth must be completely removed — it won't work in China.
4. All Firestore transactions need to be converted to regular Supabase queries (Supabase doesn't have client-side transactions, but PostgreSQL handles consistency via RLS and constraints).
5. The `src/firebase/error-emitter.ts` and `src/firebase/errors.ts` custom error handling can be simplified or adapted for Supabase errors.

## Files to Create
- `src/supabase/client.ts` — Supabase client initialization
- `src/supabase/provider.tsx` — React context provider
- `src/supabase/auth/use-user.tsx` — Auth state hook
- `src/supabase/db/videos.ts` — Video CRUD operations
- `src/supabase/db/users.ts` — User operations
- `src/supabase/db/use-collection.tsx` — Real-time collection hook
- `src/supabase/db/use-doc.tsx` — Real-time document hook
- `src/supabase/storage.ts` — Storage operations

## Files to Delete
- `src/firebase/` — entire directory
- `functions/` — Firebase Functions
- `dataconnect/` — Firebase Data Connect
- `.firebaserc`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`
- `cors.json`
- `firebase-storage-cors.json`
- `apphosting.yaml`

## Testing
After migration:
1. Run `npm run dev` and verify no Firebase imports remain
2. Test signup with email/password
3. Test login with email/password
4. Test video upload
5. Test adding comments
6. Test adding annotations
7. Test version management
8. Test user management (admin page)
9. Verify real-time updates work
