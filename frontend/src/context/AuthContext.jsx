import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';
import LoadingScreen from '../components/LoadingScreen';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Grab token from URL if redirected back from Twitch OAuth
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('mcw_token', urlToken);
      // Clean the token out of the URL without a page reload
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
    }

    // Fetch current user using stored token
    const token = urlToken || localStorage.getItem('mcw_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('mcw_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    localStorage.removeItem('mcw_token');
    setUser(null);
  };

  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

