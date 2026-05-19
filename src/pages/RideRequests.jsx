import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CheckCircle, XCircle, MapPin, AlertTriangle, Loader2, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const RideRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    let channel;

    const setup = async () => {
      // Clean up any existing channel with this name
      await supabase.removeChannel(supabase.channel('driver-requests'));

      fetchRequests();

      channel = supabase
        .channel('driver-requests')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'requests'
        }, () => fetchRequests())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'payments'
        }, () => fetchRequests())
        .subscribe();
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          ride:rides!requests_ride_id_fkey (
            id,
            origin,
            destination,
            price,
            driver_id,
            departure_date
          ),
          passenger:profiles!requests_passenger_id_fkey (
            id,
            full_name,
            phone,
            gender,
            report_count
          ),
          payments(id, status)
        `)
        .in('status', ['pending', 'accepted'])
        .eq('ride.driver_id', user.id);

      if (error) throw error;

      // Filter to only show requests for this driver's rides that are NOT expired
      const today = new Date(new Date().toISOString().split('T')[0]);
      const myRequests = (data || []).filter(r => {
        const isMyRide = r.ride?.driver_id === user.id;
        const rideDate = new Date(r.ride?.departure_date);
        return isMyRide && rideDate >= today;
      });
      
      setRequests(myRequests);
    } catch (err) {
      toast.error('Failed to load requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    setActionLoading(requestId + '-reject');
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;
      toast.error('Request rejected.');
      fetchRequests();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (request) => {
    setActionLoading(request.id + '-accept');
    try {
      // Check available seats before accepting
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .select('available_seats')
        .eq('id', request.ride.id)
        .single();

      if (rideError) throw rideError;

      if (request.seats_requested > rideData.available_seats) {
        toast.error(`Not enough seats! Only ${rideData.available_seats} seat(s) remaining.`);
        return;
      }

      const { error: reqUpdateError } = await supabase
        .from('requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (reqUpdateError) throw reqUpdateError;

      toast.success('Request accepted! Wait for payment to reserve seats.');
      navigate(`/unlock-contact/${request.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        
        {/* Header - Left Aligned */}
        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.25rem' }}>Ride Requests</h1>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Passengers requesting your rides</p>
        </div>

        {loading ? (
          <div style={{ padding: '4rem 0', color: '#94a3b8' }}>
            <Loader2 size={32} style={{ margin: '0 auto 0.5rem', display: 'block' }} className="spin" />
            <p>Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', border: '1px solid #f1f5f9', borderRadius: '1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
            <p style={{ fontWeight: 700, color: '#475569', margin: 0 }}>No requests yet</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>New passenger requests will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <AnimatePresence>
              {requests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
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
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', marginBottom: '1.25rem' }}>
                    RIDE-{req.ride?.id?.slice(-4).toUpperCase()} | 👤 RB-{req.passenger?.id?.slice(-4).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '1rem', backgroundColor: '#eff6ff', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>Seats Requested:</span>
                    <span style={{ fontWeight: 700, color: '#2563eb' }}>{req.seats_requested || 1} seat(s)</span>
                  </div>

                  {/* Route with Icons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
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

                  {/* Complaints Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '1.25rem' }}>
                    <span>Gender: <span style={{ fontWeight: 700, color: '#1e293b' }}>{req.passenger?.gender || 'N/A'}</span></span>
                    <span>Complaints: <span style={{ fontWeight: 700, color: req.passenger?.report_count > 0 ? '#ef4444' : '#64748b' }}>{req.passenger?.report_count || 0}</span></span>
                  </div>

                  {/* Action Buttons */}
                  {req.status === 'pending' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <button
                        onClick={() => handleAccept(req)}
                        disabled={!!actionLoading}
                        style={{
                          background: '#1d4ed8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '100px',
                          padding: '0.75rem',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          opacity: actionLoading ? 0.6 : 1
                        }}
                      >
                        {actionLoading === req.id + '-accept' ? '...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={!!actionLoading}
                        style={{
                          background: '#e2e8f0',
                          color: '#475569',
                          border: 'none',
                          borderRadius: '100px',
                          padding: '0.75rem',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          opacity: actionLoading ? 0.6 : 1
                        }}
                      >
                        {actionLoading === req.id + '-reject' ? '...' : 'Reject'}
                      </button>
                    </div>
                  ) : (
                    (() => {
                      const payment = req.payments && req.payments.length > 0 ? req.payments[0] : null;
                      const hasPayment = !!payment;
                      const isRejected = payment?.status === 'rejected';

                      return (
                        <button
                          onClick={() => {
                            if (isRejected) {
                              toast.error("Payment rejected.");
                              navigate(`/passenger-unlocked/${req.id}`);
                            } else if (hasPayment) {
                              navigate(`/passenger-unlocked/${req.id}`);
                            } else {
                              navigate(`/unlock-contact/${req.id}`);
                            }
                          }}
                          style={{
                            background: isRejected ? '#ef4444' : hasPayment ? '#10b981' : '#f59e0b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '100px',
                            padding: '0.75rem',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            width: '100%'
                          }}
                        >
                          {isRejected ? 'Payment Rejected' : hasPayment ? 'View Contact' : 'Complete Payment'}
                        </button>
                      );
                    })()
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
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

export default RideRequests;
