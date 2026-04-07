import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { profileAPI, ProfileResponse } from '../services/api';
import Skeleton from '../components/Skeleton';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await profileAPI.getProfile();
      setProfile(data);
      setFormData({
        fullName: data.fullName || '',
        phone: data.phone || '',
      });
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      showToast('Failed to load profile details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const data = await profileAPI.updateProfile(formData);
      setProfile(data);
      
      // We generally rely on the JWT token for the primary auth state,
      // but showing success is good.
      showToast('Profile updated successfully!', 'success');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to update profile.';
      showToast(msg, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      await profileAPI.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      showToast('Password updated successfully!', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to update password.';
      showToast(msg, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-header">
          <Skeleton type="title" width="40%" />
          <Skeleton type="text" width="60%" />
        </div>
        <div className="profile-content">
          <div className="profile-section">
            <Skeleton type="title" width="20%" />
            <Skeleton type="card" height="200px" />
          </div>
          <div className="profile-section">
            <Skeleton type="title" width="30%" />
            <Skeleton type="card" height="250px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your personal information and security settings.</p>
      </div>

      <div className="profile-content">
        {/* Personal Info Section */}
        <section className="profile-section">
          <h2>Personal Information</h2>
          <form className="profile-form" onSubmit={handleSettingsSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={profile?.email || ''}
                readOnly
                title="Email cannot be changed"
              />
              <span className="readonly-hint">Email address cannot be changed.</span>
            </div>

            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+62..."
              />
            </div>

            <button type="submit" className="btn-primary" disabled={savingSettings}>
              {savingSettings ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </form>
        </section>

        {/* Security Section */}
        <section className="profile-section">
          <h2>Security Settings</h2>
          <form className="profile-form" onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                minLength={8}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                minLength={8}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={savingPassword}>
              {savingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Profile;
