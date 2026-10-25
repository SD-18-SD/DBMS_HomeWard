import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

// Gives any page the set of favorite pet ids and a toggle function.
// Favorites live on the logged in user object, so every page stays in sync.
export function useFavorites() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const favoriteIds = useMemo(() => new Set((user?.favorites || []).map(String)), [user]);

  const toggleFavorite = useCallback(
    async (petId) => {
      if (!user) {
        toast('Log in to save favorites');
        navigate('/login');
        return;
      }
      try {
        const data = await api(`/users/favorites/${petId}`, { method: 'POST' });
        setUser((u) => ({ ...u, favorites: data.favorites }));
        toast.success(data.favorited ? 'Saved to favorites' : 'Removed from favorites');
      } catch (err) {
        toast.error(err.message);
      }
    },
    [user, setUser, navigate]
  );

  return { favoriteIds, toggleFavorite };
}
