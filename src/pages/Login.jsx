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
        className="flex-center"
        style={{ flexDirection: 'column', width: '100%' }}
      >
        <h1 className="title-main">RideBuddy</h1>
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
        bottom: '2rem', 
        left: 0, 
        right: 0, 
        padding: '0 2rem', 
        textAlign: 'center' 
      }}>
        <p style={{ 
          color: '#94a3b8', 
          fontSize: '0.8rem', 
          whiteSpace: 'nowrap'
        }}>
          By continuing, you agree that RideBuddy is only a platform connecting students.
        </p>
      </div>
    </div>
  );
};

export default Login;
