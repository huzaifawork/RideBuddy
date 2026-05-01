import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const VerificationPending = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/home');
  };

  const handleRefresh = () => {
    // Logic to check verification status in DB
    window.location.reload();
  };

  return (
    <div className="welcome-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-center"
        style={{ flexDirection: 'column', width: '100%' }}
      >
        <CheckCircle size={80} color="#10b981" style={{ marginBottom: '1.5rem' }} />
        
        <h1 className="title-main" style={{ fontSize: '2.5rem' }}>Verification Submitted</h1>
        <p className="subtitle">Your details have been sent for review.</p>

        <div className="card" style={{ padding: '2rem 1.5rem', marginBottom: '1.5rem' }}>
          <h2 className="status-text" style={{ marginBottom: '1rem' }}>
            Account Status: Pending ⌛
          </h2>
          <p className="description-text" style={{ marginBottom: '0.5rem' }}>
            Please check back later. You'll be able to use the app once verified.
          </p>
        </div>
        
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <button onClick={handleRefresh} className="btn-blue" style={{ marginBottom: '1rem' }}>
            Refresh Status
          </button>

          <button onClick={handleLogout} className="logout-link" style={{ background: 'none', border: 'none', width: '100%', display: 'block' }}>
            Logout
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VerificationPending;
