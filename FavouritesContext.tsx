import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface FavouritesContextType {
  favourites: string[];
  loading: boolean;
  toggleFavourite: (pubId: string) => Promise<boolean>;
  isFavourite: (pubId: string) => boolean;
  refreshFavourites: () => Promise<void>;
}

const FavouritesContext = createContext<FavouritesContextType | undefined>(undefined);

export function FavouritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favourites, setFavourites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadFavourites() {
    if (!user) {
      setFavourites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favourites')
        .select('pub_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setFavourites((data || []).map(f => f.pub_id));
    } catch (error) {
      console.error('Error loading favourites:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavourite(pubId: string) {
    if (!user) return false;

    try {
      const isFav = favourites.includes(pubId);

      if (isFav) {
        const { error } = await supabase
          .from('favourites')
          .delete()
          .eq('user_id', user.id)
          .eq('pub_id', pubId);

        if (error) throw error;
        setFavourites(prev => prev.filter(id => id !== pubId));
      } else {
        const { error } = await supabase
          .from('favourites')
          .insert([{ user_id: user.id, pub_id: pubId }]);

        if (error) throw error;
        setFavourites(prev => [...prev, pubId]);
      }

      return true;
    } catch (error) {
      console.error('Error toggling favourite:', error);
      return false;
    }
  }

  function isFavourite(pubId: string): boolean {
    return favourites.includes(pubId);
  }

  useEffect(() => {
    loadFavourites();
  }, [user?.id]);

  return (
    <FavouritesContext.Provider value={{ favourites, loading, toggleFavourite, isFavourite, refreshFavourites: loadFavourites }}>
      {children}
    </FavouritesContext.Provider>
  );
}

export function useFavourites() {
  const context = useContext(FavouritesContext);
  if (context === undefined) {
    throw new Error('useFavourites must be used within a FavouritesProvider');
  }
  return context;
}
