import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Clock, DollarSign, Loader2, User, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const PostRide = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    date: '',
    departure_time: '',
    arrival_time: '',
    price: '',
    available_seats: 4,
    vehicle_type: ''
  });

  const VEHICLE_TYPES = [
    { label: 'Bike', value: 'bike', icon: '/icons/bike.svg' },
    { label: 'Mini Car', value: 'mini_car', icon: '/icons/mini_car.svg' },
    { label: 'Rickshaw', value: 'rickshaw', icon: '/icons/rickshaw.svg' },
    { label: 'Ride AC', value: 'ride_ac', icon: '/icons/ride_ac_clear.svg' },
    { label: 'Premium', value: 'premium_sedan', icon: '/icons/premium_sedan_clear.svg' },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('gender, full_name')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!profile?.gender) {
        throw new Error('Your gender has not been assigned yet. Please wait for admin verification.');
      }

      // Prevent past dates
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        throw new Error('You cannot post a ride for a past date.');
      }

      // departure_time is likely a TIMESTAMP (needs date + time)
      // arrival_time is likely a TIME (needs only HH:mm:ss)
      const departureTimestamp = `${formData.date}T${formData.departure_time}:00`;
      const arrivalTimeString = `${formData.arrival_time}:00`;

      const { data: rideData, error } = await supabase
        .from('rides')
        .insert([{
          driver_id: user.id,
          origin: formData.origin,
          destination: formData.destination,
          departure_date: formData.date,
          departure_time: departureTimestamp,
          arrival_time: arrivalTimeString,
          price: parseFloat(formData.price),
          total_seats: parseInt(formData.available_seats), 
          available_seats: parseInt(formData.available_seats),
          gender_preference: profile.gender,
          vehicle_type: formData.vehicle_type,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Ride posted successfully!');
      navigate('/ride-posted', { state: { rideId: rideData.id } });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="welcome-container" style={{ justifyContent: 'flex-start', paddingTop: '1rem', backgroundColor: 'white', overflow: 'hidden' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '90%', maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}
      >
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.05rem' }}>Offer a Ride</h1>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Fill in ride details</p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          {/* Origin */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>From</label>
            <input
              type="text"
              className="input-field"
              style={{ height: '3rem', fontSize: '0.9rem' }}
              placeholder="Starting location"
              value={formData.origin}
              onChange={(e) => setFormData({...formData, origin: e.target.value})}
              required
            />
          </div>

          {/* Destination */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>To</label>
            <input
              type="text"
              className="input-field"
              style={{ height: '3rem', fontSize: '0.9rem' }}
              placeholder="Destination"
              value={formData.destination}
              onChange={(e) => setFormData({...formData, destination: e.target.value})}
              required
            />
          </div>

          {/* Date */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Date</label>
            <input
              type="date"
              className="input-field"
              style={{ height: '3rem', fontSize: '0.9rem' }}
              value={formData.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>

          {/* Available Seats */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Available Seats</label>
            <input
              type="number"
              min="1"
              max="10"
              className="input-field"
              style={{ height: '3rem', fontSize: '0.9rem' }}
              value={formData.available_seats}
              onChange={(e) => setFormData({...formData, available_seats: e.target.value})}
              required
            />
          </div>

          {/* Departure Time */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Departure Time</label>
            <input
              type="time"
              className="input-field"
              style={{ height: '3rem', fontSize: '0.9rem' }}
              value={formData.departure_time}
              onChange={(e) => setFormData({...formData, departure_time: e.target.value})}
              required
            />
          </div>

          {/* Arrival Time */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Arrival Time</label>
            <input
              type="time"
              className="input-field"
              style={{ height: '3rem', fontSize: '0.9rem' }}
              value={formData.arrival_time}
              onChange={(e) => setFormData({...formData, arrival_time: e.target.value})}
              required
            />
          </div>

          {/* Price */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Fare per Seat (PKR)</label>
            <input
              type="number"
              className="input-field"
              style={{ height: '3rem', fontSize: '0.9rem' }}
              placeholder="e.g. 500"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              required
            />
          </div>

          {/* Vehicle Type Selector */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Vehicle Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {VEHICLE_TYPES.map(v => (
                <div
                  key={v.value}
                  onClick={() => setFormData({...formData, vehicle_type: v.value})}
                  style={{
                    background: formData.vehicle_type === v.value ? '#eff6ff' : '#fff',
                    borderRadius: '18px',
                    padding: '1rem 0.5rem',
                    textAlign: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    border: formData.vehicle_type === v.value ? '2px solid #2563eb' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  <img src={v.icon} alt={v.label} style={{ width: '80px', height: '56px', objectFit: 'contain' }} />
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', fontWeight: 700, color: formData.vehicle_type === v.value ? '#2563eb' : '#111827' }}>{v.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gender Display Row */}
          <div style={{
            background: '#eff6ff',
            borderRadius: '0.6rem',
            padding: '0.5rem 0.75rem',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Gender:</span>
            <span style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 700 }}>
              {profile?.gender ? `${profile.gender} (verified)` : 'Loading...'}
            </span>
          </div>

          <button 
            type="submit" 
            className="btn-pill" 
            disabled={loading}
            style={{ 
              backgroundColor: '#2563eb', 
              color: 'white',
              height: '2.75rem',
              width: '100%',
              marginBottom: '0.5rem',
              fontSize: '0.85rem'
            }}
          >
            {loading ? <Loader2 className="spin" /> : 'Post Ride'}
          </button>

          <button 
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{ 
              width: '100%', 
              background: 'none', 
              border: 'none', 
              color: '#64748b',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              paddingBottom: '0.5rem'
            }}
          >
            Go Back Home
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default PostRide;
