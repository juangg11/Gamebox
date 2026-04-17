import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import api from './api/rawg';
import './App.css';
import { supabase } from './supabaseClient';
import {
  GamepadIcon, TrophyIcon, UsersIcon, UserIcon, LogoutIcon,
  SearchIcon, StarIcon, HomeIcon, SettingsIcon
} from './components/Icons';

// Pages
import HomePage from './pages/HomePage';
import RankingPage from './pages/RankingPage';
import ProfilePage from './pages/ProfilePage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

function LoginForm({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nombre: email.split('@')[0],
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
            }
          }
        });

        if (!result.error && result.data.user) {
          // Creación inicial del perfil
          await supabase.from('perfil').insert({
            id_per: result.data.user.id,
            nombre: email.split('@')[0],
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
          });
        }
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) {
        setError(result.error.message);
      } else {
        setUser(result.data.user);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-form glass">
        <h1 className="logo-big"><GamepadIcon /> <span>GameBox</span></h1>
        <p className="auth-subtitle">{isSignUp ? 'Únete a la mayor comunidad' : 'Bienvenido de nuevo'}</p>
        <form onSubmit={handleAuth}>
          <div className="input-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary-glow" disabled={loading}>
            {loading ? 'Cargando...' : isSignUp ? 'Registrarse' : 'Entrar'}
          </button>
          {error && <p className="error-msg">{error}</p>}
        </form>
        <div className="auth-footer">
          <span>{isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}</span>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="link-btn-glow"
          >
            {isSignUp ? 'Inicia Sesión' : 'Crea una'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Nav({ user }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
    window.location.reload();
  };

  const isOtherUserProfile = location.pathname.startsWith('/profile/') && !location.pathname.endsWith(user?.id);
  const isMyProfile = location.pathname === '/profile' || (location.pathname.startsWith('/profile/') && location.pathname.endsWith(user?.id));

  return (
    <nav className="side-nav">
      <div className="nav-logo">
        <GamepadIcon />
        <span>GameBox</span>
      </div>
      <div className="nav-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          <HomeIcon /> <span>Explorar</span>
        </Link>
        <Link to="/ranking" className={`nav-link ${location.pathname === '/ranking' ? 'active' : ''}`}>
          <TrophyIcon /> <span>Ranking</span>
        </Link>
        <Link to="/users" className={`nav-link ${location.pathname === '/users' || isOtherUserProfile ? 'active' : ''}`}>
          <UsersIcon /> <span>Comunidad</span>
        </Link>
        <Link to="/profile" className={`nav-link ${isMyProfile ? 'active' : ''}`}>
          <UserIcon /> <span>Mi Perfil</span>
        </Link>
      </div>
      <div className="nav-bottom">
        <Link to="/settings" className="nav-link">
          <SettingsIcon /> <span>Ajustes</span>
        </Link>
        <button onClick={handleLogout} className="logout-link">
          <LogoutIcon /> <span>Cerrar Sesión</span>
        </button>
      </div>
    </nav>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  if (loading) return (
    <div className="loading-screen">
      <div className="loader"></div>
    </div>
  );

  if (!user) return <LoginForm setUser={setUser} />;

  return (
    <div className="app-container">
      {/* Definición de degradado para media estrella */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="half-fill" x1="0" x2="100%" y1="0" y2="0">
            <stop offset="50%" stopColor="#f5a623" />
            <stop offset="50%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <Nav user={user} />
      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/profile" element={<ProfilePage user={user} />} />
          <Route path="/profile/:userId" element={<ProfilePage user={user} />} />
          <Route path="/users" element={<UsersPage currentUser={user} />} />
          <Route path="/settings" element={<SettingsPage user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;