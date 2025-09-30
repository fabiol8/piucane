import { useApp } from '@/contexts/AppContext';

export const useAuth = () => {
  const { user, isAuthenticated, loading, login, logout } = useApp();

  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
  };
};