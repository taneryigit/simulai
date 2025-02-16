'use client';

import { createContext, useState, useEffect } from 'react';
import jwtDecode from 'jsonwebtoken';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode.decode(token);
                setUser(decoded);
            } catch  {
               
                localStorage.removeItem('token');
            }
        }
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
}