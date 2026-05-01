import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const PaymentSubmitted = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const requestId = location.state?.requestId;
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!requestId) {
      navigate('/dashboard');
      return;
    }

    // 1. Initial check (in case it was approved instantly)
    checkPaymentStatus();

    // 2. Real-time listener
    const channel = supabase
      .channel(`payment-wait-${requestId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `request_id=eq.${requestId}` },
        (payload) => {
          if (payload.new.status === 'approved') {
            toast.success('Admin verified your payment!');
            navigate(`/passenger-unlocked/${requestId}`);
          } else if (payload.new.status === 'rejected') {
            toast.error('Payment was rejected. Please contact support or try again.');
            navigate('/dashboard');
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [requestId]);

  const checkPaymentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('status')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        if (data.status === 'approved') {
          navigate(`/passenger-unlocked/${requestId}`);
        } else if (data.status === 'rejected') {
          toast.error('Payment was rejected.');
          navigate('/dashboard');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

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
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
          Payment submitted!
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
          Admin will verify your payment shortly.
        </p>

        <button 
          onClick={() => navigate(`/passenger-unlocked/${requestId}`)} 
          className="btn-pill"
          style={{ 
            backgroundColor: '#059669', 
            color: 'white', 
            width: '100%', 
            height: '3.5rem', 
            fontSize: '0.95rem', 
            fontWeight: 700,
            marginBottom: '1.5rem',
            boxShadow: 'none'
          }}
        >
          Proceed to Contact
        </button>

        <button 
          onClick={() => navigate('/dashboard')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#64748b', 
            fontSize: '0.85rem', 
            fontWeight: 600, 
            cursor: 'pointer' 
          }}
        >
          Go Back Home
        </button>
      </div>
    </div>
  );
};

export default PaymentSubmitted;
