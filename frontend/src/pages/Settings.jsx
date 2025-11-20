import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Settings as SettingsIcon, Plus, Trash2, Star } from 'lucide-react';
import styles from '../styles/Settings.module.css';

const Settings = () => {
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [settings, setSettings] = useState({
        systemPrompt: '',
        temperature: 0.7,
        maxTokens: 2000,
        model: 'llama3:8b'
    });
    const [profileName, setProfileName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [showNewProfile, setShowNewProfile] = useState(false);

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        try {
            const response = await fetch('/api/profiles');
            if (response.ok) {
                const data = await response.json();
                setProfiles(data);

                // Load default profile if exists
                const defaultProfile = data.find(p => p.isDefault);
                if (defaultProfile) {
                    loadProfile(defaultProfile);
                }
            }
        } catch (error) {
            console.error('Failed to load profiles:', error);
        }
    };

    const loadProfile = (profile) => {
        setSelectedProfile(profile._id);
        setProfileName(profile.name);
        setSettings({
            systemPrompt: profile.systemPrompt,
            temperature: profile.temperature,
            maxTokens: profile.maxTokens,
            model: profile.model
        });
        setProfileName(profile.name);

        // Also save to localStorage for immediate use
        localStorage.setItem('aiSettings', JSON.stringify({
            systemPrompt: profile.systemPrompt,
            temperature: profile.temperature,
            maxTokens: profile.maxTokens,
            model: profile.model
        }));
    };

    const handleChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveMessage('');

        try {
            if (selectedProfile) {
                // Update existing profile
                const response = await fetch(`/api/profiles/${selectedProfile}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: profileName,
                        ...settings
                    })
                });

                if (response.ok) {
                    setSaveMessage('Profile updated successfully!');
                    await loadProfiles();
                } else {
                    const error = await response.json();
                    setSaveMessage('Failed to update profile: ' + error.error);
                }
            } else {
                // Create a new profile if none selected
                setSaveMessage('Please select a profile or create a new one');
            }

            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            setSaveMessage('Failed to save: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateProfile = async () => {
        if (!profileName.trim()) {
            setSaveMessage('Please enter a profile name');
            setTimeout(() => setSaveMessage(''), 3000);
            return;
        }

        setSaving(true);
        setSaveMessage('');

        try {
            const response = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: profileName,
                    ...settings,
                    isDefault: false
                })
            });

            if (response.ok) {
                const newProfile = await response.json();
                setSaveMessage('Profile created successfully!');
                setShowNewProfile(false);
                loadProfiles();
                loadProfile(newProfile);
            } else {
                const error = await response.json();
                setSaveMessage('Failed to create profile: ' + error.error);
            }

            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            setSaveMessage('Failed to create profile: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProfile = async (profileId) => {
        if (!window.confirm('Are you sure you want to delete this profile?')) {
            return;
        }

        try {
            const response = await fetch(`/api/profiles/${profileId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setSaveMessage('Profile deleted successfully!');
                if (selectedProfile === profileId) {
                    setSelectedProfile(null);
                    setProfileName('');
                }
                loadProfiles();
            } else {
                const error = await response.json();
                setSaveMessage('Failed to delete: ' + error.error);
            }

            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            setSaveMessage('Failed to delete profile: ' + error.message);
        }
    };

    const handleSetDefault = async (profileId) => {
        try {
            const response = await fetch(`/api/profiles/${profileId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isDefault: true })
            });

            if (response.ok) {
                setSaveMessage('Default profile updated!');
                loadProfiles();
            }

            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            setSaveMessage('Failed to set default: ' + error.message);
        }
    };

    const handleReset = () => {
        if (!window.confirm('Are you sure you want to reset all settings to default?')) {
            return;
        }

        const defaultSettings = {
            systemPrompt: '',
            temperature: 0.7,
            maxTokens: 2000,
            model: 'llama3:8b'
        };

        setSettings(defaultSettings);
        setSelectedProfile(null);
        setProfileName('');
        localStorage.removeItem('aiSettings');
        setSaveMessage('Settings reset to default');
        setTimeout(() => setSaveMessage(''), 3000);
    };

    return (
        <div className={styles.container}>
            <button
                onClick={() => navigate('/')}
                className={styles.backButton}
            >
                <ArrowLeft size={20} /> Back to Reviews
            </button>

            <div className={styles.header}>
                <div className={styles.headerIcon}>
                    <SettingsIcon size={32} />
                </div>
                <h1 className={styles.title}>AI Assistant Settings</h1>
                <p className={styles.subtitle}>Customize how the AI responds to your code review questions</p>
            </div>

            {/* Profiles Section */}
            <div className={styles.profilesCard}>
                <div className={styles.profilesHeader}>
                    <h2 className={styles.sectionTitle}>Saved Profiles</h2>
                    <button
                        onClick={() => {
                            setShowNewProfile(!showNewProfile);
                            setProfileName('New Profile');
                        }}
                        className={styles.newProfileButton}
                    >
                        <Plus size={18} /> New Profile
                    </button>
                </div>

                <div className={styles.profilesList}>
                    {profiles.map(profile => (
                        <div
                            key={profile._id}
                            className={`${styles.profileItem} ${selectedProfile === profile._id ? styles.profileItemActive : ''}`}
                            onClick={() => loadProfile(profile)}
                        >
                            <div className={styles.profileInfo}>
                                <h3 className={styles.profileName}>
                                    {profile.name}
                                    {profile.isDefault && <Star size={16} className={styles.defaultStar} />}
                                </h3>
                                <p className={styles.profileMeta}>
                                    {profile.model} • Temp: {profile.temperature}
                                </p>
                            </div>
                            <div className={styles.profileActions}>
                                {!profile.isDefault && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSetDefault(profile._id);
                                        }}
                                        className={styles.iconButton}
                                        title="Set as default"
                                    >
                                        <Star size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProfile(profile._id);
                                    }}
                                    className={styles.iconButton}
                                    title="Delete profile"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.settingsCard}>
                <h2 className={styles.sectionTitle}>
                    {showNewProfile ? 'Create New Profile' : selectedProfile ? 'Edit Profile' : 'Current Settings'}
                </h2>

                {(showNewProfile || selectedProfile) && (
                    <div className={styles.settingGroup}>
                        <label className={styles.label}>
                            Profile Name
                            <span className={styles.labelHint}>A descriptive name for this profile</span>
                        </label>
                        <input
                            type="text"
                            className={styles.input}
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="e.g., TypeScript Expert"
                        />
                    </div>
                )}

                <div className={styles.settingGroup}>
                    <label className={styles.label}>
                        System Prompt
                        <span className={styles.labelHint}>Custom instructions for the AI assistant</span>
                    </label>
                    <textarea
                        className={styles.textarea}
                        value={settings.systemPrompt}
                        onChange={(e) => handleChange('systemPrompt', e.target.value)}
                        placeholder="e.g., Always provide code examples in TypeScript. Focus on security best practices."
                        rows={6}
                    />
                </div>

                <div className={styles.settingGroup}>
                    <label className={styles.label}>
                        Model
                        <span className={styles.labelHint}>Ollama model to use</span>
                    </label>
                    <input
                        type="text"
                        className={styles.input}
                        value={settings.model}
                        onChange={(e) => handleChange('model', e.target.value)}
                        placeholder="llama3:8b"
                    />
                </div>

                <div className={styles.settingRow}>
                    <div className={styles.settingGroup}>
                        <label className={styles.label}>
                            Temperature
                            <span className={styles.labelHint}>Creativity level (0.0 - 1.0)</span>
                        </label>
                        <input
                            type="number"
                            className={styles.input}
                            value={settings.temperature}
                            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                            min="0"
                            max="1"
                            step="0.1"
                        />
                    </div>

                    <div className={styles.settingGroup}>
                        <label className={styles.label}>
                            Max Tokens
                            <span className={styles.labelHint}>Maximum response length</span>
                        </label>
                        <input
                            type="number"
                            className={styles.input}
                            value={settings.maxTokens}
                            onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
                            min="500"
                            max="8000"
                            step="100"
                        />
                    </div>
                </div>

                <div className={styles.infoBox}>
                    <p><strong>Note:</strong> Profiles are stored in the database. The default profile will be used for all AI chat interactions. Select or create a profile to customize AI behavior.</p>
                </div>

                {saveMessage && (
                    <div className={styles.saveMessage}>
                        {saveMessage}
                    </div>
                )}

                <div className={styles.buttonGroup}>
                    {showNewProfile ? (
                        <>
                            <button
                                onClick={() => {
                                    setShowNewProfile(false);
                                    loadProfiles();
                                }}
                                className={styles.resetButton}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateProfile}
                                className={styles.saveButton}
                                disabled={saving}
                            >
                                <Save size={18} />
                                {saving ? 'Creating...' : 'Create Profile'}
                            </button>
                        </>
                    ) : selectedProfile ? (
                        <>
                            <button
                                onClick={() => {
                                    setSelectedProfile(null);
                                    setProfileName('');
                                    handleReset();
                                }}
                                className={styles.resetButton}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className={styles.saveButton}
                                disabled={saving}
                            >
                                <Save size={18} />
                                {saving ? 'Updating...' : 'Update Profile'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => {
                                    setShowNewProfile(true);
                                    setProfileName('New Profile');
                                }}
                                className={styles.saveButton}
                                disabled={saving}
                            >
                                <Plus size={18} />
                                Create New Profile
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
