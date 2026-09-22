import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface RouterContextType {
  path: string;
  currentPath: string;
  navigate: (newPath: string) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [path, setPath] = useState<string>(() => {
    try {
      const p = window.location.pathname;
      return (p && p !== '/' && p !== '/index.html') ? p : '/technician/dashboard';
    } catch {
      return '/technician/dashboard';
    }
  });

  useEffect(() => {
    const handlePopState = () => {
      try {
        setPath(window.location.pathname || '/technician/dashboard');
      } catch {
        // Fallback for sandboxed frames
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((newPath: string) => {
    try {
      if (newPath !== window.location.pathname) {
        window.history.pushState(null, '', newPath);
      }
    } catch {
      // In strict sandboxed iframes, pushState may be restricted, internal state handles navigation
    }
    setPath(newPath);
  }, []);

  return (
    <RouterContext.Provider value={{ path, currentPath: path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}
