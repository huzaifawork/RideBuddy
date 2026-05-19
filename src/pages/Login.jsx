import React from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

const Login = () => {
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/home'
      }
    });
    if (error) console.error('Login error:', error.message);
  };

  return (
    <div className="welcome-container" style={{ position: 'relative' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '100%',
          textAlign: 'center'
        }}
      >
        <img
          src="/logo.png"
          alt="RideBuddy"
          style={{
            width: 'clamp(140px, 55vw, 220px)',
            height: 'auto',
            marginBottom: '0.5rem',
            objectFit: 'contain'
          }}
        />
        <p className="subtitle">Safe carpooling for students</p>

        <div className="flex-center" style={{ flexDirection: 'column', width: '100%', marginTop: '2rem' }}>
          <h2 className="welcome-text">Welcome! 👋</h2>
          
          <button onClick={handleGoogleLogin} className="google-btn">
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className="google-icon"
            />
            Continue with Google
          </button>
        </div>
      </motion.div>

      <div style={{ 
        position: 'absolute', 
        bottom: '3rem', 
        left: '50%', 
        transform: 'translateX(-50%)',
        width: '100%',
        padding: '0 1.5rem',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <p style={{ 
          color: '#1e293b', 
          fontSize: '0.85rem', 
          fontWeight: 800,
          margin: 0,
          lineHeight: 1.4
        }}>
          By continuing, you agree that RideBuddy is only a platform connecting students.
        </p>
      </div>
    </div>
  );
};

export default Login;
