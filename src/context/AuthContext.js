'use client';

import { createContext, useState, useEffect } from 'react';
import jwtDecode from 'jsonwebtoken';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const loadUserFromStorage = () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = jwtDecode.decode(token);
                    setUser(decoded);
                } catch {
                    localStorage.removeItem('token');
                }
            }
        };

        loadUserFromStorage();

        window.addEventListener('storage', loadUserFromStorage);
        return () => window.removeEventListener('storage', loadUserFromStorage);
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');  // Ensure previous user data is cleared
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
