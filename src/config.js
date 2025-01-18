   // src/config.js
   export const authEndpoint = "https://accounts.spotify.com/authorize";
   export const clientId = "5cfe2dc04e3a4f71a3ac0668fe002b87"; // Replace with your Client ID
   export const redirectUri = "http://localhost:3000/callback";
   export const scopes = [
       "streaming",
       "user-read-email",
       "user-read-private",
       "user-library-read",
       "user-library-modify",
       "user-read-playback-state",
       "user-modify-playback-state"
   ];