import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const PAYMENT_NUMBER = '03352005507 SadaPay';

const UnlockContact = () => {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestData, setRequestData] = useState(null);

  useEffect(() => {
    fetchRequestData();
  }, [requestId]);

  const fetchRequestData = async () => {
    const { data, error } = await supabase
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
          full_name
        )
      `)
      .eq('id', requestId)
      .single();

    if (!error) setRequestData(data);
  };

  const totalRidePrice = requestData ? parseFloat(requestData.ride?.price || 0) * (requestData.seats_requested || 1) : 0;
  const platformFee = Math.round(totalRidePrice * 0.05);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please upload a payment screenshot first.');
      return;
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Upload screenshot to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `payments/${requestId}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('Verification')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('Verification')
        .getPublicUrl(filePath);

      // 2. Insert payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          request_id: requestId,
          payer_id: user.id,
          amount: platformFee,
          screenshot_url: publicUrl,
          status: 'pending'
        }]);

      if (paymentError) throw paymentError;

      toast.success('Payment submitted! Waiting for admin verification.');
      navigate('/payment-submitted', { state: { requestId } });
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
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
      padding: '1.5rem',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.2rem' }}>Unlock Passenger Contact</h1>
        </div>

        {/* Ride Info Summary */}
        <div style={{ backgroundColor: '#eff6ff', padding: '1rem 1.25rem', borderRadius: '1rem', textAlign: 'left', marginBottom: '1rem', border: '1px solid #dbeafe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Ride Code:</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>RIDE-{requestData?.ride?.id?.slice(-4).toUpperCase() || '1021'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Passenger Code:</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>RB-{requestData?.passenger?.id?.slice(-4).toUpperCase() || '1024'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Pickup:</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>{requestData?.pickup_point || 'aa'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Drop:</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>{requestData?.dropoff_point || 'aa'}</span>
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem', textAlign: 'left', marginLeft: '0.5rem' }}>
          Pay 5% of ride price to unlock contact details
        </p>

        {/* Price Breakdown */}
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.8rem', border: '1px solid #f1f5f9', textAlign: 'left', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#1e293b', fontWeight: 500 }}>Ride Price:</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>
              Rs. {totalRidePrice.toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', paddingTop: '0.6rem', borderTop: '1px dashed #e2e8f0' }}>
            <span style={{ color: '#3b82f6', fontWeight: 600 }}>Platform Fee (5%):</span>
            <span style={{ fontWeight: 800, color: '#3b82f6' }}>Rs. {platformFee}</span>
          </div>
        </div>

        {/* Payment Instruction */}
        <div style={{ backgroundColor: '#fefce8', padding: '1rem', borderRadius: '0.8rem', fontSize: '0.8rem', color: '#854d0e', textAlign: 'left', marginBottom: '1rem', border: '1px solid #fef08a' }}>
          Send payment to: <strong>{PAYMENT_NUMBER}</strong>
        </div>

        {/* Upload Box */}
        <form onSubmit={handleSubmit}>
          <label style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '1.5rem', 
            border: '2px dashed #e2e8f0', 
            borderRadius: '1.25rem', 
            backgroundColor: '#f8fafc',
            cursor: 'pointer',
            marginBottom: '1rem',
            transition: 'all 0.2s ease'
          }}>
            <Upload size={28} color="#94a3b8" />
            <span style={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>Upload payment screenshot</span>
            <div style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600 }}>
              {file ? 'Change File' : 'Upload File'}
            </div>
            <input
              type="file"
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files[0])}
              accept="image/*"
            />
            {file && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.25rem' }}>
                <CheckCircle size={14} /> {file.name}
              </div>
            )}
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn-pill"
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              height: '3.2rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              width: '100%',
              marginBottom: '0.75rem',
              boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Submitting...' : 'Submit Payment'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '0.25rem'
          }}
        >
          Go Back Home
        </button>
      </div>
    </div>
  );
};

export default UnlockContact;
