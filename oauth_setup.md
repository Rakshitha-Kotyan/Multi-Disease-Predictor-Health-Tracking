# OAuth Setup Guide

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set Application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:5000/oauth/callback` (for development)
   - `https://yourdomain.com/oauth/callback` (for production)
7. Copy Client ID and Client Secret

## Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add "Facebook Login" product
4. Go to Facebook Login → Settings
5. Add Valid OAuth Redirect URIs:
   - `http://localhost:5000/oauth/callback` (for development)
   - `https://yourdomain.com/oauth/callback` (for production)
6. Copy App ID and App Secret

## Environment Variables

Create a `.env` file in your project root:

```env
SECRET_KEY=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

## Running the Application

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set environment variables (or create .env file)

3. Run the application:
   ```bash
   python server.py
   ```

4. Visit `http://localhost:5000` and test OAuth login!

## Testing OAuth

- Click "Continue with Google" or "Continue with Facebook"
- You'll be redirected to the OAuth provider
- After authorization, you'll be redirected back to the app
- The user will be automatically logged in

## Security Notes

- Never commit your OAuth credentials to version control
- Use environment variables for all sensitive data
- In production, use HTTPS for all OAuth redirects
- Regularly rotate your OAuth secrets

