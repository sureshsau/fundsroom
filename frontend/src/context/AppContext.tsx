import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { User, Notification } from '../types';
import { authApi } from '../api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

interface NotificationContextType {
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  socket: Socket | null;
  newNotification: Notification | null;
}

const AuthContext = createContext<AuthContextType | null>(null);
const NotificationContext = createContext<NotificationContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) { setIsLoading(false); return; }
      try {
        const res = await authApi.getMe();
        setUser(res.data.data);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    verifyToken();
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAuthenticated: !!token && !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [newNotification, setNewNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (!auth.token || !auth.isAuthenticated) {
      socket?.disconnect();
      setSocket(null);
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      auth: { token: auth.token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id);
    });

    newSocket.on('notification', (notification: Notification) => {
      setNewNotification(notification);
      setUnreadCount((prev) => prev + 1);

      // Show toast
      const icon = notification.type.includes('CRITICAL') ? '🔴'
        : notification.type.includes('LOW') ? '⚠️'
        : notification.type.includes('CHALLAN') ? '📋'
        : notification.type.includes('FOLLOWUP') ? '📅'
        : '🔔';

      toast(
        (t) => (
          <div className="flex flex-col gap-1" onClick={() => toast.dismiss(t.id)}>
            <div className="font-semibold text-sm">{icon} {notification.title}</div>
            <div className="text-xs text-gray-500">{notification.message}</div>
          </div>
        ),
        { duration: 5000 }
      );
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [auth.token, auth.isAuthenticated]);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, socket, newNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const useNotifications = (): NotificationContextType => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
