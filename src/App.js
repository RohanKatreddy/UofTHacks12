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

// Utility function to create a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function App() {
    const [token, setToken] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [tracks, setTracks] = useState([]);
    const [player, setPlayer] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [acousticBrainzData, setAcousticBrainzData] = useState(null);

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

    const fetchMBIDs = async (trackName, artistName) => {
        try {
            const response = await axios.get('https://musicbrainz.org/ws/2/recording/', {
                params: {
                    query: `${trackName} AND artist:${artistName}`,
                    fmt: 'json'
                }
            });
            const recordings = response.data.recordings;
            if (recordings && recordings.length > 0) {
                const mbids = recordings.map(recording => recording.id);
                console.log(`MBIDs for ${trackName} by ${artistName}:`, mbids);
                return mbids; // Return all MBIDs found
            }
        } catch (error) {
            console.error('Error fetching MBIDs:', error);
        }
        return [];
    };

    const playTrack = async (trackUri, track) => {
        if (!player) return;
        console.log('Playing Track:', track);
        player._options.getOAuthToken(async access_token => {
            try {
                const response = await fetch(`https://api.spotify.com/v1/me/player/play`, {
                    method: 'PUT',
                    body: JSON.stringify({ uris: [trackUri] }),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${access_token}`
                    },
                });
                if (!response.ok) {
                    console.error('Error playing track:', response.statusText);
                } else {
                    const mbids = await fetchMBIDs(track.name, track.artists[0].name);
                    if (mbids.length > 0) {
                        fetchAcousticBrainzData(mbids);
                    } else {
                        console.log('No MBIDs found for track:', track.name);
                    }
                }
            } catch (error) {
                console.error('Error during playback or MBID fetch:', error);
            }
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

    const fetchAcousticBrainzData = async (mbids) => {
        for (const mbid of mbids) {
            try {
                // Low-level data request
                const lowLevelUrl = `http://localhost:8080/https://acousticbrainz.org/api/v1/${mbid}/low-level`;
                const lowLevelResponse = await axios.get(lowLevelUrl);
                const lowLevelData = lowLevelResponse.data;

                // High-level data request
                const highLevelUrl = `http://localhost:8080/https://acousticbrainz.org/api/v1/${mbid}/high-level`;
                const highLevelResponse = await axios.get(highLevelUrl);
                const highLevelData = highLevelResponse.data;

                console.log(`Track Name in AcousticBrainz: ${lowLevelData.metadata?.tags?.title?.[0] || 'Unknown'}`);
                console.log(`Working AcousticBrainz URLs: Low-level: ${lowLevelUrl}, High-level: ${highLevelUrl}`);

                const features = {
                    danceability: lowLevelData.rhythm?.danceability || 'N/A',
                    genre: highLevelData.highlevel?.genre_dortmund?.value || 'N/A',
                    emotion: highLevelData.highlevel?.mood_happy?.value || 'N/A',
                    bpm: lowLevelData.rhythm?.bpm || 'N/A'
                };
                console.log('AcousticBrainz Features:', features);
                setAcousticBrainzData(features);
                return; // Exit once successful
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.error(`No data found for MBID ${mbid} in AcousticBrainz.`);
                } else if (error.response && error.response.status === 429) {
                    console.error('Rate limit exceeded. Waiting before retrying...');
                    await delay(1000); // Wait for 1 second before retrying
                } else {
                    console.error('Error fetching AcousticBrainz data:', error);
                }
            }
        }
        console.error('No valid MBID found in AcousticBrainz.');
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
                                <button onClick={() => playTrack(track.uri, track)}>Play</button>
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
                    {acousticBrainzData && (
                        <div className="acoustic-brainz-data">
                            <h2>AcousticBrainz Features</h2>
                            <p><strong>Danceability:</strong> {acousticBrainzData.danceability}</p>
                            <p><strong>Genre:</strong> {acousticBrainzData.genre}</p>
                            <p><strong>Emotion:</strong> {acousticBrainzData.emotion}</p>
                            <p><strong>BPM:</strong> {acousticBrainzData.bpm}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
