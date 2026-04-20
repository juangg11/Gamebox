import { useEffect, useState } from 'react';
import api from '../api/rawg';
import { supabase } from '../supabaseClient';
import { SearchIcon, StarIcon, CloseIcon, StarRating } from '../components/Icons';

function VoteModal({ game, userVote, onClose, onVote, user }) {
  const [stars, setStars] = useState(userVote?.estrellas || 0);
  const [hoveredStars, setHoveredStars] = useState(0);
  const [comment, setComment] = useState(userVote?.comentario || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (stars === 0) {
      alert('Por favor selecciona una calificación');
      return;
    }
    if (user?.isGuest) {
      alert('Los invitados no pueden votar. ¡Crea una cuenta para participar!');
      return;
    }
    setSaving(true);
    await onVote(game.id, stars, comment);
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        <div className="modal-game-info">
          <img src={game.background_image} alt={game.name} className="modal-bg" />
          <div className="modal-header-text">
            <h2>{game.name}</h2>
          </div>
        </div>
        
        <div className="modal-body">
          <div className="modal-stars">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                className={`modal-star ${(hoveredStars || stars) >= star ? 'active' : ''}`}
                onMouseMove={() => setHoveredStars(star)}
                onMouseLeave={() => setHoveredStars(0)}
                onClick={() => setStars(star)}
              >
                <StarIcon />
              </button>
            ))}
          </div>
          
          <p className="star-value">
            {stars === 0 ? '¿Qué te pareció?' : `${stars}/5 estrellas`}
          </p>

          <div className="textarea-container">
            <textarea
              placeholder="Escribe tu opinión aquí..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="4"
              maxLength="500"
            />
            <span className="char-counter">{comment.length}/500</span>
          </div>

          <div className="modal-buttons">
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary-glow" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Guardando...' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage({ user }) {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [ratings, setRatings] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [showVoteModal, setShowVoteModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async (query = '') => {
    setLoading(true);
    try {
      const res = await api.get('/games', { params: { search: query, page_size: 20 } });
      setGames(res.data.results);
      
      
      const ids = res.data.results.map(g => g.id);
      const { data: globalData } = await supabase
        .from('juego')
        .select('id_game, nota_global')
        .in('id_game', ids);
      
      const ratingMap = {};
      globalData?.forEach(r => ratingMap[r.id_game] = r.nota_global);
      setRatings(ratingMap);

      if (user) {
        const { data: userReviews } = await supabase
          .from('reviews')
          .select('*')
          .eq('id_per', user.id)
          .in('id_game', ids);
        
        const voteMap = {};
        userReviews?.forEach(r => voteMap[r.id_game] = r);
        setUserVotes(voteMap);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchGames(search);
  };

  const handleVote = async (gameId, stars, comment) => {
    try {
      const { data: existingVote } = await supabase
        .from('reviews')
        .select('id')
        .eq('id_per', user.id)
        .eq('id_game', gameId)
        .single();

      if (existingVote) {
        await supabase
          .from('reviews')
          .update({ estrellas: stars, comentario: comment })
          .eq('id', existingVote.id);
      } else {
        await supabase
          .from('reviews')
          .insert({
            id_per: user.id,
            id_game: gameId,
            estrellas: stars,
            comentario: comment
          });
      }

      
      setUserVotes(prev => ({
        ...prev,
        [gameId]: { estrellas: stars, comentario: comment }
      }));

      
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('estrellas')
        .eq('id_game', gameId);

      const average = (allReviews.reduce((sum, r) => sum + r.estrellas, 0) / allReviews.length).toFixed(1);
      
      await supabase
        .from('juego')
        .upsert({ id_game: gameId, nota_global: parseFloat(average) });

      setRatings(prev => ({
        ...prev,
        [gameId]: average
      }));
    } catch (error) {
      console.error('Error al votar:', error);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Explorar Juegos</h1>
        <form onSubmit={handleSearch} className="search-bar-premium">
          <SearchIcon />
          <input 
            type="text" 
            placeholder="Busca por nombre..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Buscar</button>
        </form>
      </header>

      {loading ? (
        <div className="loading-grid">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton-card"></div>)}
        </div>
      ) : (
        <div className="grid-juegos">
          {games.map(game => (
            <div key={game.id} className="card-juego-premium">
              <div className="card-image">
                <img src={game.background_image} alt={game.name} loading="lazy" />
                <div className="image-overlay">
                  <button 
                    className="btn-vote-premium"
                    onClick={() => setShowVoteModal(game)}
                  >
                    {userVotes[game.id] ? (
                      <><StarIcon /> <span>{userVotes[game.id].estrellas}</span></>
                    ) : (
                      'Calificar'
                    )}
                  </button>
                </div>
              </div>
              <div className="card-content">
                <h3>{game.name}</h3>
                <div className="card-footer">
                  <div className="rating-pill">
                    <StarRating rating={ratings[game.id]} className="card-stars" />
                    <span>{ratings[game.id] ? parseFloat(ratings[game.id]).toFixed(1) : '—'}</span>
                  </div>
                  <div className="platforms">
                    {game.parent_platforms?.slice(0, 3).map(p => (
                      <span key={p.platform.id} className="platform-tag">{p.platform.name}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showVoteModal && (
        <VoteModal
          game={showVoteModal}
          userVote={userVotes[showVoteModal.id]}
          onClose={() => setShowVoteModal(null)}
          onVote={handleVote}
          user={user}
        />
      )}
    </div>
  );
}
