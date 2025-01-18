import React, { useState, useEffect } from 'react';
import { authEndpoint, clientId, redirectUri, scopes } from './config';
import axios from 'axios';
import './App.css';

const hash = window.location.hash
    .substring(1)
    .split("&")
    .reduce((initial, item) => {
        let parts = item.split("=");
        initial[parts[0]] = decodeURIComponent(parts[1]);
        return initial;
    }, {});

function App() {
    const [token, setToken] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [tracks, setTracks] = useState([]);
    const [player, setPlayer] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [selectedTrackFeatures, setSelectedTrackFeatures] = useState(null);
    const [selectedTrackGenre, setSelectedTrackGenre] = useState(null);

    useEffect(() => {
        let _token = hash.access_token;
        if (_token) {
            setToken(_token);
            window.location.hash = "";
        }

        window.onSpotifyWebPlaybackSDKReady = () => {
            const player = new window.Spotify.Player({
                name: 'Web Playback SDK Quick Start Player',
                getOAuthToken: cb => { cb(_token); }
            });

            // Error handling
            player.addListener('initialization_error', ({ message }) => { console.error('Initialization Error:', message); });
            player.addListener('authentication_error', ({ message }) => { console.error('Authentication Error:', message); });
            player.addListener('account_error', ({ message }) => { console.error('Account Error:', message); });
            player.addListener('playback_error', ({ message }) => { console.error('Playback Error:', message); });

            // Playback status updates
            player.addListener('player_state_changed', state => {
                console.log('Player State Changed:', state);
                setIsPlaying(!state.paused);
            });

            // Ready
            player.addListener('ready', ({ device_id }) => {
                console.log('Ready with Device ID', device_id);
                setSelectedDevice(device_id);
            });

            // Not Ready
            player.addListener('not_ready', ({ device_id }) => {
                console.log('Device ID has gone offline', device_id);
            });

            // Connect to the player!
            player.connect().then(success => {
                if (success) {
                    console.log('The Web Playback SDK successfully connected to Spotify!');
                }
            });
            setPlayer(player);
        };
    }, [token]);

    const searchTracks = async () => {
        if (!searchQuery) return;
        try {
            const { data } = await axios.get(`https://api.spotify.com/v1/search`, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: {
                    q: searchQuery,
                    type: 'track'
                }
            });
            console.log('Search Results:', data.tracks.items);
            setTracks(data.tracks.items);
        } catch (error) {
            console.error('Error searching tracks:', error);
        }
    };

    const playTrack = (trackUri, track) => {
        if (!player) return;
        console.log('Playing Track:', track);
        player._options.getOAuthToken(access_token => {
            fetch(`https://api.spotify.com/v1/me/player/play`, {
                method: 'PUT',
                body: JSON.stringify({ uris: [trackUri] }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access_token}`
                },
            }).then(response => {
                if (!response.ok) {
                    console.error('Error playing track:', response.statusText);
                }
            });
        });
    };

    const togglePlayPause = () => {
        if (!player) return;
        player.togglePlay().then(() => {
            console.log('Toggled playback!');
        });
    };

    const fetchDevices = async () => {
        try {
            const { data } = await axios.get('https://api.spotify.com/v1/me/player/devices', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setDevices(data.devices);
        } catch (error) {
            console.error('Error fetching devices:', error);
        }
    };

    const transferPlayback = (deviceId) => {
        axios.put('https://api.spotify.com/v1/me/player', {
            device_ids: [deviceId],
            play: true
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then(() => {
            setSelectedDevice(deviceId);
            console.log('Playback transferred to device:', deviceId);
        }).catch(error => {
            console.error('Error transferring playback:', error);
        });
    };

    const fetchTrackFeatures = async (trackId, artistId) => {
        try {
            const [featuresResponse, artistResponse] = await Promise.all([
                axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }),
                axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })
            ]);

            console.log('Track Features:', featuresResponse.data);
            console.log('Artist Info:', artistResponse.data);

            setSelectedTrackFeatures(featuresResponse.data);
            setSelectedTrackGenre(artistResponse.data.genres.join(', '));
        } catch (error) {
            console.error('Error fetching track features or artist info:', error);
        }
    };

    return (
        <div className="App">
            {!token && (
                <a
                    href={`${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join(
                        "%20"
                    )}&response_type=token&show_dialog=true`}
                >
                    Login to Spotify
                </a>
            )}
            {token && (
                <div>
                    <h1>Spotify Player</h1>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for a song"
                    />
                    <button onClick={searchTracks}>Search</button>
                    <ul>
                        {tracks.map(track => (
                            <li key={track.id}>
                                {track.name} by {track.artists.map(artist => artist.name).join(', ')}
                                <button onClick={() => {
                                    playTrack(track.uri, track);
                                    fetchTrackFeatures(track.id, track.artists[0].id);
                                }}>Play</button>
                            </li>
                        ))}
                    </ul>
                    <button onClick={togglePlayPause}>
                        {isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <div>
                        <h2>Available Devices</h2>
                        <button onClick={fetchDevices}>Refresh Devices</button>
                        <ul>
                            {devices.map(device => (
                                <li key={device.id}>
                                    {device.name} {device.id === selectedDevice && "(Current)"}
                                    <button onClick={() => transferPlayback(device.id)}>Select</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {selectedTrackFeatures && (
                        <div>
                            <h2>Track Features</h2>
                            <p>Tempo: {selectedTrackFeatures.tempo} BPM</p>
                            <p>Key: {selectedTrackFeatures.key}</p>
                            <p>Mode: {selectedTrackFeatures.mode === 1 ? 'Major' : 'Minor'}</p>
                            <p>Danceability: {selectedTrackFeatures.danceability}</p>
                            <p>Energy: {selectedTrackFeatures.energy}</p>
                            <p>Valence: {selectedTrackFeatures.valence}</p>
                            <p>Genre: {selectedTrackGenre}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
