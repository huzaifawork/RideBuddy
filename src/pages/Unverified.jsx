import React from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Unverified = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/home');
  };

  const handleVerify = () => {
    navigate('/verification-form');
  };

  return (
    <div className="welcome-container">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-center"
        style={{ flexDirection: 'column', width: '100%' }}
      >
        <h1 className="title-main" style={{ fontSize: '3rem' }}>Hello!</h1>
        <p className="subtitle">Let's get your account verified</p>

        <div className="card">
          <h2 className="status-text">
            Account Status: Unverified <span style={{ color: '#ef4444' }}>❌</span>
          </h2>
          <p className="description-text">
            You need to verify your student account before using RideBuddy.
          </p>
          
          <button onClick={handleVerify} className="btn-blue">
            Verify My Account
          </button>

          <button onClick={handleLogout} className="logout-link" style={{ background: 'none', border: 'none', width: '100%' }}>
            Logout
          </button>
        </div>

        <p className="footer-notice">
          Verification usually takes a few hours.
        </p>
      </motion.div>
    </div>
  );
};

export default Unverified;
