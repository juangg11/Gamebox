import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserIcon, SettingsIcon, CloseIcon, GamepadIcon } from '../components/Icons';

export default function SettingsPage({ user }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    nombre: '',
    bio: '',
    avatar_url: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (user?.isGuest) {
      setProfile({
        nombre: user.user_metadata.nombre,
        bio: 'Navegando como invitado.',
        avatar_url: user.user_metadata.avatar_url
      });
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('perfil')
        .select('*')
        .eq('id_per', user.id)
        .single();
      
      if (data) {
        setProfile({
          nombre: data.nombre || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || ''
        });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (user?.isGuest) {
      setMessage('Error: Los invitados no pueden cambiar sus ajustes. ¡Crea una cuenta para personalizar tu perfil!');
      return;
    }
    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('perfil')
        .update({
          nombre: profile.nombre,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
        })
        .eq('id_per', user.id);

      if (error) throw error;
      setMessage('¡Perfil actualizado con éxito!');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (user?.isGuest) {
      setMessage('Error: Los invitados no pueden subir imágenes.');
      return;
    }
    setSaving(true);
    setMessage('Subiendo imagen...');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfile({ ...profile, avatar_url: publicUrl });
      setMessage('Imagen subida correctamente. No olvides guardar los cambios.');
    } catch (err) {
      setMessage(`Error al subir imagen: ${err.message}`);
      console.error(err);
    }
    setSaving(false);
  };

  if (loading) return <div className="loader"></div>;

  return (
    <div className="page-container max-w-2xl">
      <header className="page-header">
        <div className="header-title-row">
          <h1>Ajustes de Perfil</h1>
          <SettingsIcon className="icon-header" />
        </div>
      </header>

      <div className="settings-card glass">
        <form onSubmit={handleUpdate} className="settings-form">
          <div className="avatar-edit-section">
            <div className="avatar-preview">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Preview" />
              ) : (
                <UserIcon />
              )}
            </div>
            <div className="input-field">
              <label>Avatar</label>
              <div className="avatar-actions">
                <input 
                  type="file" 
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden-input"
                />
                <label htmlFor="avatar-upload" className="btn-secondary">
                  Seleccionar Imagen
                </label>
                <div className="avatar-url-direct">
                  <input 
                    type="text" 
                    placeholder="O pega una URL..."
                    value={profile.avatar_url}
                    onChange={(e) => setProfile({...profile, avatar_url: e.target.value})}
                  />
                </div>
              </div>
              <p className="help-text">JPG, PNG o SVG. Máx 2MB.</p>
            </div>
          </div>

          <div className="input-field">
            <label>Nombre Público</label>
            <input 
              type="text" 
              placeholder="Tu nombre real o nick"
              value={profile.nombre}
              onChange={(e) => setProfile({...profile, nombre: e.target.value})}
              required
            />
          </div>

          <div className="input-field">
            <label>Biografía</label>
            <textarea 
              placeholder="Cuéntanos algo sobre ti y qué juegos te gustan..."
              value={profile.bio}
              onChange={(e) => setProfile({...profile, bio: e.target.value})}
              rows="4"
            />
          </div>

          <button type="submit" className="btn-primary-glow" disabled={saving}>
            {saving ? 'Cargando...' : 'Guardar Todos los Cambios'}
          </button>

          {message && (
            <div className={`message-banner ${message.startsWith('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
