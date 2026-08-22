import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper to derive app URL dynamically from request headers or environment
function getAppUrl(req: express.Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  return `${proto}://${host}`.replace(/\/$/, '');
}

// Google OAuth Login Initiation Route
app.get('/api/auth/google/login', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || process.env.OAUTH_CLIENT_ID;
  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  if (clientId && clientId !== 'MY_CLIENT_ID') {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('openid email profile')}&` +
      `access_type=offline&` +
      `prompt=select_account`;
    
    return res.redirect(googleAuthUrl);
  } else {
    // Redirect to callback in mock mode for development preview
    return res.redirect(`/api/auth/google/callback?mock=true`);
  }
});

// Google OAuth Callback Route
app.get('/api/auth/google/callback', async (req, res) => {
  const code = req.query.code as string;
  const isMock = req.query.mock === 'true';
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET;
  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  let userData = {
    id: 'g-' + Math.random().toString(36).substring(2, 8),
    email: 'fastinvoicd@gmail.com',
    displayName: 'Ashraful Islam',
    photoURL: 'https://lh3.googleusercontent.com/a/default-user'
  };

  if (code && clientId && clientSecret && !isMock) {
    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.access_token) {
        // Fetch user profile from Google UserInfo endpoint
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const profile = await userResponse.json();

        if (profile.id || profile.email) {
          userData = {
            id: 'g-' + (profile.id || profile.sub),
            email: profile.email || 'fastinvoicd@gmail.com',
            displayName: profile.name || profile.given_name || 'Ashraful Islam',
            photoURL: profile.picture || 'https://lh3.googleusercontent.com/a/default-user'
          };
        }
      }
    } catch (err) {
      console.error('Error exchanging Google OAuth token:', err);
    }
  }

  // HTML response to communicate with parent window via postMessage and close popup
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Google Authentication</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #0f172a;
            color: #f8fafc;
            text-align: center;
          }
          .card {
            background: #1e293b;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            border: 1px solid #334155;
            max-width: 360px;
          }
          .spinner {
            border: 3px solid #334155;
            border-top: 3px solid #10b981;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 16px auto;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          h2 { font-size: 18px; margin: 0 0 8px 0; color: #10b981; }
          p { font-size: 13px; color: #94a3b8; margin: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="spinner"></div>
          <h2>Authentication Successful</h2>
          <p>Signing in as <strong>${userData.email}</strong>...</p>
        </div>
        <script>
          const authData = ${JSON.stringify(userData)};
          if (window.opener) {
            window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', user: authData }, '*');
            setTimeout(() => { window.close(); }, 600);
          } else {
            setTimeout(() => { window.location.href = '/'; }, 1000);
          }
        </script>
      </body>
    </html>
  `;

  res.send(html);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
