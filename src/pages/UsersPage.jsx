import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { SearchIcon, UserIcon, UsersIcon } from '../components/Icons';

export default function UsersPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  const fetchUsers = async (query = '') => {
    setLoading(true);
    try {
      // 1. Obtener quiénes sigo ya
      let followedIds = [];
      if (currentUser) {
        const { data: follows } = await supabase
          .from('seguidores')
          .select('id_seguido')
          .eq('id_seguidor', currentUser.id);
        followedIds = follows?.map(f => f.id_seguido) || [];
      }

      // 2. Obtener usuarios
      let q = supabase.from('perfil').select('*');
      
      if (currentUser) {
        q = q.neq('id_per', currentUser.id);
      }

      if (query) {
        q = q.ilike('nombre', `%${query}%`);
      }

      const { data } = await q;
      
      // 3. Aleatorizar y ordenar (los que no sigo salen arriba, pero permutados)
      const processed = (data || []).map(u => ({
        ...u,
        isFollowed: followedIds.includes(u.id_per),
        randomKey: Math.random()
      }));

      // Ordenar: primero no seguidos, luego aleatorio
      const sorted = processed.sort((a, b) => {
        if (a.isFollowed !== b.isFollowed) {
          return a.isFollowed ? 1 : -1; // Los seguidos van al final
        }
        return a.randomKey - b.randomKey; // Aleatoriedad dentro de cada grupo
      });
      
      setUsers(sorted.slice(0, 16));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(search);
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-title-row">
          <h1>Comunidad</h1>
          <UsersIcon className="icon-header" />
        </div>
        
        <form onSubmit={handleSearch} className="search-bar-premium">
          <SearchIcon />
          <input 
            type="text" 
            placeholder="Busca por nombre de usuario..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Buscar</button>
        </form>
      </header>

      {loading ? (
        <div className="users-grid-skeleton">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton-user-card"></div>)}
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron usuarios.</p>
        </div>
      ) : (
        <div className="users-grid">
          {users.map(u => (
            <Link to={`/profile/${u.id_per}`} key={u.id_per} className="user-card glass">
              <div className="user-card-avatar">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.nombre} />
                ) : (
                  <UserIcon />
                )}
              </div>
              <div className="user-card-info">
                <h3>{u.nombre || 'Usuario'}</h3>
                <p>{u.bio || 'Sin biografía'}</p>
              </div>
              <div className="user-card-footer">
                {u.isFollowed && <span className="followed-badge">Siguiendo</span>}
                <span>Ver perfil completo →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
