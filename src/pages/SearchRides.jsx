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
  const [myRequests, setMyRequests] = useState([]);

  const VEHICLE_TYPES = [
    { label: 'All', value: '' },
    { label: 'Bike', value: 'bike', icon: '/icons/bike.svg' },
    { label: 'Mini Car', value: 'mini_car', icon: '/icons/mini_car.svg' },
    { label: 'Rickshaw', value: 'rickshaw', icon: '/icons/rickshaw.svg' },
    { label: 'Ride AC', value: 'ride_ac', icon: '/icons/ride_ac_clear.svg' },
    { label: 'Premium', value: 'premium_sedan', icon: '/icons/premium_sedan_clear.svg' },
  ];

  const [filters, setFilters] = useState({
    search: '',
    date: '',
    maxPrice: '',
    vehicleType: ''
  });

  useEffect(() => {
    let ridesChannel;
    let profilesChannel;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Clean up any existing channels
      await supabase.removeAllChannels();

      fetchMyProfileAndRides();

      ridesChannel = supabase
        .channel('search-rides')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => fetchMyProfileAndRides())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => fetchMyProfileAndRides())
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'requests',
          filter: user ? `passenger_id=eq.${user.id}` : undefined 
        }, () => fetchMyProfileAndRides())
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'payments'
        }, () => fetchMyProfileAndRides())
        .subscribe();
    };

    setup();

    return () => {
      supabase.removeAllChannels();
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
        .select('id, gender, role, is_verified')
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
        .not('available_seats', 'is', null)
        .gt('available_seats', 0)
        .gte('departure_date', new Date().toISOString().split('T')[0]); // Hide expired rides

      // All users can now see all rides regardless of gender


      const { data: ridesData, error } = await query.order('departure_date', { ascending: true });

      if (error) throw error;

      // Admin sees all rides, otherwise filter by gender preference
      const isAdmin = profile?.role === 'admin';
      const filtered = (ridesData || []).filter(ride => {
        if (isAdmin) return true;
        return ride.gender_preference === profile?.gender;
      });

      setRides(filtered);

      // Fetch my requests to show badges (latest first)
      if (user) {
        const { data: requestsData } = await supabase
          .from('requests')
          .select('ride_id, status, created_at, payments(status)')
          .eq('passenger_id', user.id)
          .order('created_at', { ascending: false });
        setMyRequests(requestsData || []);
      }
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

    if (filters.vehicleType) {
      result = result.filter(r => r.vehicle_type === filters.vehicleType);
    }

    setFilteredRides(result);
  };

  const handleRequestRide = (rideId) => {
    navigate(`/request-ride/${rideId}`);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '--';
    let time = timeStr;
    if (timeStr.includes('T')) {
      time = timeStr.split('T')[1];
    }
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${m} ${ampm}`;
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

          {/* Vehicle Type Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {VEHICLE_TYPES.map(v => (
              <button
                key={v.value}
                onClick={() => setFilters({ ...filters, vehicleType: v.value })}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '0.75rem',
                  border: filters.vehicleType === v.value ? '2px solid #2563eb' : '2px solid #e2e8f0',
                  backgroundColor: filters.vehicleType === v.value ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  minWidth: v.value === '' ? '3rem' : '3.5rem',
                  flexShrink: 0
                }}
              >
                {v.icon ? <img src={v.icon} alt={v.label} style={{ width: '28px', height: '20px', objectFit: 'contain' }} /> : <span style={{ fontSize: '0.75rem' }}>🚗</span>}
                <span style={{ fontSize: '0.55rem', fontWeight: 600, color: filters.vehicleType === v.value ? '#2563eb' : '#64748b', whiteSpace: 'nowrap' }}>{v.label}</span>
              </button>
            ))}
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
            {filteredRides.map((ride, index) => {
              const myRequest = myRequests.find(req => req.ride_id === ride.id);
              
              return (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'white',
                    borderRadius: '1.25rem',
                    padding: '1.25rem',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                    position: 'relative'
                  }}
                >
                  {/* Status Badge */}
                  {myRequest && (() => {
                    let badgeText = '';
                    let badgeColor = '#3b82f6';
                    let badgeBg = '#eff6ff';
                    let borderColor = '#dbeafe';

                    const paymentStatus = myRequest.payments?.[0]?.status;

                    if (myRequest.status === 'pending') {
                      badgeText = 'Request Sent!';
                    } else if (myRequest.status === 'accepted') {
                      if (!paymentStatus || paymentStatus === 'pending') {
                        badgeText = 'Awaiting Approval';
                        badgeColor = '#f59e0b';
                        badgeBg = '#fffbeb';
                        borderColor = '#fef3c7';
                      } else if (paymentStatus === 'approved') {
                        badgeText = 'Seats Confirmed!';
                        badgeColor = '#10b981';
                        badgeBg = '#ecfdf5';
                        borderColor = '#d1fae5';
                      } else if (paymentStatus === 'rejected') {
                        badgeText = 'Rejected - No Seats';
                        badgeColor = '#dc2626';
                        badgeBg = '#fef2f2';
                        borderColor = '#fecaca';
                      }
                    } else if (myRequest.status === 'rejected') {
                      badgeText = 'Rejected - No Seats';
                      badgeColor = '#dc2626';
                      badgeBg = '#fef2f2';
                      borderColor = '#fecaca';
                    }

                    return (
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        padding: '0.35rem 0.7rem',
                        borderRadius: '2rem',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        border: `1px solid ${borderColor}`,
                        zIndex: 10
                      }}>
                        <div style={{ 
                          width: '5px', 
                          height: '5px', 
                          borderRadius: '50%', 
                          backgroundColor: 'currentColor' 
                        }} />
                        {badgeText}
                      </div>
                    );
                  })()}

                {/* ID Header + Vehicle Icon Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  {(() => {
                    const v = VEHICLE_TYPES.find(vt => vt.value === ride.vehicle_type);
                    return v?.icon ? (
                      <img src={v.icon} alt={v.label} style={{ width: '72px', height: '50px', objectFit: 'contain', flexShrink: 0 }} />
                    ) : <div style={{ width: '72px' }} />;
                  })()}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.6rem', color: '#94a3b8', margin: '0 0 0.2rem', fontWeight: 600 }}>
                      RIDE-{ride.id?.slice(-4).toUpperCase()} | Driver: RB-{ride.driver?.id?.slice(-4).toUpperCase()}
                    </p>
                    {(() => {
                      const v = VEHICLE_TYPES.find(vt => vt.value === ride.vehicle_type);
                      return v ? <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{v.label}</p> : null;
                    })()}
                  </div>
                </div>

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
                {ride.driver_id === myProfile?.id ? (
                  <div
                    style={{
                      width: '100%',
                      height: '2.75rem',
                      borderRadius: '100px',
                      background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
                      border: '1.5px solid #86efac',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#16a34a'
                    }}
                  >
                    ✅ Offered by you
                  </div>
                ) : (
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
                )}
                </motion.div>
                );
            })}

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
