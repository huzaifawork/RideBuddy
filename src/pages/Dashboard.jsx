import React from 'react';
import { motion } from 'framer-motion';
import { 
  Car, 
  Search, 
  FileText, 
  UserCheck, 
  AlertTriangle, 
  ShieldCheck,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Dashboard = ({ profile }) => {
  const navigate = useNavigate();

  const menuItems = [
    { 
      title: 'Offer a Ride', 
      desc: 'Going somewhere? Share your ride.', 
      icon: <Car size={20} color="#2563eb" />, 
      path: '/post-ride',
      bgColor: '#eff6ff'
    },
    { 
      title: 'View Rides', 
      desc: 'Find available rides near you.', 
      icon: <Search size={20} color="#10b981" />, 
      path: '/search',
      bgColor: '#f0fdf4'
    },
    { 
      title: 'My Requests', 
      desc: 'Check your ride requests.', 
      icon: <FileText size={20} color="#9333ea" />, 
      path: '/my-requests',
      bgColor: '#faf5ff'
    },
    { 
      title: 'Driver Requests', 
      desc: 'View incoming ride requests.', 
      icon: <UserCheck size={20} color="#ea580c" />, 
      path: '/ride-requests',
      bgColor: '#fff7ed'
    },
    { 
      title: 'Report User', 
      desc: 'Submit a complaint about a user.', 
      icon: <AlertTriangle size={20} color="#dc2626" />, 
      path: '/report-user',
      bgColor: '#fef2f2'
    }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/home');
  };

  return (
    <div className="welcome-container" style={{ justifyContent: 'flex-start', paddingTop: '1rem', minHeight: '100vh', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '90%', maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}
      >
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.1rem' }}>Hello!</h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>What would you like to do today?</p>

        {/* Notice Text */}
        <p style={{ 
          fontSize: '0.7rem', 
          color: '#94a3b8', 
          margin: '-0.5rem 0 1.25rem 0', 
          lineHeight: 1.4 
        }}>
          * This web app is currently under development. If you encounter any issues or have suggestions, feel free to contact us at <strong style={{ whiteSpace: 'nowrap', color: '#64748b' }}>0335-2005507</strong>.
        </p>

        {/* User Stats Card */}
        <div style={{ 
          background: '#eff6ff', 
          borderRadius: '1rem', 
          padding: '1rem 1.25rem', 
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>User Code:</span>
            <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>
              RB-{profile?.id?.slice(-4).toUpperCase() || '1024'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Status:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>
              Verified <ShieldCheck size={14} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Complaints:</span>
            <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>{profile?.report_count || 0}</span>
          </div>
        </div>

        {/* Menu Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {menuItems.map((item, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(item.path)}
              style={{
                backgroundColor: 'white',
                padding: '0.75rem 1rem',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.05)',
                border: '1px solid #f1f5f9'
              }}
            >
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '0.6rem', 
                backgroundColor: item.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {React.cloneElement(item.icon, { size: 18 })}
              </div>
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.05rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Admin Dashboard Button */}
        {profile?.role === 'admin' && (
          <button 
            onClick={() => navigate('/admin')}
            className="btn-pill"
            style={{ 
              backgroundColor: '#8b5cf6', 
              height: '3rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}
          >
            <ShieldCheck size={18} />
            Admin Dashboard
          </button>
        )}

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogout}
          className="btn-pill"
          style={{ 
            width: '100%', 
            backgroundColor: '#2563eb',
            color: 'white',
            fontSize: '0.9rem',
            fontWeight: 600,
            height: '3rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '1rem',
            marginBottom: '1rem'
          }}
        >
          Logout
        </motion.button>
      </motion.div>
    </div>
  );
};

export default Dashboard;
