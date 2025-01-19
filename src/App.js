import React, { useState, useEffect, useCallback } from 'react';
import { authEndpoint, clientId, redirectUri, scopes } from './config';
import axios from 'axios';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import BlobComponent from './BlobComponent';

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

// Debounce function
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

function BlobPage() {
    const randomizeBlob = () => {
        const shapes = ['round', 'oval', 'wavy', 'squish', 'star', 'flower', 'bubble', 'cloud', 'droplet'];
        const presets = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'white', 'gray', 'black', 'pink', 'turquoise', 'gold', 'rainbow'];
        
        return {
            shape: shapes[Math.floor(Math.random() * shapes.length)],
            colorPreset: presets[Math.floor(Math.random() * presets.length)],
            blobConfig: {
                noiseStrength: Math.random() * 20,
                edgeNoiseStrength: Math.random() * 10,
                pulseSpeed: Math.random() * 0.05,
                pulseStrength: Math.random() * 20,
                radius: 30 + Math.random() * 40,
                edgeSoftness: 20 + Math.random() * 40,
                noiseOffsets: Array(36).fill(0).map(() => ({
                    x: Math.random() * 1000,
                    y: Math.random() * 1000
                }))
            }
        };
    };

    const [blobProps, setBlobProps] = useState(randomizeBlob());

    return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <BlobComponent 
                shape={blobProps.shape}
                colorPreset={blobProps.colorPreset}
                blobConfig={blobProps.blobConfig}
            />
            <button 
                onClick={() => setBlobProps(randomizeBlob())}
                style={{ marginTop: '20px' }}
            >
                Randomize Blob
            </button>
        </div>
    );
}

function SpotifyPlayer({ token, searchQuery, tracks, isPlaying, devices, selectedDevice, acousticBrainzData, 
    handleSearchChange, playTrack, togglePlayPause, fetchDevices, transferPlayback }) {
    return (
        <div>
            <h1>Spotify Player</h1>
            <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search for a song"
            />
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
    );
}

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

    const searchTracks = async (query) => {
        if (!query) return;
        try {
            const { data } = await axios.get(`https://api.spotify.com/v1/search`, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: {
                    q: query,
                    type: 'track'
                }
            });
            console.log('Search Results:', data.tracks.items);
            setTracks(data.tracks.items);
        } catch (error) {
            console.error('Error searching tracks:', error);
        }
    };

    const debouncedSearchTracks = useCallback(debounce(searchTracks, 500), [token]);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        debouncedSearchTracks(e.target.value);
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
                    bpm: lowLevelData.rhythm?.bpm || 'N/A',
                    mood: getMoodColors(highLevelData)
                    // the return value looks like:
                    /*[
                        { color: "Blue", weight: 2.5 },
                        { color: "Purple", weight: 1.8 },
                        { color: "Gray", weight: 1.2 },
                        { color: "Black", weight: 0.8 },
                        { color: "White", weight: 0.5 }
                    ]
                    */
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

    const getMoodColors = (acousticBrainzData) => {
        // Create scoring system for each color based on different moods and attributes
        const colorScores = {
            Red: 0,      // Energy, aggression
            Orange: 0,   // Warmth, creativity
            Yellow: 0,   // Joy, optimism
            Green: 0,    // Peace, harmony
            Blue: 0,     // Calm, melancholy
            Purple: 0,   // Mystery, introspection
            White: 0,    // Clarity, simplicity
            Gray: 0,     // Neutrality, ambiguity
            Black: 0,    // Intensity, seriousness
            Pink: 0,     // Playfulness
            Turquoise: 0,// Freshness, curiosity
            Gold: 0      // Sophistication
        };

        const hl = acousticBrainzData.highlevel || {};

        // Score colors based on moods
        if (hl.mood_happy?.all?.happy) {
            colorScores.Yellow += hl.mood_happy.all.happy * 2;
            colorScores.Orange += hl.mood_happy.all.happy;
            colorScores.Pink += hl.mood_happy.all.happy * 0.5;
        }

        if (hl.mood_sad?.all?.sad) {
            colorScores.Blue += hl.mood_sad.all.sad * 2;
            colorScores.Gray += hl.mood_sad.all.sad;
            colorScores.Purple += hl.mood_sad.all.sad * 0.5;
        }

        if (hl.mood_aggressive?.all?.aggressive) {
            colorScores.Red += hl.mood_aggressive.all.aggressive * 2;
            colorScores.Black += hl.mood_aggressive.all.aggressive;
            colorScores.Orange += hl.mood_aggressive.all.aggressive * 0.5;
        }

        if (hl.mood_relaxed?.all?.relaxed) {
            colorScores.Green += hl.mood_relaxed.all.relaxed * 2;
            colorScores.Blue += hl.mood_relaxed.all.relaxed;
            colorScores.White += hl.mood_relaxed.all.relaxed * 0.5;
        }

        if (hl.mood_electronic?.all?.electronic) {
            colorScores.Turquoise += hl.mood_electronic.all.electronic * 2;
            colorScores.Purple += hl.mood_electronic.all.electronic;
            colorScores.Blue += hl.mood_electronic.all.electronic * 0.5;
        }

        if (hl.mood_party?.all?.party) {
            colorScores.Pink += hl.mood_party.all.party * 2;
            colorScores.Orange += hl.mood_party.all.party;
            colorScores.Yellow += hl.mood_party.all.party * 0.5;
        }

        if (hl.mood_acoustic?.all?.acoustic) {
            colorScores.Brown += hl.mood_acoustic.all.acoustic;
            colorScores.Green += hl.mood_acoustic.all.acoustic * 0.5;
        }

        // Add genre influence
        const genre = hl.genre_dortmund?.value;
        switch (genre) {
            case 'classical':
                colorScores.Gold += 1;
                colorScores.White += 0.5;
                break;
            case 'jazz':
                colorScores.Purple += 1;
                colorScores.Blue += 0.5;
                break;
            case 'electronic':
                colorScores.Turquoise += 1;
                colorScores.Purple += 0.5;
                break;
            case 'rock':
                colorScores.Red += 1;
                colorScores.Black += 0.5;
                break;
        }

        // Add timbre influence
        if (hl.timbre?.value === 'dark') {
            colorScores.Black += 1;
            colorScores.Purple += 0.5;
            colorScores.Blue += 0.5;
        } else {
            colorScores.White += 1;
            colorScores.Yellow += 0.5;
            colorScores.Orange += 0.5;
        }

        // Sort colors by score and get top 5
        const topColors = Object.entries(colorScores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([color, score]) => ({
                color,
                weight: score
            }));

        return topColors;
    };

    return (
        <Router>
            <div className="App">
                <nav>
                    <Link to="/">Home</Link> | <Link to="/blob">Blob</Link>
                </nav>
                <Routes>
                    <Route path="/blob" element={<BlobPage />} />
                    <Route 
                        path="/" 
                        element={
                            !token ? (
                                <a
                                    href={`${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join(
                                        "%20"
                                    )}&response_type=token&show_dialog=true`}
                                >
                                    Login to Spotify
                                </a>
                            ) : (
                                <SpotifyPlayer 
                                    token={token}
                                    searchQuery={searchQuery}
                                    tracks={tracks}
                                    isPlaying={isPlaying}
                                    devices={devices}
                                    selectedDevice={selectedDevice}
                                    acousticBrainzData={acousticBrainzData}
                                    handleSearchChange={handleSearchChange}
                                    playTrack={playTrack}
                                    togglePlayPause={togglePlayPause}
                                    fetchDevices={fetchDevices}
                                    transferPlayback={transferPlayback}
                                />
                            )
                        } 
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
