import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const RequestSent = () => {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}
      >
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
          Request Sent!
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '2.5rem' }}>
          Waiting for driver to accept your request.
        </p>

        <button 
          onClick={() => navigate('/dashboard')} 
          style={{ 
            width: '100%', 
            height: '3.5rem', 
            backgroundColor: '#1d4ed8', 
            color: 'white', 
            border: 'none', 
            borderRadius: '100px', 
            fontWeight: 700, 
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(29, 78, 216, 0.2)'
          }}
        >
          Go Back Home
        </button>
      </motion.div>
    </div>
  );
};

export default RequestSent;
