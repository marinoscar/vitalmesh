import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as url from 'url';

/**
 * Google OAuth guard for Fastify
 *
 * Initiates the Google OAuth flow when applied to a route.
 * Used on both the initial OAuth endpoint and the callback endpoint.
 *
 * Note: Passport OAuth strategies expect Express-style request/response objects.
 * This guard overrides getRequest/getResponse to return raw Node.js http objects
 * that Passport can work with. After authentication, it copies the user back
 * to the Fastify request so controllers can access req.user normally.
 *
 * IMPORTANT: The raw Node.js IncomingMessage does NOT have a parsed `query`
 * property. Passport-oauth2 relies on `req.query.code` to detect the OAuth
 * callback and exchange the authorization code. Without parsing `query` from
 * the URL, passport treats every callback as a new auth initiation, causing
 * "TokenError: Bad Request" when the re-initiated flow collides with Google.
 */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  getRequest(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const raw = request.raw || request;

    // Passport expects Express-style req.query (parsed query string object).
    // Fastify's raw IncomingMessage only has req.url (unparsed string).
    // Parse and attach query so passport-oauth2 can find the authorization code.
    if (!raw.query && raw.url) {
      const parsed = url.parse(raw.url, true);
      raw.query = parsed.query;
    }

    return raw;
  }

  getResponse(context: ExecutionContext) {
    const response = context.switchToHttp().getResponse();
    // Return the raw Node.js ServerResponse for Passport compatibility
    return response.raw || response;
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err || new Error('Authentication failed');
    }

    // Copy user from raw request to Fastify request so controllers can access it
    const fastifyRequest = context.switchToHttp().getRequest();
    fastifyRequest.user = user;

    return user;
  }
}
