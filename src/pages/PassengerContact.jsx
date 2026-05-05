import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const PassengerContact = () => {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);

  useEffect(() => {
    fetchContactData();

    // Real-time: listen for admin payment approval
    const channel = supabase
      .channel('payment-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'payments'
      }, () => fetchContactData())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [requestId]);

  const fetchContactData = async () => {
    try {
      // Get request with passenger phone and ride details
      const { data: reqData, error } = await supabase
        .from('requests')
        .select(`
          *,
          ride:rides!requests_ride_id_fkey (
            id,
            origin,
            destination,
            price
          ),
          passenger:profiles!requests_passenger_id_fkey (
            id,
            full_name,
            phone,
            gender
          )
        `)
        .eq('id', requestId)
        .single();

      if (error) throw error;
      setData(reqData);

      // Check if payment is verified by admin
      const { data: payment } = await supabase
        .from('payments')
        .select('status')
        .eq('request_id', requestId)
        .single();

      setPaymentVerified(payment?.status === 'approved');
      setData(prev => ({ ...prev, paymentStatus: payment?.status }));
    } catch (err) {
      toast.error('Error loading contact: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="welcome-container">
        <Loader2 size={32} color="white" />
      </div>
    );
  }

  if (!paymentVerified) {
    const isRejected = data?.paymentStatus === 'rejected';
    return (
      <div style={{ 
        backgroundColor: 'white', 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '2rem',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>{isRejected ? '❌' : '⏳'}</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: isRejected ? '#dc2626' : '#1e293b', marginBottom: '0.75rem' }}>
            {isRejected ? 'Payment Rejected' : 'Awaiting Admin Approval'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            {isRejected 
              ? 'Your payment was rejected by the admin. Please try submitting again or contact support.'
              : "Your payment is being reviewed. Once verified, the passenger's contact will appear here automatically."}
          </p>
          {!isRejected && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', marginBottom: '2rem', fontSize: '0.8rem', color: '#64748b' }}>
              💡 This page will update automatically!
            </div>
          )}
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn-pill"
            style={{ backgroundColor: '#1e293b', color: 'white', width: '100%', height: '3.5rem', fontWeight: 700 }}
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: 'white', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '2rem',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem' }}>Passenger Contact</h1>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#16a34a', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2rem' }}>
          <CheckCircle size={16} />
          <span>Payment Verified</span>
        </div>

        {/* Passenger Information Card */}
        <div style={{ backgroundColor: '#eff6ff', padding: '1.25rem 1.5rem', borderRadius: '1rem', textAlign: 'left', marginBottom: '1rem', border: '1px solid #dbeafe' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>Passenger Information</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Passenger Code:</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>RB-{data?.passenger?.id?.slice(-4).toUpperCase() || '1024'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Gender:</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>{data?.passenger?.gender || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Phone Number:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#1e293b' }}>
              <Phone size={14} style={{ color: '#64748b' }} />
              <span>{data?.passenger?.phone || 'Not Available'}</span>
            </div>
          </div>
        </div>

        {/* Ride Details */}
        <div style={{ backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', textAlign: 'left', marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>Ride Details</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Ride Code:</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>RIDE-{data?.ride?.id?.slice(-4).toUpperCase() || '1021'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Pickup:</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>{data?.pickup_point || 'aa'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Drop:</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>{data?.dropoff_point || 'aa'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <button
          onClick={() => {
            const phone = data?.passenger?.phone?.replace(/\D/g, '');
            if (phone) window.open(`https://wa.me/92${phone.slice(-10)}`, '_blank');
            else toast.error('No phone number available');
          }}
          style={{ 
            height: '3.5rem', 
            background: '#00a859', 
            marginBottom: '1rem', 
            width: '100%', 
            fontSize: '0.95rem', 
            fontWeight: 700, 
            border: 'none', 
            cursor: 'pointer', 
            color: 'white',
            borderRadius: '100px',
            transition: 'all 0.2s ease'
          }}
        >
          Contact via WhatsApp
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          style={{ 
            height: '3.5rem', 
            background: '#e2e8f0', 
            color: '#475569', 
            fontSize: '0.95rem', 
            fontWeight: 700, 
            width: '100%', 
            border: 'none', 
            cursor: 'pointer',
            borderRadius: '100px',
            transition: 'all 0.2s ease'
          }}
        >
          Go Back Home
        </button>
      </div>
    </div>
  );
};

export default PassengerContact;
