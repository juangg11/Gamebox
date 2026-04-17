import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import api from '../api/rawg';
import { UserIcon, StarRating, SettingsIcon, GamepadIcon, UsersIcon } from '../components/Icons';

export default function ProfilePage({ user: currentUser }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [showListModal, setShowListModal] = useState(null); // 'followers' or 'following' or null
  const [connectionList, setConnectionList] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  const isOwnProfile = !userId || userId === currentUser?.id;
  const targetId = isOwnProfile ? currentUser?.id : userId;

  useEffect(() => {
    if (targetId) {
      fetchProfileData();
    }
    setShowListModal(null);
  }, [targetId]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('perfil')
        .select('*')
        .eq('id_per', targetId)
        .single();
      
      setProfile(profileData);

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*')
        .eq('id_per', targetId)
        .order('created_at', { ascending: false });

      if (reviewsData && reviewsData.length > 0) {
        const enrichedReviews = await Promise.all(
          reviewsData.map(async (review) => {
            try {
              const res = await api.get(`/games/${review.id_game}`);
              return { ...review, game: res.data };
            } catch {
              return { ...review, game: { name: `Juego #${review.id_game}` } };
            }
          })
        );
        setReviews(enrichedReviews);
      } else {
        setReviews([]);
      }

      const { count: followersCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('id_seguido', targetId);

      const { count: followingCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('id_seguidor', targetId);
      
      setStats({ 
        followers: followersCount || 0, 
        following: followingCount || 0 
      });

      if (!isOwnProfile && currentUser) {
        const { data: followData } = await supabase
          .from('seguidores')
          .select('*')
          .eq('id_seguidor', currentUser.id)
          .eq('id_seguido', targetId)
          .single();
        setIsFollowing(!!followData);
      }

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleFollow = async () => {
    if (!currentUser) return;
    
    if (isFollowing) {
      await supabase
        .from('seguidores')
        .delete()
        .eq('id_seguidor', currentUser.id)
        .eq('id_seguido', targetId);
      setIsFollowing(false);
      setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
    } else {
      await supabase
        .from('seguidores')
        .insert({ id_seguidor: currentUser.id, id_seguido: targetId });
      setIsFollowing(true);
      setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
    }
  };

  const openListModal = async (type) => {
    setShowListModal(type);
    setListLoading(true);
    try {
      let query;
      if (type === 'followers') {
        query = supabase
          .from('seguidores')
          .select('id_seguidor')
          .eq('id_seguido', targetId);
      } else {
        query = supabase
          .from('seguidores')
          .select('id_seguido')
          .eq('id_seguidor', targetId);
      }

      const { data } = await query;
      const ids = data.map(item => type === 'followers' ? item.id_seguidor : item.id_seguido);

      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('perfil')
          .select('*')
          .in('id_per', ids);
        setConnectionList(profiles || []);
      } else {
        setConnectionList([]);
      }
    } catch (err) {
      console.error(err);
    }
    setListLoading(false);
  };

  if (loading) return <div className="loader-container"><div className="loader"></div></div>;

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="profile-banner"></div>
        <div className="profile-info-card glass">
          <div className="profile-avatar-large">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.nombre} />
            ) : (
              <UserIcon />
            )}
          </div>
          
          <div className="profile-meta-main">
            <div className="name-row">
              <h1>{profile?.nombre || 'Usuario'}</h1>
              {isOwnProfile && (
                <button className="icon-btn" onClick={() => navigate('/settings')}>
                  <SettingsIcon />
                </button>
              )}
            </div>
            <p className="profile-bio">{profile?.bio || 'Sin biografía.'}</p>
            
            <div className="profile-stats-row">
              <div className="stat clickable" onClick={() => openListModal('followers')}>
                <span className="stat-value">{stats.followers}</span>
                <span className="stat-label">Seguidores</span>
              </div>
              <div className="stat clickable" onClick={() => openListModal('following')}>
                <span className="stat-value">{stats.following}</span>
                <span className="stat-label">Seguidos</span>
              </div>
              <div className="stat">
                <span className="stat-value">{reviews.length}</span>
                <span className="stat-label">Reseñas</span>
              </div>
            </div>

            {!isOwnProfile && (
              <button 
                className={`btn-follow ${isFollowing ? 'following' : ''}`}
                onClick={handleFollow}
              >
                {isFollowing ? 'Siguiendo' : 'Seguir'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="profile-content-grid">
        <div className="profile-activity">
          <div className="section-header">
            <GamepadIcon />
            <h2>Actividad Reciente</h2>
          </div>
          
          <div className="activity-list">
            {reviews.length === 0 ? (
              <div className="empty-activity">
                <p>No hay reseñas todavía.</p>
              </div>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="activity-card glass">
                  <div className="activity-game-img">
                    <img src={review.game?.background_image} alt={review.game?.name} />
                  </div>
                  <div className="activity-details">
                    <div className="activity-header">
                      <h3>{review.game?.name}</h3>
                      <div className="activity-stars">
                        <StarRating rating={review.estrellas} />
                      </div>
                    </div>
                    <p className="activity-comment">{review.comentario}</p>
                    <span className="activity-date">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="profile-sidebar">
          <div className="sidebar-card glass">
            <h3>Información</h3>
            <div className="info-item">
              <UsersIcon />
              <span>Miembro desde {profile ? new Date(profile.created_at || Date.now()).getFullYear() : '2024'}</span>
            </div>
          </div>
        </div>
      </div>

      {showListModal && (
        <div className="modal-overlay" onClick={() => setShowListModal(null)}>
          <div className="modal glass list-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{showListModal === 'followers' ? 'Seguidores' : 'Siguiendo'}</h2>
              <button className="modal-close" onClick={() => setShowListModal(null)}><CloseIcon /></button>
            </div>
            <div className="modal-scroll-body">
              {listLoading ? (
                <div className="loader"></div>
              ) : connectionList.length === 0 ? (
                <p className="empty-msg">No hay usuarios para mostrar.</p>
              ) : (
                connectionList.map(u => (
                  <div key={u.id_per} className="connection-item" onClick={() => {
                    navigate(`/profile/${u.id_per}`);
                    setShowListModal(null);
                  }}>
                    <div className="conn-avatar">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" /> : <UserIcon />}
                    </div>
                    <div className="conn-info">
                      <h4>{u.nombre}</h4>
                      <p>{u.bio?.substring(0, 40)}{u.bio?.length > 40 ? '...' : ''}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
