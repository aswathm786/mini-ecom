/**
 * AI Rate Limiters
 *
 * Separate rate limiters for public AI endpoints vs. admin tooling to ensure
 * prompt-abuse protection without impacting critical flows.
 */

import rateLimit from 'express-rate-limit';
import { Config } from '../config/Config';

export const aiChatRateLimiter = rateLimit({
  windowMs: Config.AI_CHAT_RATE_LIMIT_WINDOW_MS,
  max: Config.AI_CHAT_RATE_LIMIT_MAX_REQUESTS,
  message: 'AI assistant is cooling down. Please try again shortly.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiSearchRateLimiter = rateLimit({
  windowMs: Config.AI_SEARCH_RATE_LIMIT_WINDOW_MS,
  max: Config.AI_SEARCH_RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many AI search requests. Slow down and try again.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiAdminRateLimiter = rateLimit({
  windowMs: Config.AI_ADMIN_RATE_LIMIT_WINDOW_MS,
  max: Config.AI_ADMIN_RATE_LIMIT_MAX_REQUESTS,
  message: 'Admin AI usage limit exceeded. Wait a moment before retrying.',
  standardHeaders: true,
  legacyHeaders: false,
});


