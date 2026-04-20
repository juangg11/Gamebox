import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../api/rawg';
import { supabase } from '../supabaseClient';
import { TrophyIcon, StarIcon, StarRating } from '../components/Icons';

export default function RankingPage() {
  const [rankedGames, setRankedGames] = useState([]);
  const [filters, setFilters] = useState([]); 
  const [selectedFilter, setSelectedFilter] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [genresRes, tagsRes] = await Promise.all([
          api.get('/genres', { params: { page_size: 40 } }),
          api.get('/tags', { params: { page_size: 40, ordering: '-games_count' } })
        ]);

        
        const combined = [
          ...genresRes.data.results.map(g => ({ ...g, filterType: 'genre' })),
          ...tagsRes.data.results.map(t => ({ ...t, filterType: 'tag' }))
        ];

        
        setFilters(combined.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Error cargando filtros:", err);
      }
    };
    fetchFilterData();
  }, []);

  
  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const limit = selectedFilter ? 80 : 10; 

      const { data: dbGames } = await supabase
        .from('juego')
        .select('*')
        .order('nota_global', { ascending: false })
        .gt('nota_global', 0)
        .limit(limit);

      if (!dbGames || dbGames.length === 0) {
        setRankedGames([]);
        setLoading(false);
        return;
      }

      const gameDetails = await Promise.all(
        dbGames.map(async (dbG) => {
          try {
            const res = await api.get(`/games/${dbG.id_game}`);
            return { ...dbG, ...res.data };
          } catch { return null; }
        })
      );

      let finalRanking = gameDetails.filter(g => g !== null);

      if (selectedFilter) {
        finalRanking = finalRanking.filter(game => {
          const collection = selectedFilter.filterType === 'genre' ? game.genres : game.tags;
          return collection?.some(item => item.id === selectedFilter.id);
        });
      }

      setRankedGames(finalRanking.slice(0, 10));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [selectedFilter]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  
  const visibleFilters = useMemo(() => {
    return showAll ? filters : filters.slice(0, 15);
  }, [showAll, filters]);

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-title-row">
          <h1>Top Rankings</h1>
        </div>

        <div className="filters-container">
          <button
            className={`filter-pill ${!selectedFilter ? 'active' : ''}`}
            onClick={() => setSelectedFilter(null)}
          >
            Todos
          </button>

          {visibleFilters.map(f => {
            
            
            const isActive = selectedFilter?.id === f.id && selectedFilter?.filterType === f.filterType;

            return (
              <button
                key={`${f.filterType}-${f.id}`} 
                className={`filter-pill ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedFilter(f)}
              >
                {f.name}
              </button>
            );
          })}

          <button
            className="filter-pill show-more"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Ver menos' : 'Ver más...'}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="ranking-skeleton">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton-item"></div>)}
        </div>
      ) : rankedGames.length === 0 ? (
        <div className="empty-state">
          <StarIcon />
          <p>No hay juegos calificados en "{selectedFilter?.name}"</p>
        </div>
      ) : (
        <div className="ranking-list-premium">
          {rankedGames.map((game, index) => (
            <div key={`${game.id}-${index}`} className="ranking-card">
              <div className="rank-number">
                {index < 3 ? (
                  <span className={`medal ${index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'}`}>
                    {index + 1}º
                  </span>
                ) : (
                  <span className="rank-text">#{index + 1}</span>
                )}
              </div>

              <div className="ranking-game-img">
                <img src={game.background_image} alt={game.name} />
              </div>

              <div className="ranking-game-info">
                <h3>{game.name}</h3>
                <div className="ranking-meta">
                  <span className="release-year">
                    {game.released ? new Date(game.released).getFullYear() : 'TBA'}
                  </span>
                  <div className="ranking-genres">
                    {game.genres?.slice(0, 2).map(g => (
                      <span key={g.id} className="genre-tag">{g.name}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ranking-score">
                <div className="score-box">
                  <StarRating rating={game.nota_global} className="ranking-stars" />
                  <span className="score-val">{Number(game.nota_global).toFixed(1)}</span>
                </div>
                <span className="score-label">Nota Global</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}