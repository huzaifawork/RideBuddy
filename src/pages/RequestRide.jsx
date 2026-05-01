import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ArrowLeft, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const RequestRide = () => {
  const navigate = useNavigate();
  const { rideId } = useParams();
  const [loading, setLoading] = useState(false);
  const [rideDetails, setRideDetails] = useState(null);
  const [formData, setFormData] = useState({
    pickup_point: '',
    dropoff_point: '',
    seats_requested: 1
  });

  useEffect(() => {
    fetchRideDetails();
  }, [rideId]);

  const fetchRideDetails = async () => {
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        driver:profiles!rides_driver_id_fkey (
          id,
          full_name,
          gender
        )
      `)
      .eq('id', rideId)
      .single();

    if (!error) setRideDetails(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Check if already requested
      const { data: existing } = await supabase
        .from('requests')
        .select('id')
        .eq('ride_id', rideId)
        .eq('passenger_id', user.id)
        .maybeSingle();

      if (existing) {
        toast.error('You have already requested this ride!');
        return;
      }

      if (parseInt(formData.seats_requested) > (rideDetails?.available_seats || 0)) {
        toast.error('Not enough seats available!');
        return;
      }

      const { error } = await supabase
        .from('requests')
        .insert([{
          ride_id: rideId,
          passenger_id: user.id,
          pickup_point: formData.pickup_point,
          dropoff_point: formData.dropoff_point,
          seats_requested: parseInt(formData.seats_requested),
          status: 'pending'
        }]);

      if (error) throw error;

      navigate('/request-sent');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalFare = rideDetails ? (rideDetails.price * formData.seats_requested) : 0;

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto', textAlign: 'center' }}>
        
        {/* Header */}
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.25rem' }}>Request Ride</h1>
        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '2.5rem' }}>Fill your pickup and drop details</p>

        {/* Ride Information Card */}
        {rideDetails ? (
          <div style={{
            backgroundColor: '#eff6ff',
            borderRadius: '1rem',
            padding: '1.5rem',
            textAlign: 'left',
            marginBottom: '2rem'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Ride Information</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Ride Code:</span>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>RIDE-{rideDetails.id?.slice(-4).toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Route:</span>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>{rideDetails.origin} — {rideDetails.destination}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Fare:</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>PKR {rideDetails.price} / seat</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Available:</span>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>{rideDetails.available_seats} seats left</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem', color: '#94a3b8' }}>Loading ride info...</div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.5rem' }}>
                Seats Needed
              </label>
              <select
                className="input-field"
                value={formData.seats_requested}
                onChange={(e) => setFormData({ ...formData, seats_requested: parseInt(e.target.value) })}
                style={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: 'white', height: '3rem' }}
              >
                {[...Array(rideDetails?.available_seats || 4)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1} {i === 0 ? 'Seat' : 'Seats'}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.5rem' }}>
                Total Fare
              </label>
              <div style={{ height: '3rem', display: 'flex', alignItems: 'center', fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>
                PKR {totalFare}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.6rem' }}>
              Pickup Point
            </label>
            <input
              type="text"
              placeholder="Enter pickup location"
              value={formData.pickup_point}
              onChange={(e) => setFormData({ ...formData, pickup_point: e.target.value })}
              required
              className="input-field"
              style={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: 'white', height: '3rem' }}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.6rem' }}>
              Drop-off Point
            </label>
            <input
              type="text"
              placeholder="Enter drop-off location"
              value={formData.dropoff_point}
              onChange={(e) => setFormData({ ...formData, dropoff_point: e.target.value })}
              required
              className="input-field"
              style={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: 'white', height: '3rem' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-blue"
            style={{ 
              height: '3.5rem', 
              borderRadius: '1rem',
              backgroundColor: '#cbd5e1', // Light blue-gray as in mockup
              color: 'white',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? <Loader2 className="spin" /> : 'Send Request'}
          </button>
        </form>

        <button
          onClick={() => navigate('/dashboard')}
          style={{ 
            marginTop: '1.5rem', 
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
  );
};

export default RequestRide;
