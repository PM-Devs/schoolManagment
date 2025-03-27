import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import db from '../../db/db';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signUp = useCallback(async (role, userData) => {
    try {
      const response = await axios.post(`https://sms-colp.onrender.com/register/${role}`, userData);
      
      if (response.status === 200) {
        // Save user data to local DB if needed
        const userWithRole = { ...userData, role, id: response.data.user_id };
        await db.users.add(userWithRole);
        return response.data;
      }
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await axios.post('https://sms-colp.onrender.com/token', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status === 200) {
        const { access_token, user_role } = response.data;
        
        // Get additional user data if needed or use the token
        const user = {
          username,
          role: user_role,
          token: access_token
        };
        
        // Save to local storage and state
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Optionally save to local DB
        await db.users.put({
          username,
          role: user_role,
          lastLogin: new Date().toISOString()
        });
        
        return user;
      }
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  }, []);

  const contextValue = useMemo(() => ({
    currentUser,
    signUp,
    login,
    logout,
    loading
  }), [currentUser, signUp, login, logout, loading]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};