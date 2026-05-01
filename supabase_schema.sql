-- RIDEEBUDDY DATABASE SCHEMA

-- 1. Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  student_id_url TEXT,
  cnic_url TEXT,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  report_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Rides
CREATE TABLE IF NOT EXISTS rides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  total_seats INTEGER NOT NULL,
  available_seats INTEGER NOT NULL,
  price NUMERIC DEFAULT 0,
  contact_info TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Ride Requests
CREATE TABLE IF NOT EXISTS requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE NOT NULL,
  passenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  requested_seats INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Payments (Manual Verification)
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  receipt_url TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reported_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Dropping first to avoid "already exists" errors)
DO $$ 
BEGIN
    -- Profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public profiles are viewable by everyone') THEN
        CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
    END IF;

    -- Rides
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Rides are viewable by everyone') THEN
        CREATE POLICY "Rides are viewable by everyone" ON rides FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Drivers can insert rides') THEN
        CREATE POLICY "Drivers can insert rides" ON rides FOR INSERT WITH CHECK (auth.uid() = driver_id);
    END IF;

    -- Requests
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Passengers can view own requests') THEN
        CREATE POLICY "Passengers can view own requests" ON requests FOR SELECT USING (auth.uid() = passenger_id);
    END IF;
END $$;

-- Enable Realtime for all core tables (Using a DO block to avoid errors if already added)
DO $$
BEGIN
  BEGIN
    alter publication supabase_realtime add table profiles;
  EXCEPTION WHEN others THEN END;
  BEGIN
    alter publication supabase_realtime add table rides;
  EXCEPTION WHEN others THEN END;
  BEGIN
    alter publication supabase_realtime add table requests;
  EXCEPTION WHEN others THEN END;
  BEGIN
    alter publication supabase_realtime add table payments;
  EXCEPTION WHEN others THEN END;
  BEGIN
    alter publication supabase_realtime add table reports;
  EXCEPTION WHEN others THEN END;
END $$;
