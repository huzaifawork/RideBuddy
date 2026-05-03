import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, XCircle, User, Clock, Loader2, AlertTriangle, CreditCard, Flag, Car, ExternalLink, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [userRequests, setUserRequests] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [rides, setRides] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchData();

    // Real-time listeners for Admin Panel
    const profilesChannel = supabase.channel('admin-profiles').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => activeTab === 'users' && fetchData()).subscribe();
    const paymentsChannel = supabase.channel('admin-payments').on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => activeTab === 'payments' && fetchData()).subscribe();
    const reportsChannel = supabase.channel('admin-reports').on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => activeTab === 'complaints' && fetchData()).subscribe();
    const ridesChannel = supabase.channel('admin-rides').on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => activeTab === 'rides' && fetchData()).subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(ridesChannel);
    };
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_verified', false)
          .not('full_name', 'is', null);
        if (!error) setUserRequests(data || []);

      } else if (activeTab === 'payments') {
        const { data, error } = await supabase
          .from('payments')
          .select(`
            *,
            payer:profiles!payments_payer_id_fkey (full_name, id),
            request:requests!payments_request_id_fkey (
              id,
              pickup_point,
              dropoff_point,
              seats_requested,
              ride:rides!requests_ride_id_fkey (
                id,
                origin,
                destination,
                price,
                available_seats
              )
            )
          `)
          .eq('status', 'pending');
        if (!error) setPaymentRequests(data || []);

      } else if (activeTab === 'complaints') {
        const { data, error } = await supabase
          .from('reports')
          .select(`
            *,
            reporter:profiles!reports_reporter_id_fkey (id, full_name, phone),
            reported:profiles!reports_reported_id_fkey (id, full_name, phone, report_count)
          `)
          .eq('status', 'pending');
        if (!error) setComplaints(data || []);
      } else if (activeTab === 'rides') {
        const { data, error } = await supabase
          .from('rides')
          .select(`
            *,
            driver:profiles!rides_driver_id_fkey (full_name, id)
          `)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching admin rides:', error);
          throw error;
        }
        setRides(data || []);
      }
    } catch (err) {
      console.error('Admin Panel Error:', err);
      toast.error('Error loading data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- USER VERIFICATION ---
  const handleApproveUser = async (userId) => {
    const gender = selectedGenders[userId];
    if (!gender) { toast.error('Please assign a gender first'); return; }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: true, gender })
        .eq('id', userId);
      if (error) throw error;
      toast.success('User verified successfully!');
      fetchData();
    } catch (err) { toast.error('Error: ' + err.message); }
  };

  const handleRejectUser = async (userId) => {
    if (!window.confirm('Reject this verification?')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: false, full_name: null })
        .eq('id', userId);
      if (error) throw error;
      toast.error('Verification rejected.');
      fetchData();
    } catch (err) { toast.error('Error: ' + err.message); }
  };

  const handleGenderChange = (userId, gender) => {
    setSelectedGenders({ ...selectedGenders, [userId]: gender });
  };

  // --- PAYMENT VERIFICATION ---
  const handleApprovePayment = async (payment) => {
    try {
      // Approve the payment status
      const { error: payError } = await supabase
        .from('payments')
        .update({ status: 'approved' })
        .eq('id', payment.id);
      if (payError) throw payError;

      toast.success('Payment approved! Passenger contact shared.');
      fetchData();
    } catch (err) { toast.error('Error: ' + err.message); }
  };

  const handleRejectPayment = async (paymentId) => {
    if (!window.confirm('Reject this payment?')) return;
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'rejected' })
        .eq('id', paymentId);
      if (error) throw error;
      toast.error('Payment rejected.');
      fetchData();
    } catch (err) { toast.error('Error: ' + err.message); }
  };

  // --- COMPLAINT HANDLING ---
  const [processingComplaint, setProcessingComplaint] = useState(null);

  const handleApproveComplaint = async (complaint) => {
    if (processingComplaint === complaint.id) return;
    setProcessingComplaint(complaint.id);
    
    try {
      // 1. Mark complaint as resolved (using 'resolved' to match DB default)
      const { error: reportError } = await supabase
        .from('reports')
        .update({ status: 'resolved' })
        .eq('id', complaint.id);
      
      if (reportError) throw reportError;

      // 2. Increment reported user's complaint count
      const newCount = (complaint.reported?.report_count || 0) + 1;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ report_count: newCount })
        .eq('id', complaint.reported_id);
      
      if (profileError) throw profileError;

      toast.success(`Complaint approved. ${complaint.reported?.full_name}'s count is now ${newCount}.`);
      await fetchData();
    } catch (err) { 
      toast.error('Error: ' + err.message); 
    } finally {
      setProcessingComplaint(null);
    }
  };

  const handleDismissComplaint = async (complaintId) => {
    if (processingComplaint === complaintId) return;
    setProcessingComplaint(complaintId);
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'dismissed' })
        .eq('id', complaintId);
      if (error) throw error;
      toast.success('Complaint dismissed.');
      await fetchData();
    } catch (err) { 
      toast.error('Error: ' + err.message); 
    } finally {
      setProcessingComplaint(null);
    }
  };

  // --- RIDE DELETION ---
  const handleDeleteRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to delete this ride? This action cannot be undone.')) return;
    try {
      // Delete related requests first (foreign key constraint)
      const { error: reqError } = await supabase
        .from('requests')
        .delete()
        .eq('ride_id', rideId);
      if (reqError) throw reqError;

      const { error } = await supabase
        .from('rides')
        .delete()
        .eq('id', rideId);
      if (error) throw error;
      toast.success('Ride deleted successfully.');
      fetchData();
    } catch (err) { toast.error('Error deleting ride: ' + err.message); }
  };

  const tabs = [
    { key: 'users', label: 'Verifications', icon: <User size={14} />, count: userRequests.length },
    { key: 'payments', label: 'Payments', icon: <CreditCard size={14} />, count: paymentRequests.length },
    { key: 'rides', label: 'Rides', icon: <Car size={14} />, count: rides.length },
    { key: 'complaints', label: 'Complaints', icon: <Flag size={14} />, count: complaints.length },
  ];

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: isMobile ? '1rem' : '2rem 1rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          marginBottom: '2rem',
          gap: isMobile ? '1rem' : '0'
        }}>
          <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Admin Dashboard</h1>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ 
              padding: '0.6rem 1.2rem', 
              background: 'white', 
              border: '1px solid #e2e8f0', 
              borderRadius: '0.75rem', 
              fontSize: '0.85rem', 
              fontWeight: 600,
              cursor: 'pointer',
              width: isMobile ? '100%' : 'auto',
              textAlign: 'center'
            }}
          >
            Back to User View
          </button>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: '0.4rem', 
          marginBottom: '2rem', 
          background: 'white', 
          padding: '0.4rem', 
          borderRadius: '1rem', 
          border: '1px solid #f1f5f9',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: isMobile ? '1 1 45%' : '1',
                minWidth: isMobile ? '120px' : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.75rem 0.5rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: activeTab === tab.key ? '#1e293b' : 'transparent',
                color: activeTab === tab.key ? 'white' : '#64748b',
                fontWeight: 700,
                fontSize: isMobile ? '0.75rem' : '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon} {isMobile && tab.key === 'verifications' ? 'Verify' : tab.label}
              {tab.count > 0 && (
                <span style={{ 
                  background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : '#fee2e2', 
                  color: activeTab === tab.key ? 'white' : '#dc2626', 
                  borderRadius: '100px', 
                  padding: '0.1rem 0.4rem', 
                  fontSize: '0.65rem', 
                  fontWeight: 800 
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            <Loader2 size={32} style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            Loading...
          </div>
        ) : (
          <>
            {activeTab === 'users' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {userRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', background: 'white', borderRadius: '1.25rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                    <p>No pending verifications</p>
                  </div>
                ) : userRequests.map((req) => (
                  <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    style={{ backgroundColor: 'white', borderRadius: '1.5rem', padding: '2rem', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                                       {/* Card Header */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between', 
                      alignItems: isMobile ? 'flex-start' : 'center', 
                      marginBottom: '1.5rem',
                      gap: isMobile ? '1rem' : '0'
                    }}>
                      <div>
                        <h3 style={{ fontWeight: 800, color: '#0f172a', fontSize: isMobile ? '1.1rem' : '1.2rem', margin: '0 0 0.4rem' }}>{req.full_name}</h3>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                          <p style={{ margin: 0 }}>User Code: <span style={{ fontWeight: 600 }}>RB-{req.id?.slice(-4).toUpperCase()}</span></p>
                          <p style={{ margin: 0 }}>Phone: <span style={{ fontWeight: 600 }}>{req.phone || '0302-XXXXXXX'}</span></p>
                          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Submitted: {new Date(req.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div style={{ backgroundColor: '#fefce8', color: '#854d0e', padding: '0.4rem 0.8rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Pending ⏳
                      </div>
                    </div>

                    {/* ID Image Boxes */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                      gap: '1rem', 
                      marginBottom: '2rem' 
                    }}>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '0.75rem', backgroundColor: 'white' }}>
                        <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.75rem' }}>
                          <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Student ID Card</p>
                        </div>
                        <div style={{ height: '180px', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: '#f8fafc', position: 'relative' }}>
                          {req.student_id_url ? (
                            <img src={req.student_id_url} alt="Student ID" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No Image</div>
                          )}
                        </div>
                        <a href={req.student_id_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, marginTop: '0.75rem', textDecoration: 'none' }}>
                          <ExternalLink size={12} /> View Full Size
                        </a>
                      </div>
                      
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '0.75rem', backgroundColor: 'white' }}>
                        <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.75rem' }}>
                          <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>CNIC Photo</p>
                        </div>
                        <div style={{ height: '180px', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: '#f8fafc', position: 'relative' }}>
                          {req.cnic_url ? (
                            <img src={req.cnic_url} alt="CNIC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No Image</div>
                          )}
                        </div>
                        <a href={req.cnic_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, marginTop: '0.75rem', textDecoration: 'none' }}>
                          <ExternalLink size={12} /> View Full Size
                        </a>
                      </div>
                    </div>

                    {/* Gender & Actions */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #f1f5f9' }}>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '0.75rem' }}>Assign Gender</p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          {['Male', 'Female'].map(g => (
                            <button
                              key={g}
                              onClick={() => handleGenderChange(req.id, g)}
                              style={{
                                padding: '0.6rem 1.25rem',
                                borderRadius: '100px',
                                border: '1px solid',
                                borderColor: selectedGenders[req.id] === g ? '#1e293b' : '#e2e8f0',
                                background: selectedGenders[req.id] === g ? '#1e293b' : 'white',
                                color: selectedGenders[req.id] === g ? 'white' : '#64748b',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                        <button
                          onClick={() => handleApproveUser(req.id)}
                          className="btn-pill"
                          style={{
                            background: '#059669',
                            color: 'white',
                            height: '3.5rem',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <CheckCircle size={18} /> Approve Verification
                        </button>
                        <button
                          onClick={() => handleRejectUser(req.id)}
                          className="btn-pill"
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            height: '3.5rem',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <XCircle size={18} /> Reject
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ---- PAYMENTS TAB ---- */}
            {activeTab === 'payments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {paymentRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', background: 'white', borderRadius: '1.25rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💳</div>
                    <p>No pending payments</p>
                  </div>
                ) : paymentRequests.map((pay) => (
                  <motion.div key={pay.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    style={{ backgroundColor: 'white', borderRadius: '1.25rem', padding: '2rem', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 0.2rem' }}>{pay.payer?.full_name}</h3>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                          {pay.request?.ride?.origin} → {pay.request?.ride?.destination}
                        </p>
                      </div>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}>PKR {pay.amount}</span>
                    </div>

                    {pay.screenshot_url && (
                      <div style={{ marginBottom: '1.5rem', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                        onClick={() => window.open(pay.screenshot_url, '_blank')}>
                        <img src={pay.screenshot_url} alt="Payment Screenshot" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#3b82f6', padding: '0.5rem', margin: 0, background: '#f8fafc' }}>
                          Click to view full screenshot
                        </p>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <button onClick={() => handleApprovePayment(pay)} className="btn-pill" style={{ backgroundColor: '#10b981', color: 'white', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={18} /> Approve
                      </button>
                      <button onClick={() => handleRejectPayment(pay.id)} className="btn-pill" style={{ backgroundColor: '#dc2626', color: 'white', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <XCircle size={18} /> Reject
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ---- COMPLAINTS TAB ---- */}
            {activeTab === 'complaints' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {complaints.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', background: 'white', borderRadius: '1.25rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚖️</div>
                    <p>No pending complaints</p>
                  </div>
                ) : complaints.map((c) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    style={{ backgroundColor: 'white', borderRadius: '1.25rem', padding: '2rem', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reported by</p>
                        <h3 style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>{c.reporter?.full_name}</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.1rem 0 0' }}>RB-{c.reporter?.id?.slice(-4).toUpperCase()}</p>
                        {c.reporter?.phone && (
                          <a href={`tel:${c.reporter.phone}`} style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem' }}>
                            📞 {c.reporter.phone}
                          </a>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reported user</p>
                        <h3 style={{ fontWeight: 800, color: '#dc2626', margin: 0 }}>{c.reported?.full_name}</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.1rem 0 0' }}>
                          RB-{c.reported?.id?.slice(-4).toUpperCase()} • {c.reported?.report_count || 0} complaints
                        </p>
                        {c.reported?.phone && (
                          <a href={`tel:${c.reported.phone}`} style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem' }}>
                            📞 {c.reported.phone}
                          </a>
                        )}
                      </div>
                    </div>

                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', margin: '0 0 0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <AlertTriangle size={12} /> Reason for Complaint
                      </p>
                      <p style={{ fontSize: '0.85rem', color: '#1e293b', margin: 0 }}>{c.reason}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <button 
                        onClick={() => handleApproveComplaint(c)} 
                        disabled={processingComplaint === c.id}
                        className="btn-pill"
                        style={{ 
                          background: processingComplaint === c.id ? '#cbd5e1' : '#dc2626', 
                          color: 'white', 
                          height: '3.5rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '0.5rem', 
                          fontSize: '0.85rem',
                          border: 'none',
                          cursor: processingComplaint === c.id ? 'not-allowed' : 'pointer',
                          opacity: processingComplaint === c.id ? 0.7 : 1,
                          boxShadow: 'none'
                        }}
                      >
                        <AlertTriangle size={16} /> 
                        {processingComplaint === c.id ? 'Adding...' : 'Valid — Add Complaint'}
                      </button>
                      <button 
                        onClick={() => handleDismissComplaint(c.id)} 
                        disabled={processingComplaint === c.id}
                        className="btn-pill"
                        style={{ 
                          background: processingComplaint === c.id ? '#cbd5e1' : '#64748b', 
                          color: 'white', 
                          height: '3rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '0.5rem', 
                          fontSize: '0.85rem',
                          border: 'none',
                          cursor: processingComplaint === c.id ? 'not-allowed' : 'pointer',
                          opacity: processingComplaint === c.id ? 0.7 : 1,
                          boxShadow: 'none'
                        }}
                      >
                        <XCircle size={16} /> 
                        {processingComplaint === c.id ? 'Dismissing...' : 'Dismiss'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ---- RIDES TAB ---- */}
            {activeTab === 'rides' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {rides.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', background: 'white', borderRadius: '1.25rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚗</div>
                    <p>No rides posted yet</p>
                  </div>
                ) : rides.map((ride) => (
                  <motion.div key={ride.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    style={{ backgroundColor: 'white', borderRadius: '1.25rem', padding: '1.5rem', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.1rem' }}>{ride.origin} → {ride.destination}</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Driver: {ride.driver?.full_name} (RB-{ride.driver?.id?.slice(-4).toUpperCase()})</p>
                      </div>
                      <div style={{ 
                        backgroundColor: new Date(ride.departure_date) < new Date(new Date().toISOString().split('T')[0]) ? '#fef2f2' : ride.status === 'active' ? '#f0fdf4' : '#f8fafc', 
                        color: new Date(ride.departure_date) < new Date(new Date().toISOString().split('T')[0]) ? '#dc2626' : ride.status === 'active' ? '#16a34a' : '#64748b', 
                        padding: '0.3rem 0.6rem', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 700 
                      }}>
                        {new Date(ride.departure_date) < new Date(new Date().toISOString().split('T')[0]) ? 'EXPIRED' : ride.status.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', padding: '0.6rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem' }}>
                      <div>
                        <p style={{ fontSize: '0.6rem', color: '#94a3b8', margin: '0 0 0.1rem' }}>Date</p>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{ride.departure_date}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.6rem', color: '#94a3b8', margin: '0 0 0.1rem' }}>Price</p>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Rs. {ride.price}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.6rem', color: '#94a3b8', margin: '0 0 0.1rem' }}>Seats</p>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{ride.available_seats}/{ride.total_seats}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.6rem', color: '#94a3b8', margin: '0 0 0.1rem' }}>Gender</p>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{ride.gender_preference}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRide(ride.id)}
                      className="btn-pill"
                      style={{
                        marginTop: '1rem',
                        background: '#dc2626',
                        color: 'white',
                        height: '2.8rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      <Trash2 size={16} /> Delete Ride
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
