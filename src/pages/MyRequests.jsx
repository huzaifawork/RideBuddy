import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const MyRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Ensure we remove any existing channel with this name to avoid "cannot add callbacks after subscribe" error
      await supabase.removeChannel(supabase.channel(`my-requests-${user.id}`));

      fetchMyRequests();

      channel = supabase
        .channel(`my-requests-${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `passenger_id=eq.${user.id}`
        }, (payload) => {
          console.log('Real-time update received:', payload);
          fetchMyRequests();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'payments'
        }, () => {
          fetchMyRequests();
        })
        .subscribe((status) => {
          console.log(`Subscription status for ${user.id}:`, status);
        });
    };

    setup();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const fetchMyRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        payments(status),
        ride:rides!requests_ride_id_fkey (
          id,
          origin,
          destination,
          price,
          departure_date,
          driver:profiles!rides_driver_id_fkey (
            id
          )
        )
      `)
      .eq('passenger_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) {
      const today = new Date(new Date().toISOString().split('T')[0]);
      const activeRequests = (data || []).filter(r => {
        const rideDate = new Date(r.ride?.departure_date);
        return rideDate >= today;
      });
      setRequests(activeRequests);
    }
    setLoading(false);
  };

  const getDisplayStatus = (req) => {
    if (req.status === 'rejected') return 'rejected';
    if (req.status === 'pending') return 'waiting';
    if (req.status === 'accepted') {
      const payment = req.payments && req.payments.length > 0 ? req.payments[0] : null;
      if (!payment || payment.status === 'pending') {
        return 'awaiting_driver';
      }
      if (payment.status === 'rejected') {
        return 'rejected';
      }
      if (payment.status === 'approved' || payment.status === 'verified') {
        return 'accepted';
      }
    }
    return req.status;
  };

  const getStatusStyle = (status) => {
    if (status === 'accepted') return { bg: '#f0fdf4', color: '#16a34a', icon: '✅', label: 'Accepted' };
    if (status === 'rejected') return { bg: '#fef2f2', color: '#dc2626', icon: '❌', label: 'Rejected' };
    if (status === 'awaiting_driver') return { bg: '#fefce8', color: '#d97706', icon: '⏳', label: 'Awaiting Driver Payment' };
    return { bg: '#fefce8', color: '#d97706', icon: '⌛', label: 'Waiting' };
  };

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        
        {/* Header - Left Aligned */}
        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.25rem' }}>My Requests</h1>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Track your ride requests</p>
        </div>

        {loading ? (
          <div style={{ padding: '4rem 0', color: '#94a3b8', textAlign: 'center' }}>
            <Loader2 size={32} style={{ margin: '0 auto 0.5rem', display: 'block' }} className="spin" />
            <p>Loading your requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📋</div>
            <p style={{ fontWeight: 700, color: '#475569', marginBottom: '1.5rem' }}>No requests sent yet</p>
            <button onClick={() => navigate('/search')} className="btn-blue" style={{ width: 'auto', padding: '0.75rem 2rem' }}>
              Browse Rides
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {requests.map((req, index) => {
              const displayStatus = getDisplayStatus(req);
              const statusStyle = getStatusStyle(displayStatus);
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  style={{ 
                    background: 'white', 
                    borderRadius: '1rem', 
                    padding: '1.25rem', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    textAlign: 'left'
                  }}
                >
                  {/* Card Header Info */}
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', marginBottom: '1rem' }}>
                    RIDE-{req.ride?.id?.slice(-4).toUpperCase()} | Driver: RB-{req.ride?.driver?.id?.slice(-4).toUpperCase()}
                  </div>

                  {/* Route with Icons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                      <MapPin size={14} color="#22c55e" style={{ marginTop: '2px' }} />
                      <div>
                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>Pickup</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{req.pickup_point || req.ride?.origin}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                      <MapPin size={14} color="#ef4444" style={{ marginTop: '2px' }} />
                      <div>
                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>Drop</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{req.dropoff_point || req.ride?.destination}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status Footer */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Status:</span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      backgroundColor: statusStyle.bg, 
                      color: statusStyle.color, 
                      padding: '0.35rem 0.75rem', 
                      borderRadius: '0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      {statusStyle.icon} {statusStyle.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Back to Home Link */}
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#64748b', 
              fontSize: '0.9rem', 
              fontWeight: 600,
              cursor: 'pointer' 
            }}
          >
            Go Back Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyRequests;
