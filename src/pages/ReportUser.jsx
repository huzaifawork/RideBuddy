import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const ReportUser = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    userCode: '',
    reason: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate format: must be RB-XXXX
    const code = formData.userCode.trim().toUpperCase();
    if (!code.startsWith('RB-') || code.length < 5) {
      toast.error('Invalid User Code. Format must be RB-XXXX');
      return;
    }

    const suffix = code.replace('RB-', '').toLowerCase();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Find the user whose ID ends with the given suffix
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name');

      if (profileError) throw profileError;

      const reported = profiles?.find(p => p.id.slice(-4).toLowerCase() === suffix);

      if (!reported) {
        toast.error('User Code not found. Please check and try again.');
        return;
      }

      if (reported.id === user.id) {
        toast.error('You cannot report yourself!');
        return;
      }

      // Submit report to the reports table
      const { error } = await supabase
        .from('reports')
        .insert([{
          reporter_id: user.id,
          reported_id: reported.id,
          reason: formData.reason,
          status: 'pending'
        }]);

      if (error) throw error;

      setSubmitted(true);
    } catch (err) {
      toast.error('Failed to submit: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
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
        <div style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#f0fdf4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <CheckCircle size={32} color="#16a34a" />
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
            Report Submitted
          </h2>
          <p style={{ color: '#64748b', marginBottom: '2.5rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
            We've received your report. Our team will review it within 24 hours to ensure a safe community.
          </p>

          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn-pill"
            style={{ 
              backgroundColor: '#1d4ed8', 
              color: 'white', 
              width: '100%', 
              height: '3.5rem', 
              fontSize: '1rem', 
              fontWeight: 700,
              boxShadow: '0 4px 6px -1px rgba(29, 78, 216, 0.2)'
            }}
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
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2.5rem', textAlign: 'left' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.25rem' }}>Report User</h1>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Submit a complaint about a user</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>User Code</label>
            <input
              type="text"
              placeholder="e.g., RB-1002"
              value={formData.userCode}
              onChange={(e) => setFormData({ ...formData, userCode: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '1rem 1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                fontSize: '0.9rem',
                outline: 'none',
                color: '#1e293b'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Reason</label>
            <textarea
              placeholder="Describe the issue..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                fontSize: '0.9rem',
                minHeight: '150px',
                outline: 'none',
                resize: 'none',
                color: '#1e293b'
              }}
            />
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-pill"
              style={{
                background: '#1d4ed8',
                color: 'white',
                border: 'none',
                height: '3.5rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                width: '100%',
                marginBottom: '1rem',
                boxShadow: '0 4px 10px rgba(29, 78, 216, 0.2)',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Submitting...' : 'Submit Complaint'}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'transparent',
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
        </form>
      </div>
    </div>
  );
};

export default ReportUser;
