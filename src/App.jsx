import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';
import { NotificationProvider } from './context/NotificationProvider';

import Login from './pages/Login';
import Unverified from './pages/Unverified';
import VerificationForm from './pages/VerificationForm';
import VerificationPending from './pages/VerificationPending';
import Dashboard from './pages/Dashboard';
import PostRide from './pages/PostRide';
import RidePosted from './pages/RidePosted';
import SearchRides from './pages/SearchRides';
import RequestRide from './pages/RequestRide';
import RequestSent from './pages/RequestSent';
import MyRequests from './pages/MyRequests';
import RideRequests from './pages/RideRequests';
import ReportUser from './pages/ReportUser';
import UnlockContact from './pages/UnlockContact';
import PaymentSubmitted from './pages/PaymentSubmitted';
import PassengerContact from './pages/PassengerContact';
import AdminPanel from './pages/AdminPanel';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    let profileChannel;

    if (session?.user?.id) {
      // 3. Real-time Profile Updates Listener
      profileChannel = supabase
        .channel(`public:profiles:id=eq.${session.user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` }, (payload) => {
          setProfile(payload.new);
        })
        .subscribe();
    }

    return () => {
      subscription.unsubscribe();
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, [session?.user?.id]);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error.message);
    } else if (data) {
      setProfile(data);
    } else {
      // If no profile exists, we might need to create one or just let them go to verification
      setProfile({ is_verified: false });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="welcome-container flex-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
          <div style={{ width: 40, height: 40, border: '4px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />
        </motion.div>
      </div>
    );
  }

  return (
    <NotificationProvider session={session}>
      <Router>
        <Toaster position="top-center" reverseOrder={false} />
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-indigo-500/30">
          <AnimatePresence mode="wait">
            <Routes>
              {!session ? (
                <>
                  <Route path="/home" element={<Login />} />
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </>
              ) : (!profile?.is_verified && profile?.role !== 'admin') ? (
                <>
                  <Route path="/unverified" element={<Unverified />} />
                  <Route path="/verification-form" element={<VerificationForm />} />
                  <Route path="/verification-pending" element={<VerificationPending />} />
                  <Route path="*" element={<Navigate to="/unverified" replace />} />
                </>
              ) : (
                <>
                  <Route path="/dashboard" element={<Dashboard profile={profile} />} />
                  <Route path="/post-ride" element={<PostRide />} />
                  <Route path="/ride-posted" element={<RidePosted />} />
                  <Route path="/search" element={<SearchRides />} />
                  <Route path="/request-ride/:rideId" element={<RequestRide />} />
                  <Route path="/request-sent" element={<RequestSent />} />
                  <Route path="/my-requests" element={<MyRequests />} />
                  <Route path="/ride-requests" element={<RideRequests />} />
                  <Route path="/report-user" element={<ReportUser />} />
                  <Route path="/unlock-contact/:requestId" element={<UnlockContact />} />
                  <Route path="/payment-submitted" element={<PaymentSubmitted />} />
                  <Route path="/passenger-unlocked/:requestId" element={<PassengerContact />} />
                  <Route path="/admin" element={
                    profile?.role === 'admin' ? <AdminPanel /> : <Navigate to="/dashboard" replace />
                  } />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </>
              )}
            </Routes>
          </AnimatePresence>
        </div>
      </Router>
    </NotificationProvider>
  );
}

export default App;
