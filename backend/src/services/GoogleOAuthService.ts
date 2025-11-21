import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { Config } from '../config/Config';
import { platformSettingsService } from './PlatformSettingsService';

export interface GoogleProfile {
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  sub: string;
}

/**
 * Check if Google OAuth is enabled
 */
async function isGoogleOAuthEnabled(): Promise<boolean> {
  try {
    const settings = await platformSettingsService.getSettings();
    // Check nested structure: settings.auth.google.enabled
    const authSettings = (settings as any).auth;
    if (authSettings && authSettings.google && authSettings.google.enabled === true) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Create OAuth client dynamically (loads from DB via Config.get)
function getOAuthClient(): OAuth2Client | null {
  const clientId = Config.get('GOOGLE_CLIENT_ID', '');
  const clientSecret = Config.get('GOOGLE_CLIENT_SECRET', '');
  return clientId && clientSecret ? new OAuth2Client(clientId, clientSecret) : null;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  // Check if Google OAuth is enabled
  const isEnabled = await isGoogleOAuthEnabled();
  if (!isEnabled) {
    throw new Error('Google login is not enabled. Please enable it in admin settings.');
  }

  const client = getOAuthClient();
  if (!client) {
    throw new Error('Google login is not configured. Please add Google Client ID and Secret in admin settings.');
  }

  const clientId = Config.get('GOOGLE_CLIENT_ID', '');
  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });

  const payload: TokenPayload | undefined = ticket.getPayload();

  if (!payload || !payload.email) {
    throw new Error('Unable to verify Google credentials');
  }

  return {
    email: payload.email,
    emailVerified: payload.email_verified ?? false,
    firstName: payload.given_name,
    lastName: payload.family_name,
    avatar: payload.picture,
    sub: payload.sub || payload.email,
  };
}


