# Poolify — Supabase & Google OAuth Setup Guide

---

## PART 1 — Create a New Supabase Project

1. Go to https://supabase.com and sign in (or create a free account)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `poolify`
   - **Database Password**: choose a strong password and save it
   - **Region**: pick the closest to your users (e.g. South Asia)
4. Click **"Create new project"** — wait ~2 minutes for it to provision

---

## PART 2 — Get Your API Credentials

1. In your project dashboard, go to **Settings → API**
2. Copy these two values:
   - **Project URL** → looks like `https://xxxxxxxxxxxx.supabase.co`
   - **anon / public key** → long JWT string
3. Open `lib/core/config/supabase_config.dart` and replace:

```dart
const String supabaseUrl = 'https://xxxxxxxxxxxx.supabase.co';
const String supabaseAnonKey = 'your-anon-key-here';
```

✅ You have already done Parts 1 and 2.

---

## PART 3 — Run All Database Queries

Go to **SQL Editor** in your Supabase dashboard. Click **"New query"** and run each block below **one at a time**.

---

### 3.1 — Profiles Table

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone text,
  avatar_url text,
  student_id_url text,
  cnic_url text,
  gender text,
  role text not null default 'student',
  is_verified boolean not null default false,
  report_count integer not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, avatar_url, created_at)
  values (
    new.id,
    new.raw_user_meta_data->>'avatar_url',
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

### 3.2 — Rides Table

```sql
create table public.rides (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.profiles(id) on delete cascade not null,
  origin text not null,
  destination text not null,
  departure_date date,
  departure_time time,
  arrival_time time,
  total_seats integer not null default 1,
  available_seats integer not null default 1,
  price numeric not null default 0,
  gender_preference text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
```

---

### 3.3 — Requests Table

```sql
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid references public.rides(id) on delete cascade not null,
  passenger_id uuid references public.profiles(id) on delete cascade not null,
  seats_requested integer not null default 1,
  pickup_point text,
  dropoff_point text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
```

---

### 3.4 — Payments Table

```sql
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete cascade not null,
  payer_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null default 0,
  screenshot_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
```

---

### 3.5 — Reports Table

```sql
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reported_id uuid references public.profiles(id) on delete cascade not null,
  reason text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
```

---

### 3.6 — Row Level Security (RLS) Policies

Run this entire block at once:

```sql
-- Enable RLS
alter table public.profiles enable row level security;
alter table public.rides enable row level security;
alter table public.requests enable row level security;
alter table public.payments enable row level security;
alter table public.reports enable row level security;

-- ── PROFILES ──────────────────────────────────────────────────────────────

create policy "profiles_select"
  on public.profiles for select
  to authenticated using (true);

create policy "profiles_insert"
  on public.profiles for insert
  to authenticated with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── RIDES ──────────────────────────────────────────────────────────────────

create policy "rides_select"
  on public.rides for select
  to authenticated using (true);

create policy "rides_insert"
  on public.rides for insert
  to authenticated with check (auth.uid() = driver_id);

create policy "rides_update_driver"
  on public.rides for update
  to authenticated using (auth.uid() = driver_id) with check (auth.uid() = driver_id);

create policy "rides_update_admin"
  on public.rides for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "rides_delete_driver"
  on public.rides for delete
  to authenticated using (auth.uid() = driver_id);

create policy "rides_delete_admin"
  on public.rides for delete
  to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ── REQUESTS ───────────────────────────────────────────────────────────────

create policy "requests_select"
  on public.requests for select
  to authenticated using (true);

create policy "requests_insert"
  on public.requests for insert
  to authenticated with check (auth.uid() = passenger_id);

create policy "requests_update"
  on public.requests for update
  to authenticated
  using (
    auth.uid() = passenger_id
    or exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    auth.uid() = passenger_id
    or exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "requests_delete_admin"
  on public.requests for delete
  to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ── PAYMENTS ───────────────────────────────────────────────────────────────

create policy "payments_select"
  on public.payments for select
  to authenticated using (true);

create policy "payments_insert"
  on public.payments for insert
  to authenticated with check (auth.uid() = payer_id);

create policy "payments_update_admin"
  on public.payments for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── REPORTS ────────────────────────────────────────────────────────────────

create policy "reports_select"
  on public.reports for select
  to authenticated using (true);

create policy "reports_insert"
  on public.reports for insert
  to authenticated with check (auth.uid() = reporter_id);

create policy "reports_update_admin"
  on public.reports for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
```

---

### 3.7 — Enable Realtime on All Tables

```sql
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.rides;
alter publication supabase_realtime add table public.requests;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.reports;
```

---

### 3.8 — Set Yourself as Admin (run AFTER first Google login)

After you log in once with Google, go to **Authentication → Users** in Supabase,
copy your user UUID, then run:

```sql
update public.profiles
set role = 'admin'
where id = 'PASTE-YOUR-UUID-HERE';
```

---

## PART 4 — Create the Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **"New bucket"**
3. Name it exactly: `Verification` (capital V)
4. Toggle **Public bucket** ON
5. Click **Create bucket**
6. Go to **SQL Editor** and run:

```sql
create policy "storage_insert"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'Verification');

create policy "storage_select"
  on storage.objects for select
  to public using (bucket_id = 'Verification');

create policy "storage_update"
  on storage.objects for update
  to authenticated using (bucket_id = 'Verification');
```

---

## PART 5 — Set Up Google OAuth

### Step A — Google Cloud Console

1. Go to https://console.cloud.google.com
2. Create a new project — name it `Poolify`
3. Go to **APIs & Services → OAuth consent screen**
   - User Type: **External**
   - App name: `Poolify`
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue** through all steps (no scopes needed)
4. Go to **APIs & Services → Credentials**
5. Click **"+ Create Credentials" → OAuth 2.0 Client IDs**

---

### Step B — Web Client (required by Supabase)

1. Application type: **Web application**
2. Name: `Poolify Web`
3. Under **Authorized redirect URIs**, add:
   ```
   https://xxxxxxxxxxxx.supabase.co/auth/v1/callback
   ```
   Replace `xxxxxxxxxxxx` with your actual Supabase project ref (found in Settings → General)
4. Click **Create**
5. Copy the **Client ID** and **Client Secret** — you'll need these in Step E

---

### Step C — Android Client

1. Click **"+ Create Credentials" → OAuth 2.0 Client IDs** again
2. Application type: **Android**
3. Package name: check `android/app/build.gradle` for `applicationId` (e.g. `com.example.poolify`)
4. SHA-1 fingerprint — run in your project terminal:
   ```
   cd android && gradlew signingReport
   ```
   Copy the **SHA1** from the `debug` variant output
5. Click **Create**

---

### Step D — iOS Client (skip if Android only)

1. Click **"+ Create Credentials" → OAuth 2.0 Client IDs** again
2. Application type: **iOS**
3. Bundle ID: check `ios/Runner.xcodeproj` → General → Bundle Identifier
4. Click **Create**

---

### Step E — Enable Google Provider in Supabase

1. In Supabase go to **Authentication → Providers**
2. Find **Google** and toggle it **ON**
3. Paste the **Client ID** and **Client Secret** from Step B
4. Click **Save**

---

### Step F — Add Redirect URL in Supabase

1. In Supabase go to **Authentication → URL Configuration**
2. Under **Redirect URLs** click **Add URL** and add:
   ```
   io.supabase.poolify://login-callback
   ```
3. Click **Save**

---

### Step G — Deep Links (already done in code)

The following are already configured in the Flutter project:

- `AndroidManifest.xml` — intent filter with scheme `io.supabase.poolify`
- `ios/Runner/Info.plist` — CFBundleURLSchemes with `io.supabase.poolify`
- `auth_provider.dart` — redirectTo `io.supabase.poolify://login-callback`

Nothing to do here ✅

---

## PART 6 — Final Checklist

| Step | Done? |
|------|-------|
| Supabase project created | ✅ |
| `supabase_config.dart` updated with URL + anon key | ✅ |
| Profiles table + trigger created (3.1) | ☐ |
| Rides table created (3.2) | ☐ |
| Requests table created (3.3) | ☐ |
| Payments table created (3.4) | ☐ |
| Reports table created (3.5) | ☐ |
| RLS policies applied (3.6) | ☐ |
| Realtime enabled on all tables (3.7) | ☐ |
| `Verification` storage bucket created (Part 4) | ☐ |
| Google Cloud project + OAuth consent screen created | ☐ |
| Web OAuth client created with Supabase callback URL | ☐ |
| Android OAuth client created with SHA-1 | ☐ |
| Google provider enabled in Supabase (Step E) | ☐ |
| Redirect URL added in Supabase Auth settings (Step F) | ☐ |
| Signed in once with Google | ☐ |
| Set your account role to `admin` via SQL (3.8) | ☐ |

---

## PART 7 — Test It

1. Run `flutter run -d chrome` or on a physical Android device
2. Tap **Continue with Google** → complete sign-in
3. You land on **Unverified** screen ✅ (correct, no docs submitted yet)
4. Tap **Verify My Account** → fill form + upload images → submit
5. You land on **Verification Pending** screen ✅
6. In Supabase SQL Editor run the admin update from Step 3.8
7. Tap **Refresh Status** in the app → you land on **Dashboard** with the 🛡️ Admin button ✅
