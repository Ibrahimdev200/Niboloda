import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('niboloda_token') || null);
  const [loading, setLoading] = useState(true);

  // Default active portal view: 'PASSENGER', 'DRIVER', 'ADMIN'
  const [activePortal, setActivePortal] = useState('PASSENGER');

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            setActivePortal(data.user.role === 'DRIVER' ? 'DRIVER' : data.user.role.includes('ADMIN') ? 'ADMIN' : 'PASSENGER');
          } else {
            logout();
          }
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('niboloda_token', authToken);
    setActivePortal(userData.role === 'DRIVER' ? 'DRIVER' : userData.role.includes('ADMIN') ? 'ADMIN' : 'PASSENGER');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setActivePortal('PASSENGER');
    localStorage.removeItem('niboloda_token');
  };

  const verifyOtp = async (phone, otpCode) => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otpCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP verification failed');
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      activePortal,
      setActivePortal,
      verifyOtp
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
