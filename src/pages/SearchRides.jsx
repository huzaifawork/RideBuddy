import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Clock, Search, SlidersHorizontal,
  ArrowLeft, ArrowRight, User, AlertTriangle, ChevronDown, X,
  DollarSign, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const SearchRides = () => {
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [filteredRides, setFilteredRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [requestingId, setRequestingId] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    date: '',
    maxPrice: ''
  });

  useEffect(() => {
    let ridesChannel;
    let profilesChannel;

    const setup = async () => {
      // Clean up any existing channels with these names
      await supabase.removeChannel(supabase.channel('search-rides'));
      await supabase.removeChannel(supabase.channel('search-profiles'));

      fetchMyProfileAndRides();

      ridesChannel = supabase
        .channel('search-rides')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => fetchMyProfileAndRides())
        .subscribe();

      profilesChannel = supabase
        .channel('search-profiles')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => fetchMyProfileAndRides())
        .subscribe();
    };

    setup();

    return () => {
      if (ridesChannel) supabase.removeChannel(ridesChannel);
      if (profilesChannel) supabase.removeChannel(profilesChannel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, rides]);

  const fetchMyProfileAndRides = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get my profile to know my gender
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, gender, role')
        .eq('id', user.id)
        .single();

      setMyProfile(profile);

      // Fetch rides
      let query = supabase
        .from('rides')
        .select(`
          *,
          driver:profiles!rides_driver_id_fkey (
            id,
            full_name,
            gender,
            report_count
          )
        `)
        .eq('status', 'active')
        .not('available_seats', 'is', null) // Hide legacy rides without seat data
        .gt('available_seats', 0); // Hide full rides

      // Admins see everything. Students only see rides matching their gender
      if (profile?.role !== 'admin') {
        if (profile?.gender) {
          query = query.eq('gender_preference', profile.gender);
        }
        query = query.neq('driver_id', user.id);
      }

      const { data: ridesData, error } = await query.order('departure_date', { ascending: true });

      if (error) throw error;
      setRides(ridesData || []);
    } catch (err) {
      toast.error('Failed to load rides: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...rides];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(r =>
        r.origin?.toLowerCase().includes(q) ||
        r.destination?.toLowerCase().includes(q)
      );
    }

    if (filters.date) {
      result = result.filter(r => r.departure_date === filters.date);
    }

    if (filters.maxPrice) {
      result = result.filter(r => parseFloat(r.price) <= parseFloat(filters.maxPrice));
    }

    setFilteredRides(result);
  };

  const handleRequestRide = (rideId) => {
    navigate(`/request-ride/${rideId}`);
  };

  const formatTime = (time) => {
    if (!time) return '--';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const formatDate = (date) => {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '0.5rem 1.5rem' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        {/* Header */}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.2rem', textAlign: 'left' }}>Available Rides</h1>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem', textAlign: 'left' }}>Choose a ride that fits your schedule</p>

        {/* Search & Filters */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by area"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input-field"
              style={{ paddingLeft: '3rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', background: 'white', color: '#1e293b' }}
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="input-field"
              style={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', background: 'white', color: '#64748b' }}
            />
            <input
              type="number"
              placeholder="Max price"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
              className="input-field"
              style={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', background: 'white', color: '#1e293b' }}
            />
          </div>
        </div>

        {/* Ride Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto' }} />
          </div>
        ) : filteredRides.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
            <p>No rides available right now</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {filteredRides.map((ride, index) => (
              <motion.div
                key={ride.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'white',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)'
                }}
              >
                {/* ID Header */}
                <p style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>
                  RIDE-{ride.id?.slice(-4).toUpperCase()} | Driver: RB-{ride.driver?.id?.slice(-4).toUpperCase()}
                </p>

                {/* Route */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <MapPin size={14} color="#3b82f6" />
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    {ride.origin} → {ride.destination}
                  </p>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
                    <p style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '0.1rem' }}>Date</p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', margin: 0 }}>
                      {new Date(ride.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '0.1rem' }}>Seats Left</p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: ride.available_seats <= 1 ? '#ef4444' : '#10b981', margin: 0 }}>
                      {ride.available_seats}/{ride.total_seats}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '0.1rem' }}>Gender</p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', margin: 0 }}>{ride.driver?.gender}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '0.1rem' }}>Departure</p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', margin: 0 }}>{formatTime(ride.departure_time)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '0.1rem' }}>Arrival</p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', margin: 0 }}>{formatTime(ride.arrival_time)}</p>
                  </div>
                </div>

                {/* Footer: Price + Complaints */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <DollarSign size={14} color="#10b981" />
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>Rs. {ride.price}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                    Complaints: {ride.driver?.report_count || 0}
                  </span>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleRequestRide(ride.id)}
                  className="btn-pill"
                  style={{
                    backgroundColor: '#1d4ed8',
                    color: 'white',
                    width: '100%',
                    height: '2.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}
                >
                  Request Ride
                </button>
              </motion.div>
            ))}

            {/* Back to Home Button at bottom */}
            <button 
              onClick={() => navigate('/dashboard')}
              style={{ 
                marginTop: '2rem',
                marginBottom: '4rem',
                width: '100%',
                height: '3.5rem',
                backgroundColor: 'white',
                color: '#1d4ed8',
                border: '2px solid #eff6ff',
                borderRadius: '1rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
              }}
            >
              <ArrowLeft size={18} />
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchRides;
