import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const RidePosted = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const rideId = location.state?.rideId || '9128';

  return (
    <div className="welcome-container flex-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-center"
        style={{ flexDirection: 'column', width: '100%', maxWidth: '400px' }}
      >
        <h2 className="title-main" style={{ fontSize: '1.75rem', marginBottom: '2rem', textAlign: 'center' }}>
          Your ride has been posted!
        </h2>

        <div style={{ 
          backgroundColor: '#eff6ff', 
          padding: '2rem', 
          borderRadius: '1.25rem', 
          width: '100%', 
          textAlign: 'center',
          marginBottom: '2.5rem'
        }}>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Ride Code:</p>
          <h3 style={{ color: '#2563eb', fontSize: '1.5rem', fontWeight: 800 }}>RIDE-{rideId.slice(-4).toUpperCase()}</h3>
        </div>

        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn-blue"
          style={{ height: '3.5rem' }}
        >
          Go Back Home
        </button>
      </motion.div>
    </div>
  );
};

export default RidePosted;
