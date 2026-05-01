import React, { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const NotificationContext = createContext(null);

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ session, children }) => {
  const channelsRef = useRef([]);

  // Request browser notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    const userId = session.user.id;

    // Clean up any previous channels
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

    setupChannels(userId);

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    };
  }, [session?.user?.id]);

  const pushNotification = (title, body, icon = '🚗') => {
    // In-app toast
    toast(
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.3rem' }}>{icon}</span>
        <div>
          <p style={{ fontWeight: 800, margin: '0 0 0.2rem', fontSize: '0.9rem' }}>{title}</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{body}</p>
        </div>
      </div>,
      { duration: 5000 }
    );

    // Browser push notification (works even when tab is in background)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/vite.svg' });
      } catch (e) {
        // Silently fail if notifications aren't supported
      }
    }
  };

  const setupChannels = async (userId) => {
    // 1. Get user's profile to understand their role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    // 2. Remove any existing channel with this name to prevent errors
    await supabase.removeChannel(supabase.channel(`user-updates-${userId}`));

    // 3. Create a single consolidated channel for all user notifications
    const mainChannel = supabase.channel(`user-updates-${userId}`);

    // --- Listener 1: New passenger request (notify driver) ---
    mainChannel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'requests' },
      async (payload) => {
        const { data: ride } = await supabase
          .from('rides')
          .select('driver_id, origin, destination')
          .eq('id', payload.new.ride_id)
          .single();

        if (ride?.driver_id === userId) {
          pushNotification(
            'New Ride Request! 🎉',
            `Someone wants to ride ${ride.origin} → ${ride.destination}`,
            '🚗'
          );
        }
      }
    );

    // --- Listener 2: Request status update (notify both passenger & driver) ---
    mainChannel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'requests' },
      async (payload) => {
        const updated = payload.new;
        
        // 1. Notify Passenger
        if (updated.passenger_id === userId) {
          if (updated.status === 'accepted') {
            pushNotification('Ride Accepted! ✅', 'Your request was accepted. Waiting for driver contact.', '✅');
          } else if (updated.status === 'rejected') {
            pushNotification('Ride Rejected ❌', 'Your request was rejected. Browse other rides.', '❌');
          }
        }

        // 2. Notify Driver (if they just accepted but haven't paid)
        if (updated.status === 'accepted') {
          // Fetch ride to see if this user is the driver
          const { data: ride } = await supabase
            .from('rides')
            .select('driver_id')
            .eq('id', updated.ride_id)
            .single();

          if (ride?.driver_id === userId) {
            pushNotification('Request Accepted! 💰', 'Proceed to payment to unlock the passenger number.', '💳');
          }
        }
      }
    );

    // --- Listener 3: Payment approved (notify driver) ---
    mainChannel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'payments' },
      (payload) => {
        const updated = payload.new;
        if (updated.status !== 'approved') return;
        if (updated.payer_id !== userId) return;

        pushNotification('Payment Verified! 🎊', 'You can now see the passenger contact!', '📱');
      }
    );

    // --- Listener 4: Complaint reviewed (notify reporter) ---
    mainChannel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'reports' },
      (payload) => {
        const updated = payload.new;
        if (updated.reporter_id !== userId) return;

        if (updated.status === 'approved') {
          pushNotification('Complaint Approved ⚖️', 'Your complaint was found valid.', '⚖️');
        } else if (updated.status === 'dismissed') {
          pushNotification('Complaint Dismissed', 'Your complaint was reviewed and dismissed.', '📋');
        }
      }
    );

    // --- ADMIN Listeners (if applicable) ---
    if (profile?.role === 'admin') {
      // New verification
      mainChannel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.new.full_name && !payload.old.full_name && !payload.new.is_verified) {
            pushNotification('New Verification Request 📋', `${payload.new.full_name} submitted documents.`, '📋');
          }
        }
      );

      // New payment
      mainChannel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payments' },
        () => pushNotification('New Payment Submitted 💳', 'Review the new payment screenshot.', '💳')
      );

      // New complaint
      mainChannel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        () => pushNotification('New Complaint Filed 🚨', 'A user submitted a complaint for review.', '🚨')
      );
    }

    // 3. Finally, subscribe to everything at once
    mainChannel.subscribe();
    channelsRef.current = [mainChannel];
  };

  return (
    <NotificationContext.Provider value={{ pushNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
