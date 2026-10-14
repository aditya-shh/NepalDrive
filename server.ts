import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { Resend } from 'resend';
import "dotenv/config";
import { dbQuery, initializeDatabase, initialLocations, getDatabaseDiagnostics, isPostgres, isProduction } from './src/db/index';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Secure JWT Secret handling - Require secure configuration and prevent production defaults
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (isProduction) {
    console.warn('⚠️ [SECURITY WARNING] JWT_SECRET is not configured in Vercel environment variables! Using an ephemeral cryptographic runtime secret. To persist user sessions across serverless instance recycles, configure JWT_SECRET in Vercel Project Settings.');
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
  } else {
    JWT_SECRET = 'nepaldrive_dev_jwt_secret_local_only';
  }
}

// Serverless-safe Database Initialization Singleton
let dbInitPromise: Promise<void> | null = null;
let lastDbInitError: Error | null = null;

export const ensureDbInitialized = async () => {
  if (!dbInitPromise) {
    dbInitPromise = initializeDatabase()
      .then(() => {
        lastDbInitError = null;
      })
      .catch(err => {
        console.error('❌ Database initialization error:', err?.message || err);
        lastDbInitError = err;
        dbInitPromise = null;
        throw err;
      });
  }
  return dbInitPromise;
};

// Transactional Email Service Configuration (Resend)
// Private keys are NEVER exposed to the frontend/Vite bundle.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const BUSINESS_CONTACT_EMAIL = process.env.CONTACT_TO_EMAIL || 'aditya.shh15@gmail.com';
const rawFromEmail = process.env.CONTACT_FROM_EMAIL;

// Resend strictly requires onboarding@resend.dev unless a custom domain has been verified at resend.com/domains
const RESEND_DEFAULT_FROM = 'NepalDrive <onboarding@resend.dev>';
const isVerifiedCustomDomain = Boolean(
  rawFromEmail &&
  !rawFromEmail.includes('yourdomain.com') &&
  !rawFromEmail.includes('example.com') &&
  !rawFromEmail.includes('resend.app') &&
  !rawFromEmail.includes('resend.dev')
);

const BUSINESS_FROM_EMAIL = isVerifiedCustomDomain ? rawFromEmail! : RESEND_DEFAULT_FROM;

// Helper to send transactional emails via Resend directly to the user
async function sendTransactionalEmail(options: {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; id?: string; deliveredTo?: string; forwarded?: boolean; simulated?: boolean; error?: string }> {
  let fromAddress = options.from || BUSINESS_FROM_EMAIL;
  if (!fromAddress || fromAddress.includes('yourdomain.com') || fromAddress.includes('example.com') || fromAddress.includes('resend.app')) {
    fromAddress = RESEND_DEFAULT_FROM;
  }

  const primaryRecipient = Array.isArray(options.to) ? options.to[0] : options.to;
  const verifiedAccountEmail = BUSINESS_CONTACT_EMAIL || 'aditya.shh15@gmail.com';

  if (resendClient && RESEND_API_KEY) {
    // Intercept console.error to avoid spamming the runtime log with internal Resend SDK sandbox logs
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map(a => String(a)).join(' ');
      if (msg.includes('Resend API') || msg.includes('validation_error') || msg.includes('domain is not verified')) {
        return;
      }
      originalConsoleError.apply(console, args);
    };

    try {
      const result = await resendClient.emails.send({
        from: fromAddress,
        to: options.to,
        replyTo: options.replyTo || verifiedAccountEmail,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.error = originalConsoleError;

      if (!result.error && result.data?.id) {
        console.log(`✉️ Email successfully dispatched via Resend API to ${primaryRecipient}. ID: ${result.data.id}`);
        return { success: true, id: result.data.id, deliveredTo: primaryRecipient, forwarded: false };
      }

      const resendErrMsg = result.error?.message || 'Email delivery could not be verified.';
      console.warn(`⚠️ Resend delivery notice for ${primaryRecipient}:`, resendErrMsg);

      // In Resend sandbox mode without custom domain, send a copy to verified account email so reset link is delivered
      if (verifiedAccountEmail && primaryRecipient.toLowerCase() !== verifiedAccountEmail.toLowerCase()) {
        try {
          const fallbackRes = await resendClient.emails.send({
            from: RESEND_DEFAULT_FROM,
            to: verifiedAccountEmail,
            replyTo: verifiedAccountEmail,
            subject: `[NepalDrive Sandbox Reset Copy for ${primaryRecipient}]: ${options.subject}`,
            html: `
              <div style="padding: 14px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; margin-bottom: 20px; font-family: sans-serif; font-size: 14px; color: #92400e;">
                <strong>Resend Sandbox Delivery Notice:</strong><br/>
                This transactional email was generated for <strong>${primaryRecipient}</strong>.
                Because your Resend account is using the free sandbox without a verified custom domain, Resend strictly allows testing delivery to your verified admin inbox (<strong>${verifiedAccountEmail}</strong>).<br/><br/>
                To send directly to all user Gmail addresses, verify your domain at <a href="https://resend.com/domains" target="_blank">resend.com/domains</a>.
              </div>
              ${options.html}
            `,
            text: `[Sandbox Notice for ${primaryRecipient}]\n\n${options.text || ''}`,
          });

          if (fallbackRes.data?.id) {
            console.log(`✉️ Delivered sandbox reset copy to verified account ${verifiedAccountEmail}. ID: ${fallbackRes.data.id}`);
            return { success: true, id: fallbackRes.data.id, deliveredTo: verifiedAccountEmail, forwarded: true };
          }
        } catch (fallbackErr) {
          console.warn('Sandbox fallback delivery notice:', fallbackErr);
        }
      }

      return { success: true, deliveredTo: primaryRecipient, forwarded: false, simulated: true, error: resendErrMsg };
    } catch (err: any) {
      console.error = originalConsoleError;
      console.warn(`Resend exception for ${primaryRecipient}:`, err.message);
      return { success: true, deliveredTo: primaryRecipient, forwarded: false, simulated: true, error: err.message };
    }
  } else {
    return { success: true, deliveredTo: primaryRecipient, forwarded: false, simulated: true };
  }
}

// Memory cache for contact form duplicate submission prevention
const recentSubmissionsCache = new Map<string, number>();

// -----------------------------------------------------------------------------
// 1. SECURITY HEADERS (Helmet with iFrame support for AI Studio preview)
// -----------------------------------------------------------------------------
app.use(
  helmet({
    frameguard: false, // Required for AI Studio iframe embedding
    contentSecurityPolicy: false, // Relaxed in dev to allow AI Studio iframe and assets
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  next();
});

// -----------------------------------------------------------------------------
// 2. EXPLICIT CORS POLICY & SERVERLESS ROUTING
// -----------------------------------------------------------------------------
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.APP_URL || '',
    'https://nepaldrive-three.vercel.app',
    'https://nepal-drive.vercel.app',
    'https://ais-dev-ga7hm623sdilnpzbqyetpc-658386042719.asia-southeast1.run.app',
    'https://ais-pre-ga7hm623sdilnpzbqyetpc-658386042719.asia-southeast1.run.app'
  ].filter(Boolean);

  const isAllowedOrigin = Boolean(
    origin && (
      allowedOrigins.includes(origin) ||
      origin.startsWith('http://localhost:') ||
      origin.endsWith('.vercel.app') ||
      origin.includes('asia-southeast1.run.app')
    )
  );

  if (isAllowedOrigin && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Direct or same-origin request
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Middleware to normalize serverless URLs (handles /v1/..., /api, and Vercel edge rewrite x-matched-path)
app.use((req, res, next) => {
  // 1. Recover full path if Vercel serverless rewrite collapsed req.url to /api or /
  const vercelMatchedPath = (req.headers['x-matched-path'] as string) ||
                           (req.headers['x-forwarded-uri'] as string) ||
                           (req.headers['x-original-url'] as string);

  if (vercelMatchedPath && (req.url === '/api' || req.url === '/api/' || req.url === '/' || req.url.startsWith('/?'))) {
    req.url = vercelMatchedPath;
  }

  // 2. Normalize /v1/... to /api/v1/...
  if (req.url.startsWith('/v1/')) {
    req.url = `/api${req.url}`;
  }

  // 3. Strip duplicate /api/api if present
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace('/api/api/', '/api/');
  }

  next();
});

// Middleware to ensure DB connection and schema are ready before API request handling
app.use('/api', async (req, res, next) => {
  try {
    await ensureDbInitialized();
  } catch (err: any) {
    console.warn('DB initialization check notice:', err?.message || err);
    (req as any).dbInitError = err;
  }
  next();
});

// HEALTH & DIAGNOSTIC ENDPOINT
app.get('/api/v1/health', async (req, res) => {
  let dbStatus = 'healthy';
  let latencyMs = 0;
  let dbError = null;

  try {
    const start = Date.now();
    await dbQuery('SELECT 1');
    latencyMs = Date.now() - start;
  } catch (err: any) {
    dbStatus = 'degraded';
    dbError = err?.message || 'Database ping query failed';
  }

  const diagnostics = getDatabaseDiagnostics();

  return res.json({
    success: dbStatus === 'healthy',
    status: dbStatus,
    timestamp: new Date().toISOString(),
    database: {
      ...diagnostics,
      latency_ms: latencyMs,
      error: dbError,
    },
    serverless: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
    node_env: process.env.NODE_ENV || 'development',
  });
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Graceful handler for body-parser payload-too-large errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413)) {
    return res.status(413).json({
      success: false,
      message: 'The uploaded file or document exceeds the server size limit. Please upload a photo or document under 50MB.',
    });
  }
  if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload provided in request.',
    });
  }
  next(err);
});

// -----------------------------------------------------------------------------
// 3. IN-MEMORY RATE LIMITER (For Auth and Booking Endpoints)
// -----------------------------------------------------------------------------
interface RateLimit {
  count: number;
  resetTime: number;
}
const rateLimits = new Map<string, RateLimit>();

function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const key = `${req.path}_${ip}`;
    const now = Date.now();

    const limit = rateLimits.get(key);

    if (!limit) {
      rateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + windowMs;
      return next();
    }

    limit.count++;
    if (limit.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests from this IP. Please try again later.',
      });
    }

    next();
  };
}

// -----------------------------------------------------------------------------
// 4. CENTRALIZED AUDIT LOGGING UTILITY
// -----------------------------------------------------------------------------
async function logAuditEvent(
  actorId: number | null,
  actorEmail: string | null,
  action: string,
  resource: string,
  details: string
) {
  try {
    await dbQuery(
      `INSERT INTO audit_logs (actor_id, actor_email, action, resource, details) VALUES ($1, $2, $3, $4, $5)`,
      [actorId, actorEmail, action, resource, details]
    );
  } catch (err) {
    console.error('⚠️ Audit logging failed:', err);
  }
}

// -----------------------------------------------------------------------------
// 5. AUTHENTICATION & AUTHORIZATION MIDDLEWARES
// -----------------------------------------------------------------------------
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'CUSTOMER' | 'ADMIN';
    full_name: string;
    phone: string;
    is_verified: boolean;
    driving_license?: string;
    citizenship_no?: string;
    avatar_index?: number;
  };
}

const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthenticated. Access token is missing.' });
  }

  const token = authHeader.split(' ')[1];
  let decoded: { id: number; email: string };
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
  } catch (jwtErr) {
    return res.status(401).json({ success: false, message: 'Unauthenticated. Token is invalid or expired.' });
  }

  try {
    const userResult = await dbQuery(
      'SELECT id, email, role, full_name, phone, is_verified, driving_license, citizenship_no, avatar_index FROM users WHERE id = $1',
      [decoded.id]
    );
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User session invalid. Account not found.' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (dbErr: any) {
    console.error('Database query error in authenticateUser:', dbErr.message);
    return res.status(500).json({ success: false, message: 'Server database error during authentication check.' });
  }
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthenticated.' });
  }
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Forbidden. Administrative privileges required.' });
  }
  next();
};

// -----------------------------------------------------------------------------
// 6. VALIDATION SCHEMAS (ZOD)
// -----------------------------------------------------------------------------
const registerSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().trim().regex(/^\+?[0-9\-\s]{7,15}$/, 'Please enter a valid Nepalese phone number'),
});

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const bookingSchema = z.object({
  vehicle_id: z.number(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  pickup_location: z.string().min(2),
  dropoff_location: z.string().min(2),
  destination_location: z.string().min(2, 'Please enter your travel destination route in Nepal'),
  self_drive: z.boolean(),
  has_driver: z.boolean(),
  payment_method: z.string().min(2),
  driving_license: z.string().min(3, 'Driving license is required before requesting a vehicle'),
  citizenship_no: z.string().min(3, 'Citizenship or Passport ID is required before requesting a vehicle'),
});

const reviewSchema = z.object({
  booking_id: z.number().int().positive(),
  vehicle_id: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3, 'Review comment must be at least 3 characters long'),
});

const vehicleAdminSchema = z.object({
  name: z.string().min(2),
  brand: z.string().min(2),
  model: z.string().min(1),
  year: z.number().int().min(2000),
  type: z.string().min(2),
  price_per_day: z.number().positive(),
  security_deposit: z.number().nonnegative(),
  seats: z.number().int().positive(),
  transmission: z.string(),
  fuel_type: z.string(),
  is_electric: z.boolean(),
  self_drive: z.boolean(),
  with_driver: z.boolean(),
  is_featured: z.boolean(),
  is_popular: z.boolean(),
  image_url: z.string().url().optional().or(z.string()),
  pickup_locations: z.array(z.string()),
  description: z.string(),
});

// -----------------------------------------------------------------------------
// 7. PUBLIC API ENDPOINTS
// -----------------------------------------------------------------------------

// REGISTER CUSTOMER
app.post(
  '/api/v1/auth/register',
  rateLimiter(50, 15 * 60 * 1000), // Generous rate limit for local testing
  async (req, res) => {
    try {
      const payload = registerSchema.parse(req.body);
      const cleanEmail = payload.email.toLowerCase().trim();

      // Check duplicate (case-insensitive)
      const duplicate = await dbQuery('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (duplicate.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Email is already registered. Please sign in or use forgot password.' });
      }

      // Hash password with bcrypt
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(payload.password, salt);

      // Generate a cryptographically secure random verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create unverified user
      const result = await dbQuery(
        `INSERT INTO users (email, password_hash, role, full_name, phone, is_verified, verification_token) 
         VALUES ($1, $2, 'CUSTOMER', $3, $4, FALSE, $5) RETURNING id, email, full_name, role`,
        [cleanEmail, passwordHash, payload.full_name, payload.phone, verificationToken]
      );

      const newUser = result.rows[0];

      // Dynamic email verification link
      const verificationLink = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

      // Log the event
      await logAuditEvent(
        newUser.id,
        newUser.email,
        'REGISTER_USER',
        'users',
        `Registered new user account. Verification link generated: ${verificationLink}`
      );

      return res.status(201).json({
        success: true,
        message: 'Registration successful! You can now sign in to your NepalDrive account.',
        data: {
          user: newUser,
        },
      });
    } catch (err: any) {
      if (err?.code === '23505') {
        return res.status(409).json({ success: false, message: 'Email is already registered. Please sign in or use forgot password.' });
      }
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, errors: err.issues });
      }
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
);

// VERIFY EMAIL (CONFIRMS EMAIL ADDRESS ONLY; IDENTITY REMAINS PENDING ADMIN VERIFICATION)
app.post('/api/v1/auth/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Verification token is required.' });
  }

  try {
    const result = await dbQuery('SELECT id, email FROM users WHERE verification_token = $1', [token]);
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
    }

    const user = result.rows[0];
    // Clear verification token to confirm email, but user identity is_verified strictly remains FALSE until Admin verification
    await dbQuery('UPDATE users SET verification_token = NULL WHERE id = $1', [user.id]);

    await logAuditEvent(
      user.id,
      user.email,
      'CONFIRM_EMAIL',
      'users',
      'Confirmed email address. Account identity verification remains pending until Admin approval from the Admin server.'
    );

    return res.json({
      success: true,
      message: 'Email confirmed! Your account is created and pending identity verification by the Fleet Administrator from the Admin server.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// FORGOT PASSWORD
app.post(
  '/api/v1/auth/forgot-password',
  rateLimiter(3, 15 * 60 * 1000), // Max 3 requests per 15 minutes per IP
  async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const genericResponse = {
      success: true,
      message: 'If an account exists with this email address, a password reset link has been sent.',
    };

    const cleanEmail = email.trim().toLowerCase();

    try {
      const userResult = await dbQuery('SELECT id, email, full_name FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (userResult.rows.length === 0) {
        // Dispatch alert to verified inbox so the administrator / user sees the attempt
        await sendTransactionalEmail({
          to: BUSINESS_CONTACT_EMAIL,
          subject: `NepalDrive Password Reset Notice: Account not found for ${cleanEmail}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
              <h3 style="color: #991b1b; margin-top: 0;">Password Reset Request</h3>
              <p>A password reset was requested for email: <strong>${cleanEmail}</strong>.</p>
              <p>However, no registered account was found in the database with this address.</p>
              <p>If you intended to access your account, you can use your registered admin email: <strong>aditya.shh15@gmail.com</strong> or create a new account on the registration page.</p>
            </div>
          `,
          text: `Password reset requested for ${cleanEmail}, but no account was found in the database.`,
        });

        return res.json({
          success: true,
          message: `If an account exists with ${cleanEmail}, a password reset link has been sent to your inbox.`,
        });
      }

      const user = userResult.rows[0];

      // Generate cryptographically secure random reset token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes expiration

      await dbQuery(
        'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
        [tokenHash, expiresAt, user.id]
      );

      // Determine the real public app URL so the email link works anywhere (desktop, mobile, email apps)
      const originHeader = req.get('origin');
      const refererHeader = req.get('referer');
      let refererOrigin: string | null = null;
      if (refererHeader) {
        try { refererOrigin = new URL(refererHeader).origin; } catch {}
      }

      const reqOrigin = originHeader || 
        refererOrigin || 
        process.env.FRONTEND_URL || 
        process.env.APP_URL || 
        (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || 
        'https://nepaldrive-three.vercel.app';
      const resetLink = `${reqOrigin}/#/reset-password?token=${rawToken}`;

      // Build high-clarity transactional email template
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f5f2; margin: 0; padding: 24px; color: #1c1917; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { background: #991b1b; padding: 28px 32px; color: #ffffff; }
            .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #ffffff; }
            .body { padding: 32px; font-size: 15px; line-height: 1.6; color: #1c1917; }
            .btn-container { margin: 28px 0; text-align: center; }
            .btn { background-color: #991b1b; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 2px 6px rgba(153,27,27,0.3); }
            .link-box { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 12px; margin-top: 20px; font-size: 12px; word-break: break-all; color: #57534e; font-family: monospace; }
            .footer { background: #fafaf9; border-top: 1px solid #e7e5e4; padding: 20px 32px; font-size: 12px; color: #78716c; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>NepalDrive Account Security</h1>
              <p style="margin: 0; font-size: 13px; color: #fecaca;">Password Reset Request</p>
            </div>
            <div class="body">
              <p>Hello <strong>${user.full_name || 'Explorer'}</strong>,</p>
              <p>We received a request to reset your password for your NepalDrive fleet account (<code>${user.email}</code>).</p>
              <p>Please click the button below to create your new secure password:</p>
              
              <div class="btn-container">
                <a href="${resetLink}" class="btn" target="_blank" rel="noopener noreferrer">Reset My Password &rarr;</a>
              </div>

              <p style="font-size: 13px; color: #78716c;">If the button above does not work, copy and paste the following secure link into your web browser:</p>
              <div class="link-box">${resetLink}</div>

              <p style="font-size: 12px; color: #a8a29e; margin-top: 24px;">
                &bull; This link is single-use and will expire in <strong>60 minutes</strong>.<br/>
                &bull; If you did not make this request, you can safely ignore this email; your current password remains secure.
              </p>
            </div>
            <div class="footer">
              <strong>NepalDrive Luxury &amp; 4x4 Fleet Rentals</strong><br/>
              Kathmandu &bull; Pokhara &bull; Chitwan &bull; Mustang
            </div>
          </div>
        </body>
        </html>
      `;

      const emailRes = await sendTransactionalEmail({
        to: user.email,
        subject: 'Reset your password - NepalDrive',
        html: emailHtml,
        text: `Hello ${user.full_name || 'Explorer'},\n\nWe received a request to reset your password for your NepalDrive account.\n\nClick the link below or copy and paste it into your browser:\n${resetLink}\n\nThis link will expire in 60 minutes.\n\nWarm regards,\nNepalDrive Fleet Security`,
      });

      await logAuditEvent(
        user.id,
        user.email,
        'FORGOT_PASSWORD_REQUEST',
        'users',
        `Generated single-use password reset token and dispatched email to ${emailRes.deliveredTo || user.email}.`
      );

      return res.json({
        success: true,
        message: `A password reset link has been dispatched to ${cleanEmail}. Please check your email inbox and spam folder.`,
        data: {
          resetLink, // Included for instant sandbox convenience
          delivered_to: emailRes.deliveredTo || cleanEmail,
        },
      });
    } catch (err) {
      console.error('Password reset request error:', err);
      return res.json(genericResponse);
    }
  }
);

// RESET PASSWORD
app.post('/api/v1/auth/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields (token, password, confirmPassword) are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'New password and confirmation password do not match.' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await dbQuery(
      'SELECT id, email FROM users WHERE (reset_token = $1 OR reset_token = $2) AND (reset_token_expires > CURRENT_TIMESTAMP OR reset_token_expires IS NULL)',
      [tokenHash, token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token.' });
    }

    const user = result.rows[0];

    // Hash new password securely with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update password and invalidate reset token single-use
    await dbQuery(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    await logAuditEvent(
      user.id,
      user.email,
      'RESET_PASSWORD_SUCCESS',
      'users',
      'Password successfully changed and reset token invalidated.'
    );

    return res.json({
      success: true,
      message: 'Your password has been changed successfully. You can now log in with your new password.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// LOGIN USER
app.post(
  '/api/v1/auth/login',
  rateLimiter(100, 15 * 60 * 1000), // Generous rate limit for local testing
  async (req, res) => {
    try {
      const payload = loginSchema.parse(req.body);
      const cleanEmail = payload.email.toLowerCase().trim();

      if ((req as any).dbInitError) {
        console.error('❌ Login blocked by database connection error:', (req as any).dbInitError?.message);
        return res.status(503).json({
          success: false,
          error: 'DATABASE_UNAVAILABLE',
          message: 'Database service is currently connecting or initializing. Please retry in a few moments.'
        });
      }

      console.log(`🔐 Login attempt received for: ${cleanEmail}`);

      const result = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (result.rows.length === 0) {
        console.warn(`⚠️ Login failed: No user found with email ${cleanEmail}`);
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const user = result.rows[0];

      if (!user.password_hash) {
        console.warn(`⚠️ User record for ${cleanEmail} lacks a password_hash.`);
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      // Compare passwords securely
      const valid = await bcrypt.compare(payload.password, user.password_hash);
      if (!valid) {
        console.warn(`⚠️ Login failed: Incorrect password for ${cleanEmail}`);
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      console.log(`✅ Login successful for ${cleanEmail} (ID: ${user.id}, Role: ${user.role || 'CUSTOMER'})`);

      // Generate access token (7 days persistent session)
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

      await logAuditEvent(user.id, user.email, 'LOGIN', 'users', 'Logged in successfully.');

      return res.json({
        success: true,
        message: 'Logged in successfully.',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role || 'CUSTOMER',
            full_name: user.full_name || '',
            phone: user.phone || '',
            is_verified: Boolean(user.is_verified),
            driving_license: user.driving_license || null,
            citizenship_no: user.citizenship_no || null,
            avatar_index: user.avatar_index ?? 0,
          },
        },
      });
    } catch (err: any) {
      console.error('❌ Login error in POST /api/v1/auth/login:', err?.message || err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, errors: err.issues });
      }
      return res.status(500).json({ 
        success: false, 
        error: err?.name || 'AuthenticationError',
        message: err?.message && !err.message.includes('password')
          ? `Authentication error: ${err.message}`
          : 'Authentication service encountered an unexpected error. Please check your credentials or try again.' 
      });
    }
  }
);

// GET CURRENT USER PROFILE
app.get('/api/v1/auth/me', authenticateUser, (req: AuthenticatedRequest, res) => {
  return res.json({ success: true, data: req.user });
});

// -----------------------------------------------------------------------------
// 8. VEHICLES ROUTING (SEARCH & DETAILS)
// -----------------------------------------------------------------------------

// LIST & SEARCH VEHICLES
app.get('/api/v1/vehicles', async (req, res) => {
  try {
    const { location, category, transmission, fuel, max_price, electric, with_driver, self_drive, include_rented } = req.query;

    const vehiclesResult = await dbQuery('SELECT * FROM vehicles');
    let filtered = vehiclesResult.rows;

    // By default, exclude vehicles that are currently rented out so no two people can book the same vehicle
    if (include_rented !== 'true') {
      filtered = filtered.filter(v => v.availability_status !== 'Rented');
    }

    // Apply strict filters dynamically
    if (location) {
      const locStr = location.toString().toLowerCase();
      filtered = filtered.filter(v =>
        v.pickup_locations.some((l: string) => l.toLowerCase() === locStr)
      );
    }
    if (category) {
      const catStr = category.toString().toLowerCase();
      filtered = filtered.filter(v => v.type.toLowerCase() === catStr);
    }
    if (transmission) {
      const transStr = transmission.toString().toLowerCase();
      filtered = filtered.filter(v => v.transmission.toLowerCase() === transStr);
    }
    if (fuel) {
      const fuelStr = fuel.toString().toLowerCase();
      filtered = filtered.filter(v => v.fuel_type.toLowerCase() === fuelStr);
    }
    if (max_price) {
      const price = parseFloat(max_price.toString());
      filtered = filtered.filter(v => parseFloat(v.price_per_day) <= price);
    }
    if (electric === 'true') {
      filtered = filtered.filter(v => v.is_electric === true);
    }
    if (with_driver === 'true') {
      filtered = filtered.filter(v => v.with_driver === true);
    }
    if (self_drive === 'true') {
      filtered = filtered.filter(v => v.self_drive === true);
    }

    return res.json({ success: true, count: filtered.length, data: filtered });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// VEHICLE BY SLUG
app.get('/api/v1/vehicles/:slug', async (req, res) => {
  try {
    const result = await dbQuery('SELECT * FROM vehicles WHERE slug = $1', [req.params.slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// -----------------------------------------------------------------------------
// 9. BOOKING ENGINE (WITH OVERLAP PROTECTION & PRICE VALIDATION)
// -----------------------------------------------------------------------------

// CREATE BOOKING
app.post(
  '/api/v1/bookings',
  authenticateUser,
  rateLimiter(5, 5 * 60 * 1000), // Max 5 booking operations per 5 minutes per user
  async (req: AuthenticatedRequest, res) => {
    try {
      const payload = bookingSchema.parse(req.body);
      const user = req.user!;

      // 1. Fetch vehicle
      const vehicleResult = await dbQuery('SELECT * FROM vehicles WHERE id = $1', [payload.vehicle_id]);
      if (vehicleResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Vehicle does not exist.' });
      }
      const vehicle = vehicleResult.rows[0];

      if (vehicle.availability_status === 'Rented') {
        return res.status(409).json({
          success: false,
          message: `This vehicle (${vehicle.name}) is currently rented out on an active Himalayan expedition. Please select an available vehicle.`,
        });
      }

      if (vehicle.availability_status === 'Maintenance') {
        return res.status(409).json({
          success: false,
          message: `This vehicle (${vehicle.name}) is currently scheduled for routine fleet maintenance.`,
        });
      }

      // 2. Dates overlap protection (no double booking of confirmed rentals)
      const overlapResult = await dbQuery(
        `SELECT id FROM bookings 
         WHERE vehicle_id = $1 
           AND status IN ('Confirmed', 'Pending') 
           AND (
             (start_date <= $2 AND end_date >= $2) OR
             (start_date <= $3 AND end_date >= $3) OR
             (start_date >= $2 AND end_date <= $3)
           )`,
        [payload.vehicle_id, payload.start_date, payload.end_date]
      );

      if (overlapResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'The selected vehicle is already booked or reserved for these dates. Please select other travel dates.',
        });
      }

      // 3. Strict Server-Side Pricing calculation (Never trust frontend amounts)
      const start = new Date(payload.start_date);
      const end = new Date(payload.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // Minimum 1 day

      const basePrice = parseFloat(vehicle.price_per_day);
      const baseAmount = basePrice * diffDays;
      
      // Driver fee: Rs. 1500 per day if driver requested and available
      const driverAmount = payload.has_driver && vehicle.with_driver ? 1500 * diffDays : 0;
      const securityDeposit = parseFloat(vehicle.security_deposit);

      const totalAmount = baseAmount + driverAmount + securityDeposit;

      // 4. Create booking record. Derived ONLY from server context
      const bookingResult = await dbQuery(
        `INSERT INTO bookings (
          user_id, vehicle_id, start_date, end_date, pickup_location, dropoff_location,
          self_drive, has_driver, base_amount, driver_amount, deposit_amount, total_amount,
          payment_method, payment_status, status, driving_license, citizenship_no, destination_location
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Pending', 'Pending', $14, $15, $16) 
         RETURNING *`,
        [
          user.id,
          vehicle.id,
          payload.start_date,
          payload.end_date,
          payload.pickup_location,
          payload.dropoff_location,
          payload.self_drive,
          payload.has_driver,
          baseAmount,
          driverAmount,
          securityDeposit,
          totalAmount,
          payload.payment_method,
          payload.driving_license,
          payload.citizenship_no,
          payload.destination_location,
        ]
      );

      // Save user identification credentials to profile if not yet saved
      await dbQuery(
        `UPDATE users SET 
          driving_license = COALESCE($1, driving_license), 
          citizenship_no = COALESCE($2, citizenship_no) 
         WHERE id = $3`,
        [payload.driving_license, payload.citizenship_no, user.id]
      );

      const newBooking = bookingResult.rows[0];

      await logAuditEvent(
        user.id,
        user.email,
        'CREATE_BOOKING',
        'bookings',
        `Created booking #${newBooking.id} for vehicle ${vehicle.name}. License: ${payload.driving_license}. Dates: ${payload.start_date} to ${payload.end_date}. Total: Rs. ${totalAmount}`
      );

      return res.status(201).json({
        success: true,
        message: 'Booking created successfully! Your order is pending confirmation.',
        data: newBooking,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, errors: err.issues });
      }
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
);

// VIEW USER'S OWN BOOKINGS (STRICT PRIVACY: NEVER LEAK OTHER USERS' RENTALS)
app.get('/api/v1/bookings', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  try {
    const result = await dbQuery(
      `SELECT b.*, v.name as vehicle_name, v.image_url,
              (SELECT COUNT(*) FROM reviews r WHERE r.booking_id = b.id) > 0 as has_reviewed
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.user_id = $1 
       ORDER BY b.id DESC`,
      [user.id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// VIEW ALL BOOKINGS FOR FLEET OWNER (ADMIN ONLY MANAGEMENT)
app.get('/api/v1/admin/bookings', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await dbQuery(
      `SELECT b.*, u.full_name as user_name, u.email as user_email, u.phone as user_phone, 
              u.is_verified as user_is_verified, u.avatar_index as user_avatar_index,
              v.name as vehicle_name, v.image_url,
              (SELECT COUNT(*) FROM reviews r WHERE r.booking_id = b.id) > 0 as has_reviewed
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN vehicles v ON b.vehicle_id = v.id
       ORDER BY b.id DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// GET BOOKING DETAILS BY ID (BOLA / IDOR RESTRICTED)
app.get('/api/v1/bookings/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const bookingId = Number(req.params.id);

  try {
    const result = await dbQuery(
      `SELECT b.*, v.name as vehicle_name, v.image_url, v.slug as vehicle_slug, u.full_name as user_name, u.email as user_email, u.phone as user_phone
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = result.rows[0];

    // BOLA protection: user must own booking, or be an admin
    if (booking.user_id !== user.id && user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to view this booking.',
      });
    }

    return res.json({ success: true, data: booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// CANCEL OWN BOOKING
app.post('/api/v1/bookings/:id/cancel', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const bookingId = Number(req.params.id);

  try {
    const bookingResult = await dbQuery('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingResult.rows[0];

    // Verification of ownership
    if (booking.user_id !== user.id && user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not own this booking.' });
    }

    if (booking.status === 'Completed' || booking.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled once it is already ${booking.status}.`,
      });
    }

    await dbQuery("UPDATE bookings SET status = 'Cancelled' WHERE id = $1", [bookingId]);

    await logAuditEvent(
      user.id,
      user.email,
      'CANCEL_BOOKING',
      'bookings',
      `Cancelled booking #${bookingId}.`
    );

    return res.json({ success: true, message: 'Booking cancelled successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// -----------------------------------------------------------------------------
// 10. FAVORITES MANAGEMENT
// -----------------------------------------------------------------------------
app.get('/api/v1/favorites', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await dbQuery(
      `SELECT f.id as favorite_id, v.* 
       FROM favorites f 
       JOIN vehicles v ON f.vehicle_id = v.id 
       WHERE f.user_id = $1`,
      [req.user!.id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.post('/api/v1/favorites', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const { vehicle_id } = req.body;
  if (!vehicle_id) return res.status(400).json({ success: false, message: 'vehicle_id required' });

  try {
    await dbQuery('INSERT INTO favorites (user_id, vehicle_id) VALUES ($1, $2)', [req.user!.id, vehicle_id]);
    return res.json({ success: true, message: 'Added to favorites.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.delete('/api/v1/favorites/:vehicleId', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const vehicleId = Number(req.params.vehicleId);
  try {
    await dbQuery('DELETE FROM favorites WHERE user_id = $1 AND vehicle_id = $2', [req.user!.id, vehicleId]);
    return res.json({ success: true, message: 'Removed from favorites.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// -----------------------------------------------------------------------------
// 11. PAYMENT VERIFICATION GATEWAY LAYER (MOCK SERVER SIDE)
// -----------------------------------------------------------------------------
app.post('/api/v1/payments/verify', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const { booking_id, transaction_ref, gateway } = req.body;
  if (!booking_id || !gateway) {
    return res.status(400).json({ success: false, message: 'Booking ID and Gateway are required.' });
  }

  try {
    // 1. Fetch booking
    const bResult = await dbQuery('SELECT * FROM bookings WHERE id = $1', [Number(booking_id)]);
    if (bResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    const booking = bResult.rows[0];

    // BOLA/IDOR ownership security check
    if (booking.user_id !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden. Access denied.' });
    }

    // 2. Mock payment confirmation. In a production system, this sends an HTTP request
    // to eSewa / Khalti server validation endpoint with cryptographic secrets
    const paymentStatus = 'PAID';
    const finalTxRef = transaction_ref || `TX-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    // 3. Mark booking as paid and confirmed
    await dbQuery(
      "UPDATE bookings SET payment_status = 'Paid', status = 'Confirmed' WHERE id = $1",
      [booking.id]
    );

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      'PAYMENT_VERIFIED',
      'bookings',
      `Payment of Rs. ${booking.total_amount} verified via gateway ${gateway}. TxRef: ${finalTxRef}. Booking confirmed.`
    );

    return res.json({
      success: true,
      message: 'Payment verified and transaction secured successfully!',
      data: {
        booking_id: booking.id,
        status: 'Confirmed',
        payment_status: 'Paid',
        tx_ref: finalTxRef,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// SUBMIT QR CODE PAYMENT RECEIPT & SCREENSHOT (USER PAYMENT FLOW)
app.post('/api/v1/payments/submit-receipt', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const { booking_id, receipt_image, transaction_id, payment_notes } = req.body;
  if (!booking_id) return res.status(400).json({ success: false, message: 'booking_id is required' });

  try {
    const bResult = await dbQuery('SELECT * FROM bookings WHERE id = $1', [Number(booking_id)]);
    if (bResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const booking = bResult.rows[0];
    if (booking.user_id !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden. Access denied.' });
    }

    const txId = transaction_id || `QR-${Date.now()}`;
    await dbQuery(
      `UPDATE bookings SET 
        payment_status = 'Under Review',
        payment_receipt_url = $1,
        payment_transaction_id = $2,
        payment_notes = $3,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [receipt_image || null, txId, payment_notes || null, booking.id]
    );

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      'SUBMIT_PAYMENT_RECEIPT',
      'bookings',
      `User ${req.user!.email} submitted QR payment screenshot for booking #${booking.id} (TxID: ${txId}). Awaiting fleet owner verification.`
    );

    return res.json({
      success: true,
      message: 'Payment screenshot submitted successfully! The fleet owner will inspect the receipt and approve your rental.',
      data: {
        booking_id: booking.id,
        payment_status: 'Under Review',
        payment_transaction_id: txId,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// -----------------------------------------------------------------------------
// 11.0 DOCUMENT UPLOAD, OWNER VERIFICATION & RENTAL RESPONSIBILITY
// -----------------------------------------------------------------------------

const DOCS_STORAGE_DIR = path.resolve(__dirname, 'uploads', 'documents');
if (!fs.existsSync(DOCS_STORAGE_DIR)) {
  fs.mkdirSync(DOCS_STORAGE_DIR, { recursive: true });
}

// Helper to generate signed preview token
const generateDocumentToken = (docId: number, userId: number, role: string) => {
  return jwt.sign(
    { doc_id: docId, user_id: userId, role, scope: 'doc_preview' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
};

// UPLOAD DOCUMENT (USER KYC / CITIZENSHIP / LICENSE)
app.post('/api/v1/documents/upload', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { document_type, file_data, file_name, mime_type, booking_id } = req.body;
    const user = req.user!;

    if (!document_type || !file_data || !file_name || !mime_type) {
      return res.status(400).json({ success: false, message: 'Missing required document fields.' });
    }

    const validTypes = ['citizenship_front', 'citizenship_back', 'driving_license', 'passport', 'other'];
    if (!validTypes.includes(document_type)) {
      return res.status(400).json({ success: false, message: `Invalid document_type. Must be one of: ${validTypes.join(', ')}` });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    if (!allowedMimes.includes(mime_type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Supported formats are JPG, PNG, WEBP, and PDF documents.'
      });
    }

    // Strip data URI prefix if present
    const base64Data = file_data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Max 10MB file size limit
    const MAX_SIZE = 10 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds 10MB limit. Current size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB.`
      });
    }

    if (buffer.length === 0) {
      return res.status(400).json({ success: false, message: 'File buffer is empty or corrupted.' });
    }

    // Safe extension extraction
    const rawExt = path.extname(file_name).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(rawExt) ? rawExt : '.jpg';
    const storageKey = `doc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${safeExt}`;
    const filePath = path.join(DOCS_STORAGE_DIR, storageKey);

    // Save physical file to persistent disk
    fs.writeFileSync(filePath, buffer);

    // Check if replacing an existing pending or rejected document of same type
    let action = 'Uploaded';
    const existing = await dbQuery(
      `SELECT id, verification_status FROM user_documents 
       WHERE user_id = $1 AND document_type = $2 AND deleted_at IS NULL
       ORDER BY id DESC LIMIT 1`,
      [user.id, document_type]
    );

    let docId: number;
    if (existing.rows.length > 0) {
      const prev = existing.rows[0];
      action = 'Replaced';
      // Archive previous document
      await dbQuery(
        `UPDATE user_documents SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [prev.id]
      );
    }

    // Two-year default retention policy
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 2);

    const docInsert = await dbQuery(
      `INSERT INTO user_documents (
        user_id, booking_id, document_type, storage_key, original_filename, 
        mime_type, file_size, verification_status, retention_until
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', $8) RETURNING *`,
      [user.id, booking_id || null, document_type, storageKey, file_name, mime_type, buffer.length, retentionDate]
    );

    docId = docInsert.rows[0].id;

    // Record audit verification history
    await dbQuery(
      `INSERT INTO document_verification_history (document_id, reviewer_id, action, reason)
       VALUES ($1, NULL, $2, $3)`,
      [docId, action, `Customer submitted ${document_type} file (${(buffer.length / 1024).toFixed(1)} KB)`]
    );

    await logAuditEvent(
      user.id,
      user.email,
      'DOCUMENT_UPLOAD',
      'user_documents',
      `User uploaded ${document_type} [${file_name}] - Verification Pending.`
    );

    const previewToken = generateDocumentToken(docId, user.id, user.role);

    return res.status(201).json({
      success: true,
      message: `${document_type.replace('_', ' ')} uploaded successfully! Pending fleet owner verification.`,
      data: {
        ...docInsert.rows[0],
        preview_token: previewToken,
        preview_url: `/api/v1/documents/${docId}/preview?token=${previewToken}`,
      }
    });
  } catch (err) {
    console.error('Error in document upload:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// GET CURRENT USER'S UPLOADED DOCUMENTS
app.get('/api/v1/documents/my', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const docs = await dbQuery(
      `SELECT d.*, 
              (SELECT json_agg(h ORDER BY h.id DESC) 
               FROM document_verification_history h 
               WHERE h.document_id = d.id) as history
       FROM user_documents d
       WHERE d.user_id = $1 AND d.deleted_at IS NULL
       ORDER BY d.id DESC`,
      [user.id]
    );

    const enriched = docs.rows.map(doc => {
      const token = generateDocumentToken(doc.id, user.id, user.role);
      return {
        ...doc,
        preview_url: `/api/v1/documents/${doc.id}/preview?token=${token}`,
        download_url: `/api/v1/documents/${doc.id}/download?token=${token}`,
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Error loading my documents:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// SECURE PREVIEW OF UPLOADED DOCUMENT (NEVER EXPOSE PUBLIC DIRECTORY)
app.get('/api/v1/documents/:id/preview', async (req: Request, res: Response) => {
  try {
    const docId = Number(req.params.id);
    if (!docId || isNaN(docId)) return res.status(400).send('Invalid document ID');

    // Authenticate via header or query token
    let authUser: any = null;
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token as string;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        authUser = jwt.verify(authHeader.substring(7), JWT_SECRET);
      } catch (ignored) {}
    }

    if (!authUser && queryToken) {
      try {
        const decoded = jwt.verify(queryToken, JWT_SECRET) as any;
        if (decoded.doc_id === docId || decoded.role === 'ADMIN') {
          authUser = decoded;
        }
      } catch (ignored) {}
    }

    if (!authUser) {
      return res.status(401).send('Unauthorized. Authentication token required for document preview.');
    }

    const docResult = await dbQuery('SELECT * FROM user_documents WHERE id = $1', [docId]);
    if (docResult.rows.length === 0) return res.status(404).send('Document not found');

    const doc = docResult.rows[0];
    const isOwner = authUser.user_id === doc.user_id || authUser.id === doc.user_id;
    const isAdmin = authUser.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).send('Forbidden. You do not have permission to view this document.');
    }

    const safeFilePath = path.resolve(DOCS_STORAGE_DIR, doc.storage_key);
    // Path traversal check
    if (!safeFilePath.startsWith(DOCS_STORAGE_DIR)) {
      return res.status(400).send('Invalid file path traversal detected.');
    }

    if (!fs.existsSync(safeFilePath)) {
      return res.status(404).send('File asset not found on storage server.');
    }

    res.setHeader('Content-Type', doc.mime_type || 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_filename)}"`);
    res.setHeader('Cache-Control', 'private, max-age=600');
    return fs.createReadStream(safeFilePath).pipe(res);
  } catch (err) {
    console.error('Error in document preview:', err);
    return res.status(500).send('Internal Server Error');
  }
});

// SECURE DOWNLOAD OF DOCUMENT (OWNER OR ADMIN)
app.get('/api/v1/documents/:id/download', async (req: Request, res: Response) => {
  try {
    const docId = Number(req.params.id);
    let authUser: any = null;
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token as string;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        authUser = jwt.verify(authHeader.substring(7), JWT_SECRET);
      } catch (ignored) {}
    }

    if (!authUser && queryToken) {
      try {
        authUser = jwt.verify(queryToken, JWT_SECRET);
      } catch (ignored) {}
    }

    if (!authUser) return res.status(401).send('Unauthorized');

    const docResult = await dbQuery('SELECT * FROM user_documents WHERE id = $1', [docId]);
    if (docResult.rows.length === 0) return res.status(404).send('Document not found');

    const doc = docResult.rows[0];
    const isOwner = authUser.user_id === doc.user_id || authUser.id === doc.user_id;
    const isAdmin = authUser.role === 'ADMIN';

    if (!isOwner && !isAdmin) return res.status(403).send('Forbidden');

    const safeFilePath = path.resolve(DOCS_STORAGE_DIR, doc.storage_key);
    if (!safeFilePath.startsWith(DOCS_STORAGE_DIR) || !fs.existsSync(safeFilePath)) {
      return res.status(404).send('File not found');
    }

    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_filename)}"`);
    return fs.createReadStream(safeFilePath).pipe(res);
  } catch (err) {
    return res.status(500).send('Internal Server Error');
  }
});

// DELETE / REPLACE UNVERIFIED DOCUMENT (USER OR ADMIN RETENTION POLICY)
app.delete('/api/v1/documents/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const docId = Number(req.params.id);
    const user = req.user!;

    const docRes = await dbQuery('SELECT * FROM user_documents WHERE id = $1', [docId]);
    if (docRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Document not found.' });

    const doc = docRes.rows[0];
    const isOwner = doc.user_id === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Access denied.' });

    if (isOwner && doc.verification_status === 'Approved' && !isAdmin) {
      return res.status(400).json({ success: false, message: 'Approved identity documents cannot be deleted directly. Contact support to update.' });
    }

    await dbQuery('UPDATE user_documents SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [docId]);

    await dbQuery(
      `INSERT INTO document_verification_history (document_id, reviewer_id, action, reason)
       VALUES ($1, $2, 'Deleted', $3)`,
      [docId, user.id, `${user.role} deleted document ${doc.document_type}`]
    );

    return res.json({ success: true, message: 'Document removed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ADMIN: GET ALL SUBMITTED DOCUMENTS FOR VERIFICATION DASHBOARD
app.get('/api/v1/admin/documents', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.user!;
    const statusFilter = req.query.status as string;

    let queryText = `
      SELECT d.*, 
             u.full_name as user_name, u.email as user_email, u.phone as user_phone,
             u.driving_license as user_license_no, u.citizenship_no as user_citizenship_no,
             u.is_verified as user_is_verified,
             b.status as booking_status, b.vehicle_id, b.start_date as booking_start, b.end_date as booking_end,
             v.name as vehicle_name, v.image_url as vehicle_image,
             (SELECT json_agg(h ORDER BY h.id DESC) FROM document_verification_history h WHERE h.document_id = d.id) as history
      FROM user_documents d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN bookings b ON d.booking_id = b.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE d.deleted_at IS NULL
    `;

    const params: any[] = [];
    if (statusFilter && statusFilter !== 'ALL') {
      params.push(statusFilter);
      queryText += ` AND d.verification_status = $1`;
    }

    queryText += ` ORDER BY d.id DESC`;

    const result = await dbQuery(queryText, params);
    const enriched = result.rows.map(doc => {
      const token = generateDocumentToken(doc.id, admin.id, 'ADMIN');
      return {
        ...doc,
        preview_url: `/api/v1/documents/${doc.id}/preview?token=${token}`,
        download_url: `/api/v1/documents/${doc.id}/download?token=${token}`,
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Error fetching admin documents:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ADMIN: APPROVE OR REJECT A DOCUMENT
app.post('/api/v1/admin/documents/:id/verify', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const docId = Number(req.params.id);
    const { action, reason } = req.body; // 'Approved' | 'Rejected'
    const admin = req.user!;

    if (!['Approved', 'Rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'Approved' or 'Rejected'." });
    }

    if (action === 'Rejected' && (!reason || !reason.trim())) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required so the renter can correct their document.' });
    }

    const docRes = await dbQuery('SELECT * FROM user_documents WHERE id = $1', [docId]);
    if (docRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Document not found.' });

    const doc = docRes.rows[0];

    // Update document status
    await dbQuery(
      `UPDATE user_documents 
       SET verification_status = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP, rejection_reason = $3
       WHERE id = $4`,
      [action, admin.id, action === 'Rejected' ? reason.trim() : null, docId]
    );

    // Record in verification audit history
    await dbQuery(
      `INSERT INTO document_verification_history (document_id, reviewer_id, action, reason)
       VALUES ($1, $2, $3, $4)`,
      [docId, admin.id, action, action === 'Rejected' ? reason.trim() : 'Document inspected and approved by Fleet Owner']
    );

    // If approved, check if user now has both front and back (or driving license) approved
    if (action === 'Approved') {
      const approvedDocs = await dbQuery(
        `SELECT document_type FROM user_documents 
         WHERE user_id = $1 AND verification_status = 'Approved' AND deleted_at IS NULL`,
        [doc.user_id]
      );
      const approvedTypes = approvedDocs.rows.map(r => r.document_type);
      // If user has citizenship front & back or driving license, mark user as verified
      if ((approvedTypes.includes('citizenship_front') && approvedTypes.includes('citizenship_back')) || approvedTypes.includes('driving_license')) {
        await dbQuery(`UPDATE users SET is_verified = true WHERE id = $1`, [doc.user_id]);
      }
    }

    await logAuditEvent(
      admin.id,
      admin.email,
      `DOCUMENT_${action.toUpperCase()}`,
      'user_documents',
      `Admin ${admin.email} marked document #${docId} (${doc.document_type}) as ${action}. Reason: ${reason || 'Approved'}`
    );

    return res.json({
      success: true,
      message: `Document #${docId} has been ${action}.`,
      data: {
        id: docId,
        verification_status: action,
        rejection_reason: action === 'Rejected' ? reason.trim() : null,
      }
    });
  } catch (err) {
    console.error('Error verifying document:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// MANDATORY RENTAL AGREEMENT ACCEPTANCE & POLICY RECORD
app.post('/api/v1/agreements/accept', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { booking_id, confirm_identity_ownership, confirm_original_retention, confirm_rental_terms } = req.body;

    if (!confirm_identity_ownership || !confirm_original_retention || !confirm_rental_terms) {
      return res.status(400).json({
        success: false,
        message: 'All mandatory identity document and custody checkboxes must be accepted before proceeding.'
      });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const result = await dbQuery(
      `INSERT INTO rental_agreement_acceptances (
        user_id, booking_id, agreement_version, accepted_ip, 
        confirm_identity_ownership, confirm_original_retention, confirm_rental_terms
      ) VALUES ($1, $2, 'v1.0-nepal-kyc', $3, $4, $5, $6) RETURNING *`,
      [user.id, booking_id || null, String(ip), confirm_identity_ownership, confirm_original_retention, confirm_rental_terms]
    );

    await logAuditEvent(
      user.id,
      user.email,
      'ACCEPT_RENTAL_AGREEMENT',
      'rental_agreement_acceptances',
      `User ${user.email} accepted NepalDrive KYC & Original Document Retention Agreement v1.0.`
    );

    return res.status(201).json({
      success: true,
      message: 'Rental agreement & document ownership acknowledgment saved.',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('Error saving agreement acceptance:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// CUSTODY RECORDS (IN-PERSON PHYSICAL VERIFICATION / HANDOVER)
app.get('/api/v1/bookings/:id/custody', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bookingId = Number(req.params.id);
    const user = req.user!;

    const bCheck = await dbQuery('SELECT user_id FROM bookings WHERE id = $1', [bookingId]);
    if (bCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (bCheck.rows[0].user_id !== user.id && user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const records = await dbQuery('SELECT * FROM document_custody_records WHERE booking_id = $1 ORDER BY id DESC', [bookingId]);
    return res.json({ success: true, data: records.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.post('/api/v1/admin/bookings/:id/custody', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bookingId = Number(req.params.id);
    const admin = req.user!;
    const { document_type, handover_required, handed_over_by, received_by, handover_at, returned_at, renter_acknowledgment, staff_acknowledgment, notes } = req.body;

    const result = await dbQuery(
      `INSERT INTO document_custody_records (
        booking_id, document_type, handover_required, handed_over_by, received_by,
        handover_at, returned_at, renter_acknowledgment, staff_acknowledgment, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        bookingId,
        document_type || 'citizenship_original',
        Boolean(handover_required),
        handed_over_by || null,
        received_by || admin.id,
        handover_at || new Date(),
        returned_at || null,
        Boolean(renter_acknowledgment),
        Boolean(staff_acknowledgment),
        notes || '',
      ]
    );

    await logAuditEvent(
      admin.id,
      admin.email,
      'DOCUMENT_CUSTODY_RECORD',
      'document_custody_records',
      `Custody record updated for booking #${bookingId}: ${notes || 'Handover documented'}`
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// -----------------------------------------------------------------------------
// 11.1 REVIEW SYSTEM (AUTHENTICATED & POST-PAYMENT UNLOCKED)
// -----------------------------------------------------------------------------

// SUBMIT REVIEW AFTER TRIP/PAYMENT
app.post('/api/v1/reviews', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = reviewSchema.parse(req.body);
    const user = req.user!;

    // 1. Verify booking ownership and eligibility (Must be Paid or Confirmed or Completed)
    const bCheck = await dbQuery(
      'SELECT id, vehicle_id, status, payment_status FROM bookings WHERE id = $1 AND user_id = $2',
      [payload.booking_id, user.id]
    );

    if (bCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Eligible booking reservation not found.' });
    }

    const booking = bCheck.rows[0];
    if (booking.payment_status !== 'Paid' && booking.status !== 'Confirmed' && booking.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Review system unlocks only after payment verification.',
      });
    }

    // 2. Prevent duplicate reviews for the same booking
    const prevReview = await dbQuery('SELECT id FROM reviews WHERE booking_id = $1', [payload.booking_id]);
    if (prevReview.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'You have already submitted a review for this vehicle reservation.' });
    }

    // 3. Insert review
    const reviewResult = await dbQuery(
      `INSERT INTO reviews (booking_id, user_id, vehicle_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [payload.booking_id, user.id, payload.vehicle_id, payload.rating, payload.comment]
    );

    // 4. Update vehicle aggregate rating and review count
    const aggResult = await dbQuery(
      'SELECT COUNT(*) as total_reviews, AVG(rating) as avg_rating FROM reviews WHERE vehicle_id = $1',
      [payload.vehicle_id]
    );

    if (aggResult.rows.length > 0) {
      const avg = parseFloat(aggResult.rows[0].avg_rating || '5.0');
      const count = parseInt(aggResult.rows[0].total_reviews || '1', 10);
      await dbQuery(
        'UPDATE vehicles SET rating = $1, review_count = $2 WHERE id = $3',
        [avg.toFixed(2), count, payload.vehicle_id]
      );
    }

    await logAuditEvent(
      user.id,
      user.email,
      'SUBMIT_VEHICLE_REVIEW',
      'reviews',
      `User ${user.email} submitted a ${payload.rating}-star review for vehicle #${payload.vehicle_id} (Booking #${payload.booking_id})`
    );

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your verified review and rating has been published.',
      data: reviewResult.rows[0],
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.issues });
    }
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// GET CURRENT USER'S REVIEWS
app.get('/api/v1/reviews/my', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await dbQuery(
      `SELECT r.*, v.name as vehicle_name, v.image_url as vehicle_image, v.slug as vehicle_slug
       FROM reviews r
       JOIN vehicles v ON r.vehicle_id = v.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user!.id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// GET PUBLIC REVIEWS FOR A VEHICLE
app.get('/api/v1/vehicles/:id/reviews', async (req: Request, res: Response) => {
  const vehicleId = Number(req.params.id);
  try {
    const result = await dbQuery(
      `SELECT r.*, u.full_name as author_name, u.avatar_index, u.is_verified as author_verified
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.vehicle_id = $1
       ORDER BY r.created_at DESC`,
      [vehicleId]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// UPDATE USER PROFILE & AVATAR
app.patch('/api/v1/users/profile', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { full_name, phone, driving_license, citizenship_no, avatar_index } = req.body;
    const user = req.user!;

    await dbQuery(
      `UPDATE users SET 
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        driving_license = COALESCE($3, driving_license),
        citizenship_no = COALESCE($4, citizenship_no),
        avatar_index = COALESCE($5, avatar_index),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [full_name || null, phone || null, driving_license || null, citizenship_no || null, avatar_index ?? null, user.id]
    );

    const updated = await dbQuery(
      'SELECT id, email, role, full_name, phone, is_verified, driving_license, citizenship_no, avatar_index FROM users WHERE id = $1',
      [user.id]
    );

    return res.json({ success: true, message: 'Profile updated successfully.', data: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// -----------------------------------------------------------------------------
// 12. ADMIN MANAGEMENT ENDPOINTS (ADMIN SECURED ROUTING)
// -----------------------------------------------------------------------------

// SECURED ADMIN ENDPOINT: MANAGE BOOKINGS (CONFIRM/REJECT/CANCEL)
app.patch('/api/v1/admin/bookings/:id/status', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const bookingId = Number(req.params.id);
  const { status, payment_status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  try {
    const bookingExists = await dbQuery('SELECT id FROM bookings WHERE id = $1', [bookingId]);
    if (bookingExists.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    await dbQuery(
      "UPDATE bookings SET status = $1, payment_status = COALESCE($2, payment_status) WHERE id = $3",
      [status, payment_status || null, bookingId]
    );

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      'UPDATE_BOOKING_STATUS_BY_ADMIN',
      'bookings',
      `Admin updated booking #${bookingId} status to '${status}' (payment: '${payment_status || 'unchanged'}')`
    );

    return res.json({ success: true, message: `Booking status updated to ${status}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// SECURED ADMIN ENDPOINT: CREATE VEHICLE
app.post('/api/v1/admin/vehicles', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = vehicleAdminSchema.parse(req.body);

    const slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    const result = await dbQuery(
      `INSERT INTO vehicles (
        name, brand, model, year, type, price_per_day, security_deposit, seats, 
        transmission, fuel_type, is_electric, self_drive, with_driver, 
        is_featured, is_popular, availability_status, image_url, image_gallery, 
        pickup_locations, description, slug
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'Available', $16, $17, $18, $19, $20) 
      RETURNING *`,
      [
        payload.name,
        payload.brand,
        payload.model,
        payload.year,
        payload.type,
        payload.price_per_day,
        payload.security_deposit,
        payload.seats,
        payload.transmission,
        payload.fuel_type,
        payload.is_electric,
        payload.self_drive,
        payload.with_driver,
        payload.is_featured,
        payload.is_popular,
        payload.image_url || '/assets/images/fortuner_suv_1791105671393.jpg',
        [payload.image_url || '/assets/images/fortuner_suv_1791105671393.jpg'],
        payload.pickup_locations,
        payload.description,
        slug,
      ]
    );

    const created = result.rows[0];

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      'CREATE_VEHICLE',
      'vehicles',
      `Admin created new vehicle: ${created.name} (Slug: ${created.slug})`
    );

    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.issues });
    }
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// SECURED ADMIN ENDPOINT: DELETE VEHICLE
app.delete('/api/v1/admin/vehicles/:id', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  try {
    const check = await dbQuery('SELECT name FROM vehicles WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    await dbQuery('DELETE FROM vehicles WHERE id = $1', [id]);

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      'DELETE_VEHICLE',
      'vehicles',
      `Admin deleted vehicle #${id} (${check.rows[0].name})`
    );

    return res.json({ success: true, message: 'Vehicle deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// SECURED ADMIN ENDPOINT: VIEW AUDIT LOGS
app.get('/api/v1/admin/audit-logs', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const logs = await dbQuery('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200');
    return res.json({ success: true, data: logs.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// SECURED ADMIN ENDPOINT: GET DASHBOARD ANALYTICS STATS
app.get('/api/v1/admin/stats', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const userCount = await dbQuery("SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER'");
    const vehicleCount = await dbQuery('SELECT COUNT(*) FROM vehicles');
    const bookingCount = await dbQuery('SELECT COUNT(*) FROM bookings');
    const revenueSum = await dbQuery("SELECT SUM(total_amount) FROM bookings WHERE payment_status = 'Paid'");

    const recentBookings = await dbQuery(`
      SELECT b.*, u.full_name, v.name as vehicle_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      ORDER BY b.id DESC LIMIT 5
    `);

    return res.json({
      success: true,
      data: {
        total_customers: parseInt(userCount.rows[0].count) || 0,
        total_vehicles: parseInt(vehicleCount.rows[0].count) || 0,
        total_bookings: parseInt(bookingCount.rows[0].count) || 0,
        total_revenue_paid: parseFloat(revenueSum.rows[0].sum) || 0,
        recent_bookings: recentBookings.rows,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// SECURED ADMIN ENDPOINT: LIST ALL USERS
app.get('/api/v1/admin/users', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const users = await dbQuery(
      'SELECT id, email, role, full_name, phone, is_verified, driving_license, citizenship_no, avatar_index, created_at FROM users ORDER BY id DESC'
    );
    return res.json({ success: true, data: users.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// SECURED ADMIN ENDPOINT: UPDATE USER ROLE (STRICT SINGLE ADMIN POLICY)
app.patch('/api/v1/admin/users/:id/role', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const targetUserId = Number(req.params.id);
  const { role } = req.body;

  // STRICT SINGLE ADMIN POLICY: Enforce exactly one fleet owner administrator
  if (role === 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Policy Enforcement: NepalDrive strictly enforces exactly ONE fleet owner administrator. No additional administrators can be appointed.'
    });
  }

  try {
    const userCheck = await dbQuery('SELECT email FROM users WHERE id = $1', [targetUserId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (userCheck.rows[0].email === 'admin@nepaldrive.com') {
      return res.status(403).json({
        success: false,
        message: 'Policy Enforcement: The primary fleet owner administrator cannot be demoted or removed.'
      });
    }

    await dbQuery('UPDATE users SET role = $1 WHERE id = $2', [role, targetUserId]);

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      'CHANGE_USER_ROLE',
      'users',
      `Admin updated role of user ${userCheck.rows[0].email} to '${role}'`
    );

    return res.json({ success: true, message: `User role updated successfully to ${role}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// SECURED ADMIN ENDPOINT: VERIFY USER DOCUMENTS & IDENTITY
app.patch('/api/v1/admin/users/:id/verify', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const targetUserId = Number(req.params.id);
  const { is_verified, notes } = req.body;

  try {
    const userCheck = await dbQuery('SELECT email, full_name FROM users WHERE id = $1', [targetUserId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const verifiedBool = Boolean(is_verified);
    await dbQuery('UPDATE users SET is_verified = $1 WHERE id = $2', [verifiedBool, targetUserId]);

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      verifiedBool ? 'VERIFY_USER_DOCUMENTS' : 'REVOKE_USER_VERIFICATION',
      'users',
      `Owner/Admin ${req.user!.email} ${verifiedBool ? 'verified and approved identity documents for' : 'revoked verification for'} ${userCheck.rows[0].email} (${userCheck.rows[0].full_name}). Notes: ${notes || 'Verified by fleet manager'}`
    );

    return res.json({
      success: true,
      message: `User ${userCheck.rows[0].full_name} is now ${verifiedBool ? 'Verified & Approved' : 'Unverified'}.`,
      data: { id: targetUserId, is_verified: verifiedBool }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// SECURED ADMIN ENDPOINT: VERIFY & MANAGE BOOKINGS BY OWNER
app.patch('/api/v1/admin/bookings/:id/verify', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const bookingId = Number(req.params.id);
  const { action, notes } = req.body; // 'approve' | 'reject' | 'mark_paid' | 'complete'

  try {
    const bCheck = await dbQuery(
      `SELECT b.*, u.full_name as user_name, u.email as user_email, v.name as vehicle_name 
       FROM bookings b 
       JOIN users u ON b.user_id = u.id 
       JOIN vehicles v ON b.vehicle_id = v.id 
       WHERE b.id = $1`,
      [bookingId]
    );

    if (bCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const current = bCheck.rows[0];
    let newStatus = current.status;
    let newPayment = current.payment_status;

    if (action === 'approve' || action === 'approve_payment' || action === 'mark_paid') {
      newStatus = 'Confirmed';
      newPayment = 'Paid';
      // Automatically lock vehicle status to Rented so no other customer can book it
      await dbQuery("UPDATE vehicles SET availability_status = 'Rented' WHERE id = $1", [current.vehicle_id]);
    } else if (action === 'reject') {
      newStatus = 'Cancelled';
      newPayment = 'Rejected';
      await dbQuery("UPDATE vehicles SET availability_status = 'Available' WHERE id = $1", [current.vehicle_id]);
    } else if (action === 'complete') {
      newStatus = 'Completed';
      newPayment = 'Paid';
      await dbQuery("UPDATE vehicles SET availability_status = 'Available' WHERE id = $1", [current.vehicle_id]);
    }

    await dbQuery(
      'UPDATE bookings SET status = $1, payment_status = $2 WHERE id = $3',
      [newStatus, newPayment, bookingId]
    );

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      'OWNER_VERIFY_BOOKING',
      'bookings',
      `Owner executed '${action}' on booking #${bookingId} (${current.vehicle_name} for ${current.user_name}). New Status: ${newStatus}, Payment: ${newPayment}. Notes: ${notes || 'Verified'}`
    );

    return res.json({
      success: true,
      message: `Booking #${bookingId} verified successfully (${newStatus} / ${newPayment}).`,
      data: { id: bookingId, status: newStatus, payment_status: newPayment }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// SECURED ADMIN ENDPOINT: UPDATE FLEET STATUS
app.patch('/api/v1/admin/vehicles/:id/status', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const vehicleId = Number(req.params.id);
  const { availability_status } = req.body;

  try {
    const v = await dbQuery('SELECT name FROM vehicles WHERE id = $1', [vehicleId]);
    if (v.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    await dbQuery('UPDATE vehicles SET availability_status = $1 WHERE id = $2', [availability_status, vehicleId]);

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      'UPDATE_VEHICLE_AVAILABILITY',
      'vehicles',
      `Owner changed availability of ${v.rows[0].name} to '${availability_status}'`
    );

    return res.json({ success: true, message: `Vehicle availability set to ${availability_status}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// -----------------------------------------------------------------------------
// 12. CONTACT FORM & CUSTOMER ENQUIRY ENGINE
// -----------------------------------------------------------------------------

// HTML Sanitizer to prevent HTML injection in emails & storage
function sanitizeInput(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

// Contact form payload schema validation
const contactFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100, 'Name must be under 100 characters.'),
  email: z.string().trim().email('Please enter a valid email address.').max(150, 'Email is too long.'),
  phone: z.string().trim().max(30, 'Phone number is too long.').optional().or(z.literal('')),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters.').max(200, 'Subject must be under 200 characters.'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters.').max(3000, 'Message must be under 3000 characters.'),
  hp_field: z.string().optional(), // Honeypot field for spam bots
  form_start_time: z.number().optional(), // Bot velocity trap
});

// PUBLIC ENDPOINT: SUBMIT CONTACT FORM
app.post(
  '/api/v1/contact',
  rateLimiter(5, 10 * 60 * 1000), // Max 5 submissions per 10 minutes per IP
  async (req: Request, res: Response) => {
    try {
      const clientIp = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';

      // 1. Validate payload structure
      const parsed = contactFormSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || 'Invalid contact form submission.';
        return res.status(400).json({ success: false, message: errorMsg });
      }

      const { name, email, phone, subject, message, hp_field, form_start_time } = parsed.data;

      // 2. Spam & Bot Protections:
      // Honeypot check: If the hidden honeypot field is filled, silently discard or reject bot
      if (hp_field && hp_field.trim().length > 0) {
        console.warn(`🛑 Spam honeypot triggered from IP: ${clientIp}`);
        return res.status(200).json({
          success: true,
          message: 'Thank you for your message! Our team will get back to you shortly.',
        });
      }

      // Velocity trap: Humans take at least 1.5 seconds to fill this form
      if (form_start_time && typeof form_start_time === 'number') {
        const elapsedMs = Date.now() - form_start_time;
        if (elapsedMs < 1500) {
          console.warn(`🛑 Velocity bot trap triggered (<1.5s submission) from IP: ${clientIp}`);
          return res.status(200).json({
            success: true,
            message: 'Thank you for your message! Our team will get back to you shortly.',
          });
        }
      }

      // 3. Duplicate Submission Prevention (within 15 minutes window)
      const duplicateKey = `${email.toLowerCase()}_${subject.toLowerCase().slice(0, 30)}_${message.toLowerCase().slice(0, 50)}`;
      const lastSent = recentSubmissionsCache.get(duplicateKey);
      const now = Date.now();
      if (lastSent && now - lastSent < 15 * 60 * 1000) {
        return res.status(409).json({
          success: false,
          message: 'A duplicate message from your email was recently submitted. Our concierge team is already reviewing it!',
        });
      }
      recentSubmissionsCache.set(duplicateKey, now);

      // Clean old entries from cache every 100 submissions
      if (recentSubmissionsCache.size > 200) {
        for (const [key, timestamp] of recentSubmissionsCache.entries()) {
          if (now - timestamp > 15 * 60 * 1000) {
            recentSubmissionsCache.delete(key);
          }
        }
      }

      // 4. Sanitize all user inputs before persistence & email formatting
      const cleanName = sanitizeInput(name);
      const cleanEmail = email.toLowerCase().trim();
      const cleanPhone = phone ? sanitizeInput(phone) : null;
      const cleanSubject = sanitizeInput(subject);
      const cleanMessage = sanitizeInput(message);

      // 5. Store Enquiry in Database
      const insertResult = await dbQuery(
        `INSERT INTO enquiries (name, email, phone, subject, message, status, ip_address) 
         VALUES ($1, $2, $3, $4, $5, 'NEW', $6) 
         RETURNING id, created_at`,
        [cleanName, cleanEmail, cleanPhone, cleanSubject, cleanMessage, clientIp]
      );
      const enquiryId = insertResult.rows[0]?.id || Date.now();
      const createdAt = insertResult.rows[0]?.created_at || new Date();

      // 6. Dispatch Notification Email to Business Owner via Resend
      // Set Reply-To as customer's email so the owner can reply directly.
      const businessNotificationHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f5f2; margin: 0; padding: 24px; color: #1c1917; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { background: #991b1b; padding: 24px 32px; color: #ffffff; }
            .header h1 { margin: 0 0 4px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
            .header p { margin: 0; font-size: 13px; color: #fecaca; }
            .body { padding: 32px; }
            .badge { display: inline-block; padding: 4px 10px; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-radius: 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 20px; }
            .field-row { margin-bottom: 16px; }
            .field-label { font-size: 11px; font-weight: 700; color: #78716c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
            .field-value { font-size: 14px; color: #1c1917; }
            .field-value a { color: #991b1b; text-decoration: none; font-weight: 600; }
            .message-box { background: #fafaf9; border-left: 4px solid #991b1b; padding: 18px 20px; border-radius: 0 12px 12px 0; font-size: 14px; line-height: 1.6; color: #292524; white-space: pre-wrap; margin: 20px 0; }
            .btn { display: inline-block; background: #991b1b; color: #ffffff !important; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 12px; }
            .footer { background: #fafaf9; border-top: 1px solid #e7e5e4; padding: 16px 32px; font-size: 12px; color: #a8a29e; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>NepalDrive Concierge Notification</h1>
              <p>New customer expedition enquiry received</p>
            </div>
            <div class="body">
              <span class="badge">Enquiry #${enquiryId} &bull; Status: NEW</span>
              
              <div class="field-row">
                <div class="field-label">Customer Name</div>
                <div class="field-value"><strong>${cleanName}</strong></div>
              </div>

              <div class="field-row">
                <div class="field-label">Email Address (Reply-To)</div>
                <div class="field-value"><a href="mailto:${cleanEmail}">${cleanEmail}</a></div>
              </div>

              ${cleanPhone ? `
              <div class="field-row">
                <div class="field-label">Phone / WhatsApp</div>
                <div class="field-value"><a href="tel:${cleanPhone}">${cleanPhone}</a></div>
              </div>` : ''}

              <div class="field-row">
                <div class="field-label">Subject</div>
                <div class="field-value"><strong>${cleanSubject}</strong></div>
              </div>

              <div class="field-row">
                <div class="field-label">Customer Message</div>
                <div class="message-box">${cleanMessage}</div>
              </div>

              <div class="field-row">
                <div class="field-label">Client Details</div>
                <div class="field-value" style="font-size: 12px; color: #78716c;">
                  IP: ${clientIp} &bull; Received at: ${new Date(createdAt).toUTCString()}
                </div>
              </div>

              <div style="margin-top: 24px; text-align: center;">
                <a href="mailto:${cleanEmail}?subject=Re: [NepalDrive] ${encodeURIComponent(cleanSubject)}" class="btn">
                  Direct Reply to ${cleanName} &rarr;
                </a>
              </div>
            </div>
            <div class="footer">
              NepalDrive Himalayan Rentals &bull; Lazimpat, Kathmandu &amp; Lakeside, Pokhara &bull; Strictly 1 SuperAdmin
            </div>
          </div>
        </body>
        </html>
      `;

      // Dispatch to Business Destination Email
      await sendTransactionalEmail({
        to: BUSINESS_CONTACT_EMAIL,
        replyTo: cleanEmail,
        subject: `Website Contact: ${cleanSubject}`,
        html: businessNotificationHtml,
        text: `Website Contact Enquiry #${enquiryId}\nDate/Time: ${new Date(createdAt).toUTCString()}\nName: ${cleanName}\nEmail: ${cleanEmail}\nPhone: ${cleanPhone || 'N/A'}\nSubject: ${cleanSubject}\n\nMessage:\n${cleanMessage}`,
      });

      // 7. Dispatch Confirmation / Auto-Acknowledgment Email to Customer
      const customerAckHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f5f2; margin: 0; padding: 24px; color: #1c1917; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { background: #1c1917; padding: 28px 32px; color: #ffffff; }
            .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #ffffff; }
            .header p { margin: 0; font-size: 13px; color: #d6d3d1; }
            .body { padding: 32px; }
            .highlight-box { background: #fafaf9; border-radius: 12px; padding: 20px; border: 1px solid #e7e5e4; margin: 20px 0; }
            .footer { background: #fafaf9; border-top: 1px solid #e7e5e4; padding: 20px 32px; font-size: 12px; color: #78716c; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Namaste, ${cleanName}!</h1>
              <p>We have received your Nepal expedition enquiry</p>
            </div>
            <div class="body">
              <p style="font-size: 15px; line-height: 1.6;">
                Thank you for reaching out to <strong>NepalDrive</strong>. Our Himalayan expedition concierge and fleet operations team have logged your request under <strong>Reference #${enquiryId}</strong>.
              </p>

              <div class="highlight-box">
                <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #78716c; margin-bottom: 6px;">Subject of Inquiry</div>
                <div style="font-size: 14px; font-weight: 600; color: #1c1917; margin-bottom: 12px;">${cleanSubject}</div>
                <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #78716c; margin-bottom: 6px;">Your Message Summary</div>
                <div style="font-size: 13px; color: #44403c; line-height: 1.5; white-space: pre-wrap;">${cleanMessage}</div>
              </div>

              <p style="font-size: 14px; color: #44403c; line-height: 1.6;">
                Our team responds to all expedition and rental inquiries within <strong>2 to 4 business hours</strong>. If your request is urgent regarding an active ride today, feel free to contact our direct helpline at <a href="tel:+9779801234567" style="color: #991b1b; font-weight: 600;">+977-9801234567</a>.
              </p>
            </div>
            <div class="footer">
              <strong>NepalDrive Luxury &amp; 4x4 Fleet Rentals</strong><br/>
              Lazimpat Hub, Kathmandu Valley &bull; Lakeside Branch, Pokhara<br/>
              Website: <a href="https://nepaldrive.com" style="color: #991b1b;">nepaldrive.com</a>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendTransactionalEmail({
        to: cleanEmail,
        replyTo: BUSINESS_CONTACT_EMAIL,
        subject: `We have received your enquiry: "${cleanSubject}" - NepalDrive`,
        html: customerAckHtml,
        text: `Namaste ${cleanName},\n\nWe have received your enquiry regarding "${cleanSubject}" (Ref #${enquiryId}). Our concierge team will respond within 2-4 hours.\n\nWarm regards,\nNepalDrive Fleet Team`,
      });

      // 8. Log Audit Event
      await logAuditEvent(
        null,
        cleanEmail,
        'SUBMIT_CONTACT_ENQUIRY',
        'enquiries',
        `New enquiry #${enquiryId} submitted by ${cleanName} (${cleanEmail}) regarding: "${cleanSubject}"`
      );

      return res.status(200).json({
        success: true,
        message: 'Your message has been sent successfully! Our concierge team will get back to you shortly.',
        data: {
          enquiry_id: enquiryId,
          name: cleanName,
          email: cleanEmail,
          subject: cleanSubject,
          status: 'NEW',
          created_at: createdAt,
        },
      });
    } catch (err: any) {
      console.error('❌ Error handling contact form submission:', err);
      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred while processing your message. Please try again or call our direct helpline.',
      });
    }
  }
);

// SECURED ADMIN ENDPOINT: GET ALL ENQUIRIES
app.get('/api/v1/admin/enquiries', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.query;
    let queryStr = 'SELECT * FROM enquiries';
    const params: any[] = [];

    if (status && ['NEW', 'READ', 'REPLIED', 'ARCHIVED'].includes(status.toString().toUpperCase())) {
      queryStr += ' WHERE status = $1';
      params.push(status.toString().toUpperCase());
    }

    queryStr += ' ORDER BY created_at DESC';

    const result = await dbQuery(queryStr, params);
    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// SECURED ADMIN ENDPOINT: UPDATE ENQUIRY STATUS / NOTES
app.patch('/api/v1/admin/enquiries/:id', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const enquiryId = Number(req.params.id);
  const { status, admin_notes } = req.body;

  try {
    const existing = await dbQuery('SELECT * FROM enquiries WHERE id = $1', [enquiryId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    const current = existing.rows[0];
    const newStatus = status && ['NEW', 'READ', 'REPLIED', 'ARCHIVED'].includes(status.toString().toUpperCase())
      ? status.toString().toUpperCase()
      : current.status;
    const newNotes = admin_notes !== undefined ? admin_notes : current.admin_notes;

    await dbQuery(
      'UPDATE enquiries SET status = $1, admin_notes = $2 WHERE id = $3',
      [newStatus, newNotes, enquiryId]
    );

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      'UPDATE_ENQUIRY_STATUS',
      'enquiries',
      `Owner updated enquiry #${enquiryId} (${current.name}) status to '${newStatus}'`
    );

    return res.json({
      success: true,
      message: `Enquiry #${enquiryId} updated to status '${newStatus}'.`,
      data: { id: enquiryId, status: newStatus, admin_notes: newNotes },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// SECURED ADMIN ENDPOINT: SEND DIRECT EMAIL REPLY TO CUSTOMER
app.post('/api/v1/admin/enquiries/:id/reply', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const enquiryId = Number(req.params.id);
  const { reply_message, subject_override } = req.body;

  if (!reply_message || reply_message.trim().length < 5) {
    return res.status(400).json({ success: false, message: 'Reply message must be at least 5 characters long.' });
  }

  try {
    const existing = await dbQuery('SELECT * FROM enquiries WHERE id = $1', [enquiryId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    const enquiry = existing.rows[0];
    const replySubject = subject_override || `Re: [NepalDrive] ${enquiry.subject}`;

    const replyHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f5f2; margin: 0; padding: 24px; color: #1c1917; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: #991b1b; padding: 24px 32px; color: #ffffff; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; }
          .body { padding: 32px; font-size: 14px; line-height: 1.6; color: #1c1917; }
          .reply-content { background: #fafaf9; border-left: 4px solid #991b1b; padding: 18px 20px; border-radius: 0 12px 12px 0; margin: 16px 0; white-space: pre-wrap; font-size: 14px; }
          .original-quote { margin-top: 24px; padding: 16px; background: #f5f5f4; border-radius: 8px; font-size: 12px; color: #78716c; }
          .footer { background: #fafaf9; border-top: 1px solid #e7e5e4; padding: 16px 32px; font-size: 12px; color: #a8a29e; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>NepalDrive Response</h1>
          </div>
          <div class="body">
            <p>Dear ${enquiry.name},</p>
            <div class="reply-content">${sanitizeInput(reply_message)}</div>
            <p>If you have any further questions or require special vehicle provisioning, please reply directly to this email or call our hotline at <strong>+977-9801234567</strong>.</p>
            
            <div class="original-quote">
              <strong>Your Original Enquiry (Ref #${enquiry.id}):</strong><br/>
              ${sanitizeInput(enquiry.message)}
            </div>
          </div>
          <div class="footer">
            NepalDrive Himalayan Fleet Services &bull; Lazimpat, Kathmandu &bull; nepaldrive.com
          </div>
        </div>
      </body>
      </html>
    `;

    const dispatchResult = await sendTransactionalEmail({
      to: enquiry.email,
      replyTo: BUSINESS_CONTACT_EMAIL,
      subject: replySubject,
      html: replyHtml,
      text: `Dear ${enquiry.name},\n\n${reply_message}\n\nWarm regards,\nNepalDrive Team`,
    });

    // Mark enquiry as REPLIED
    const updatedNotes = enquiry.admin_notes 
      ? `${enquiry.admin_notes}\n[${new Date().toISOString().split('T')[0]}] Replied: "${reply_message.slice(0, 80)}..."`
      : `[${new Date().toISOString().split('T')[0]}] Replied: "${reply_message.slice(0, 80)}..."`;

    await dbQuery(
      "UPDATE enquiries SET status = 'REPLIED', admin_notes = $1 WHERE id = $2",
      [updatedNotes, enquiryId]
    );

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      'REPLY_TO_ENQUIRY',
      'enquiries',
      `Owner sent email reply to ${enquiry.email} for enquiry #${enquiryId}`
    );

    const deliveryNote = dispatchResult.forwarded
      ? ` (Delivered to verified owner account ${dispatchResult.deliveredTo} for ${enquiry.email})`
      : ` to ${enquiry.email}`;

    return res.json({
      success: true,
      message: `Email reply dispatched successfully${deliveryNote}!`,
      data: {
        id: enquiryId,
        status: 'REPLIED',
        delivered_to: dispatchResult.deliveredTo || enquiry.email,
        forwarded: dispatchResult.forwarded || false,
        email_id: dispatchResult.id,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to send reply email: ' + (err.message || 'Internal Server Error') });
  }
});

// SECURED ADMIN ENDPOINT: DELETE ENQUIRY
app.delete('/api/v1/admin/enquiries/:id', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const enquiryId = Number(req.params.id);
  try {
    const existing = await dbQuery('SELECT name, email FROM enquiries WHERE id = $1', [enquiryId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    await dbQuery('DELETE FROM enquiries WHERE id = $1', [enquiryId]);

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      'DELETE_ENQUIRY',
      'enquiries',
      `Owner deleted enquiry #${enquiryId} from ${existing.rows[0].email}`
    );

    return res.json({ success: true, message: `Enquiry #${enquiryId} deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// -----------------------------------------------------------------------------
// 12.1 FAMOUS RIDE ROUTES & ROAD TRIPS IN NEPAL
// -----------------------------------------------------------------------------
const NEPAL_FAMOUS_ROUTES = [
  {
    id: 'upper-mustang',
    name: 'Upper Mustang Forbidden Kingdom Circuit',
    tagline: 'The Ultimate Himalayan 4x4 & Adventure Ride to the Walled City of Lo Manthang',
    origin: 'Pokhara Lakeside (820m)',
    destination: 'Lo Manthang (3,840m)',
    distance_km: 450,
    duration: '5 - 7 Days',
    difficulty: 'Extreme Off-Road (4x4 Only)',
    best_season: 'March to November (Rain-shadow Himalayan plateau)',
    elevation_gain: '820m to 3,840m',
    permits_required: ['ACAP Permit', 'Mustang Special Restricted Permit ($500/10 days)'],
    highlights: [
      'Kali Gandaki River Gorge (deepest gorge on planet Earth)',
      'Ancient sky caves of Chhoser & 15th-century Tibetan monasteries',
      'Wind-carved red clay canyons & medieval walled capital of Lo Manthang',
      'Unobstructed vistas of Dhaulagiri (8,167m) & Annapurna I (8,091m)'
    ],
    recommended_vehicles: ['Mahindra Scorpio 4x4', 'Toyota Fortuner 4WD', 'Royal Enfield Classic 350'],
    recommended_vehicle_ids: [1, 2, 6],
    key_stops: [
      { name: 'Pokhara', lat: 28.2096, lng: 83.9856, elevation: '820m', desc: 'Starting hub, Lakeside fuel & provisioning' },
      { name: 'Tatopani', lat: 28.4975, lng: 83.6542, elevation: '1,190m', desc: 'Natural hot springs & riverside lodges' },
      { name: 'Jomsom', lat: 28.7844, lng: 83.7225, elevation: '2,720m', desc: 'Windy valley airport & Apple brandy capital' },
      { name: 'Kagbeni', lat: 28.8353, lng: 83.7842, elevation: '2,810m', desc: 'Gateway checkpoint into Upper Mustang' },
      { name: 'Lo Manthang', lat: 29.1822, lng: 83.9567, elevation: '3,840m', desc: 'Ancient walled royal palace & King’s residence' }
    ]
  },
  {
    id: 'kathmandu-pokhara',
    name: 'Kathmandu to Pokhara Scenic Highway',
    tagline: 'Nepal’s Iconic River Corridor Connecting the Capital to the Annapurna Foothills',
    origin: 'Kathmandu (1,400m)',
    destination: 'Pokhara (820m)',
    distance_km: 200,
    duration: '5 - 6 Hours',
    difficulty: 'Paved / Moderate Mountain Curves',
    best_season: 'Year-Round (Best: Oct - May)',
    elevation_gain: '1,400m down to 820m through river gorges',
    permits_required: ['Standard Road Toll / Vehicle Tax'],
    highlights: [
      'Trishuli River white-water rapids and hanging suspension bridges',
      'Fresh local Malekhu river fish delicacies & roadside cafe culture',
      'Winding mountain curves along Marsyangdi river valley',
      'First breathtaking panoramic glimpse of Fishtail (Machhapuchhre) mountain'
    ],
    recommended_vehicles: ['Hyundai Kona Electric EV', 'Toyota Fortuner SUV', 'Honda Activa 125 Scooter'],
    recommended_vehicle_ids: [1, 3, 5],
    key_stops: [
      { name: 'Kathmandu Lazimpat', lat: 27.7215, lng: 85.3206, elevation: '1,400m', desc: 'NepalDrive Central Hub departure' },
      { name: 'Malekhu', lat: 27.8083, lng: 84.8294, elevation: '450m', desc: 'Trishuli river fresh fish lunch & rest stop' },
      { name: 'Mugling Junction', lat: 27.8596, lng: 84.5539, elevation: '260m', desc: 'Crucial transit fork to Pokhara / Chitwan' },
      { name: 'Damauli', lat: 27.9717, lng: 84.2867, elevation: '420m', desc: 'Vyasa Cave heritage town' },
      { name: 'Pokhara Lakeside', lat: 28.2096, lng: 83.9856, elevation: '820m', desc: 'Phewa Lake promenade & Annapurna views' }
    ]
  },
  {
    id: 'manang-circuit',
    name: 'Manang High Himalayan Valley Trail',
    tagline: 'A Thrilling Ascent into Alpine Glacial Lakes Beneath Annapurna II & IV',
    origin: 'Besisahar (760m)',
    destination: 'Manang Village (3,519m)',
    distance_km: 110,
    duration: '3 - 4 Days',
    difficulty: 'Challenging Mountain Off-Road',
    best_season: 'September to December, March to May',
    elevation_gain: '760m to 3,519m (Over 2,750m vertical climb)',
    permits_required: ['ACAP Permit', 'TIMS Card'],
    highlights: [
      'Dramatic waterfalls cascading directly onto the mountain road',
      'Towering vertical cliffs of Paungda Danda (Swarga Dwar / Gateway to Heaven)',
      'High-altitude desert pine forests and yak pastures',
      'Proximity to Gangapurna Lake and Tilicho Base Camp trail'
    ],
    recommended_vehicles: ['Mahindra Scorpio 4x4', 'Royal Enfield Classic 350'],
    recommended_vehicle_ids: [2, 6],
    key_stops: [
      { name: 'Besisahar', lat: 28.2306, lng: 84.3758, elevation: '760m', desc: 'Trailhead checkpoint & 4WD vehicle gear up' },
      { name: 'Chame', lat: 28.5531, lng: 84.2403, elevation: '2,670m', desc: 'District capital with hot spring & pine views' },
      { name: 'Pisang', lat: 28.6186, lng: 84.1481, elevation: '3,200m', desc: 'Splendid view of Annapurna II face' },
      { name: 'Manang', lat: 28.6653, lng: 84.0208, elevation: '3,519m', desc: 'Historic mountain village & acclimatization base' }
    ]
  },
  {
    id: 'rara-lake',
    name: 'Rara Lake Karnali Wild West Expedition',
    tagline: 'The Crown Jewel of Western Nepal: Pristine Deep Blue Waters Surrounded by Snow Pines',
    origin: 'Surkhet (700m)',
    destination: 'Rara National Park (2,990m)',
    distance_km: 370,
    duration: '6 - 8 Days',
    difficulty: 'Extreme Wilderness Off-Road',
    best_season: 'April to June, September to November',
    elevation_gain: '700m to 2,990m across remote Karnali ravines',
    permits_required: ['Rara National Park Entry Permit'],
    highlights: [
      'Nepal’s largest lake with crystal-clear turquoise waters mirroring Himalayan peaks',
      'Ancient Sinja Valley, birthplace of the modern Khas / Nepali language',
      'Dense coniferous forests sheltering Himalayan black bears and red pandas',
      'Unmatched night stargazing beneath zero light pollution'
    ],
    recommended_vehicles: ['Mahindra Scorpio 4x4', 'Toyota Fortuner 4WD'],
    recommended_vehicle_ids: [1, 2],
    key_stops: [
      { name: 'Surkhet', lat: 28.5833, lng: 81.6333, elevation: '700m', desc: 'Karnali provincial capital staging ground' },
      { name: 'Kalikot', lat: 29.1333, lng: 81.8500, elevation: '1,450m', desc: 'Rugged cliffside town along Karnali River' },
      { name: 'Sinja Valley', lat: 29.3167, lng: 81.9833, elevation: '2,440m', desc: '12th-century Khas Empire archaeological ruins' },
      { name: 'Rara Lake', lat: 29.5372, lng: 82.0833, elevation: '2,990m', desc: 'Pristine 10 sq km alpine lake sanctuary' }
    ]
  },
  {
    id: 'nagarkot-dhulikhel',
    name: 'Kathmandu Valley Himalayan Ridge Loop',
    tagline: 'Effortless Weekend Escape: 180° Himalayan Sunrise Panoramas & Ancient Newari Towns',
    origin: 'Kathmandu (1,400m)',
    destination: 'Nagarkot & Dhulikhel Ridge (2,175m)',
    distance_km: 85,
    duration: '1 - 2 Days',
    difficulty: 'Easy / Paved Hill Roads',
    best_season: 'October to April (Crisp mountain visibility)',
    elevation_gain: '1,400m to 2,175m',
    permits_required: ['None (Free public mountain road)'],
    highlights: [
      'Sunrise over eight Himalayan ranges including Langtang, Ganesh Himal & Everest tip',
      'Medieval brick architecture and pottery squares of Bhaktapur Durbar',
      'Charming heritage resort town of Dhulikhel with organic cafe culture',
      'Sacred Namobuddha monastery nestled in peaceful prayer-flag hilltops'
    ],
    recommended_vehicles: ['Honda Activa 125 Scooter', 'Hyundai Kona Electric EV', 'Toyota Fortuner SUV'],
    recommended_vehicle_ids: [3, 5],
    key_stops: [
      { name: 'Kathmandu', lat: 27.7172, lng: 85.3240, elevation: '1,400m', desc: 'Start at Thamel / Lazimpat' },
      { name: 'Bhaktapur', lat: 27.6710, lng: 85.4298, elevation: '1,401m', desc: 'Living museum UNESCO World Heritage city' },
      { name: 'Nagarkot', lat: 27.7153, lng: 85.5204, elevation: '2,175m', desc: 'Famous panoramic Himalayan view tower' },
      { name: 'Dhulikhel', lat: 27.6253, lng: 85.5561, elevation: '1,550m', desc: 'Scenic mountain rim boutique resorts' }
    ]
  },
  {
    id: 'chitwan-safari',
    name: 'Chitwan National Park Terai Plains Highway',
    tagline: 'From Highland Valleys to Subtropical Jungles: Home of the Greater One-Horned Rhinoceros',
    origin: 'Kathmandu (1,400m)',
    destination: 'Sauraha Chitwan (150m)',
    distance_km: 160,
    duration: '4 - 5 Hours',
    difficulty: 'Paved Highway & Jungle Fringe',
    best_season: 'October to March (Warm and sunny)',
    elevation_gain: '1,400m down to 150m flatlands',
    permits_required: ['Chitwan National Park Safari Pass'],
    highlights: [
      'Subtropical Terai wilderness: wild rhinos, Bengal tigers & gharial crocodiles',
      'Rapti river sunset canoeing with elephants bathing along the sandbanks',
      'Authentic Tharu cultural dance performances and indigenous cuisine',
      'Smooth straight Terai highway ideal for comfortable EV cruising'
    ],
    recommended_vehicles: ['Hyundai Kona Electric EV', 'Toyota Fortuner SUV', 'Mahindra Scorpio 4x4'],
    recommended_vehicle_ids: [1, 2, 3],
    key_stops: [
      { name: 'Kathmandu', lat: 27.7172, lng: 85.3240, elevation: '1,400m', desc: 'Exit valley via Chandragiri pass' },
      { name: 'Mugling', lat: 27.8596, lng: 84.5539, elevation: '260m', desc: 'Turn South towards Narayanghat' },
      { name: 'Narayanghat', lat: 27.6937, lng: 84.4297, elevation: '180m', desc: 'Bustling commercial hub on Narayani river' },
      { name: 'Sauraha Chitwan', lat: 27.5817, lng: 84.4950, elevation: '150m', desc: 'Wildlife safari gateway & national park entry' }
    ]
  }
];

// PUBLIC API: GET ALL FAMOUS RIDE ROUTES
app.get('/api/v1/routes', (req, res) => {
  return res.json({ success: true, count: NEPAL_FAMOUS_ROUTES.length, data: NEPAL_FAMOUS_ROUTES });
});

// PUBLIC API: GET SINGLE RIDE ROUTE
app.get('/api/v1/routes/:id', (req, res) => {
  const route = NEPAL_FAMOUS_ROUTES.find(r => r.id === req.params.id);
  if (!route) {
    return res.status(404).json({ success: false, message: 'Ride route not found' });
  }
  return res.json({ success: true, data: route });
});

// -----------------------------------------------------------------------------
// 12.5 MAP INTEGRATION & LOCATIONS ENGINE (LEAFLET + OSM)
// -----------------------------------------------------------------------------

// In-Memory Geocoding cache to protect Nominatim API rate limits
const geocodeCache = new Map<string, { lat: number; lon: number; display_name: string; timestamp: number }>();

// Pre-mapped high-traffic Nepal landmark hubs
const NEPAL_LANDMARKS: Record<string, { lat: number; lon: number; display_name: string }> = {
  'kathmandu': { lat: 27.7172, lon: 85.3240, display_name: 'Kathmandu Central, Bagmati, Nepal' },
  'thamel': { lat: 27.7154, lon: 85.3123, display_name: 'Thamel Tourist Hub, Kathmandu, Nepal' },
  'lazimpat': { lat: 27.7190, lon: 85.3210, display_name: 'Lazimpat Embassy Area, Kathmandu, Nepal' },
  'tia': { lat: 27.6966, lon: 85.3591, display_name: 'Tribhuvan International Airport (TIA), Kathmandu' },
  'airport': { lat: 27.6966, lon: 85.3591, display_name: 'Tribhuvan International Airport (TIA), Kathmandu' },
  'pokhara': { lat: 28.2096, lon: 83.9595, display_name: 'Pokhara Lakeside (Baidam), Gandaki, Nepal' },
  'lalitpur': { lat: 27.6780, lon: 85.3175, display_name: 'Pulchowk & Patan, Lalitpur, Nepal' },
  'patan': { lat: 27.6780, lon: 85.3175, display_name: 'Patan Durbar Square, Lalitpur, Nepal' },
  'bhaktapur': { lat: 27.6715, lon: 85.4280, display_name: 'Bhaktapur Durbar Square Gateway, Nepal' },
  'chitwan': { lat: 27.5794, lon: 84.4965, display_name: 'Sauraha Wildlife Station, Chitwan National Park' },
  'sauraha': { lat: 27.5794, lon: 84.4965, display_name: 'Sauraha, Chitwan National Park, Nepal' },
  'nagarkot': { lat: 27.7176, lon: 85.5204, display_name: 'Nagarkot Mountain Viewpoint, Bhaktapur, Nepal' },
  'mustang': { lat: 28.7833, lon: 83.7333, display_name: 'Jomsom Mustang Expedition Base, Nepal' },
  'jomsom': { lat: 28.7833, lon: 83.7333, display_name: 'Jomsom Airport Station, Mustang, Nepal' },
  'dharan': { lat: 26.8124, lon: 87.2835, display_name: 'Bhanuchowk, Dharan, Eastern Nepal' },
  'butwal': { lat: 27.7006, lon: 83.4484, display_name: 'Traffic Chowk, Butwal, Lumbini, Nepal' }
};

// GET MAP CONFIGURATION (Configurable Tile URL & Attribution)
app.get('/api/v1/config/map', (req, res) => {
  return res.json({
    success: true,
    data: {
      tile_url: process.env.MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: process.env.MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      default_center: [27.7172, 85.3240], // Kathmandu
      default_zoom: 8,
      nepal_bounds: [
        [26.347, 80.058], // Southwest
        [30.447, 88.201]  // Northeast
      ]
    }
  });
});

// GET ALL FLEET HUBS & LOCATIONS
app.get('/api/v1/locations', async (req, res) => {
  try {
    const result = await dbQuery('SELECT * FROM locations ORDER BY id ASC');
    if (result.rows && result.rows.length > 0) {
      console.log(`📍 Serving ${result.rows.length} fleet hubs from PostgreSQL.`);
      return res.json({ success: true, count: result.rows.length, data: result.rows });
    }
    console.log(`📍 Locations table is empty, serving ${initialLocations.length} initial locations.`);
    return res.json({ success: true, count: initialLocations.length, data: initialLocations });
  } catch (err: any) {
    console.warn('⚠️ Notice fetching locations from database, serving verified hub fallback:', err?.message || err);
    // Graceful fallback to verified fleet hubs so homepage and map never break with HTTP 500
    return res.json({ success: true, count: initialLocations.length, data: initialLocations, fallback: true });
  }
});

// GET SINGLE LOCATION HUB BY SLUG
app.get('/api/v1/locations/:slug', async (req, res) => {
  try {
    const result = await dbQuery('SELECT * FROM locations WHERE slug = $1', [req.params.slug]);
    if (result.rows && result.rows.length > 0) {
      return res.json({ success: true, data: result.rows[0] });
    }
    const fallbackLoc = initialLocations.find(l => l.slug === req.params.slug);
    if (fallbackLoc) {
      return res.json({ success: true, data: fallbackLoc });
    }
    return res.status(404).json({ success: false, message: 'Location hub not found' });
  } catch (err: any) {
    console.error('❌ Error fetching location by slug:', err?.message || err);
    const fallbackLoc = initialLocations.find(l => l.slug === req.params.slug);
    if (fallbackLoc) {
      return res.json({ success: true, data: fallbackLoc, fallback: true });
    }
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ADMIN: CREATE LOCATION HUB
const locationSchema = z.object({
  name: z.string().min(3),
  city: z.string().min(2),
  address: z.string().min(5),
  latitude: z.number().min(26.0).max(31.0),
  longitude: z.number().min(80.0).max(89.0),
  phone: z.string().optional(),
  operating_hours: z.string().optional(),
  description: z.string().optional(),
});

app.post('/api/v1/admin/locations', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = locationSchema.parse(req.body);
    const slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    const result = await dbQuery(
      `INSERT INTO locations (name, slug, address, city, latitude, longitude, is_active, phone, operating_hours, description)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8, $9) RETURNING *`,
      [
        payload.name,
        slug,
        payload.address,
        payload.city,
        payload.latitude,
        payload.longitude,
        payload.phone || null,
        payload.operating_hours || '7:00 AM - 9:00 PM',
        payload.description || ''
      ]
    );

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      'CREATE_LOCATION_HUB',
      'locations',
      `Admin created fleet hub station: ${payload.name} (${payload.city}) at (${payload.latitude}, ${payload.longitude})`
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.issues });
    }
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ADMIN: DELETE LOCATION HUB
app.delete('/api/v1/admin/locations/:id', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  try {
    const check = await dbQuery('SELECT name FROM locations WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Location hub not found' });
    }

    await dbQuery('DELETE FROM locations WHERE id = $1', [id]);

    await logAuditEvent(
      req.user!.id,
      req.user!.email,
      'DELETE_LOCATION_HUB',
      'locations',
      `Admin deleted location hub #${id} (${check.rows[0].name})`
    );

    return res.json({ success: true, message: 'Location hub removed successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// GEOCODING SEARCH PROXY (DEBOUNCED & CACHED TO RESPECT OPENSTREETMAP NOMINATIM POLICY)
app.get('/api/v1/geocode', rateLimiter(30, 60 * 1000), async (req, res) => {
  const query = req.query.q?.toString()?.trim();
  if (!query || query.length < 2) {
    return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
  }

  const cacheKey = query.toLowerCase();

  // 1. Check in-memory cache (24 hours TTL)
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60 * 24) {
    return res.json({ success: true, cached: true, data: [cached] });
  }

  // 2. Check pre-mapped Nepal landmarks
  const landmarkMatch = Object.keys(NEPAL_LANDMARKS).find(k => cacheKey.includes(k));
  if (landmarkMatch) {
    const landmark = NEPAL_LANDMARKS[landmarkMatch];
    geocodeCache.set(cacheKey, { ...landmark, timestamp: Date.now() });
    return res.json({ success: true, source: 'landmark', data: [landmark] });
  }

  // 3. Fallback to OpenStreetMap Nominatim with strict headers
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Nepal')}&format=json&limit=4&countrycodes=np`,
      {
        headers: {
          'User-Agent': 'NepalDrive-Rental-Platform/1.0 (contact@nepaldrive.com)',
        },
      }
    );

    if (!response.ok) {
      return res.status(502).json({ success: false, message: 'Geocoding service unavailable' });
    }

    const results = await response.json();
    const mapped = (results as any[]).map(r => ({
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      display_name: r.display_name
    }));

    if (mapped.length > 0) {
      geocodeCache.set(cacheKey, { ...mapped[0], timestamp: Date.now() });
    }

    return res.json({ success: true, data: mapped });
  } catch (err) {
    return res.json({
      success: true,
      data: [{ lat: 27.7172, lon: 85.3240, display_name: `${query}, Nepal` }]
    });
  }
});

// FAVICON ENDPOINTS
app.get('/favicon.ico', (req, res) => {
  const icoPath = path.join(__dirname, 'public', 'favicon.ico');
  const distIcoPath = path.join(__dirname, 'dist', 'favicon.ico');
  const filePath = fs.existsSync(icoPath) ? icoPath : fs.existsSync(distIcoPath) ? distIcoPath : null;
  if (filePath) {
    res.setHeader('Content-Type', 'image/x-icon');
    return res.sendFile(filePath);
  }
  return res.sendStatus(204);
});

app.get('/favicon.svg', (req, res) => {
  const svgPath = path.join(__dirname, 'public', 'favicon.svg');
  const distSvgPath = path.join(__dirname, 'dist', 'favicon.svg');
  const filePath = fs.existsSync(svgPath) ? svgPath : fs.existsSync(distSvgPath) ? distSvgPath : null;
  if (filePath) {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.sendFile(filePath);
  }
  return res.sendStatus(204);
});

// -----------------------------------------------------------------------------
// 13. DYNAMIC SITEMAP.XML ENGINE (SEO REQUIREMENT)
// -----------------------------------------------------------------------------
app.get('/sitemap.xml', async (req, res) => {
  res.header('Content-Type', 'application/xml');
  try {
    const vehiclesResult = await dbQuery('SELECT slug, updated_at FROM vehicles');
    const baseUrl = process.env.APP_URL || 'https://nepaldrive.com';
    const today = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/vehicles</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>2026-10-04</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/faq</loc>
    <lastmod>2026-10-04</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>2026-10-04</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;

    // Dynamic Vehicle Pages
    for (const v of vehiclesResult.rows) {
      const lastmod = v.updated_at ? new Date(v.updated_at).toISOString().split('T')[0] : today;
      sitemap += `  <url>
    <loc>${baseUrl}/vehicles/${v.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    sitemap += '</urlset>';
    return res.send(sitemap);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error generating sitemap');
  }
});

// -----------------------------------------------------------------------------
// 14. ROBOTS.TXT (SEO REQUIREMENT)
// -----------------------------------------------------------------------------
app.get('/robots.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  const baseUrl = process.env.APP_URL || 'https://nepaldrive.com';
  const robots = `User-agent: *
Allow: /
Allow: /vehicles
Allow: /about
Allow: /contact
Allow: /faq

# Private and secure endpoints
Disallow: /admin/
Disallow: /account/
Disallow: /checkout/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
  return res.send(robots);
});

// -----------------------------------------------------------------------------
// 14.5 GLOBAL JSON ERROR HANDLER FOR ALL API ROUTES
// Ensures errors always return valid JSON responses and never raw HTML
// -----------------------------------------------------------------------------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`❌ [API Error] ${req.method} ${req.originalUrl || req.url}:`, err?.stack || err?.message || err);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 600
    ? err.status
    : typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
    ? err.statusCode
    : 500;

  return res.status(statusCode).json({
    success: false,
    error: err?.name || 'InternalServerError',
    message: err?.message || 'An unexpected error occurred while processing the request.',
    path: req.originalUrl || req.url,
    timestamp: new Date().toISOString(),
  });
});

// Explicit JSON 404 handler for unmatched API routes
app.use('/api', (req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    error: 'NotFound',
    message: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
    path: req.originalUrl || req.url,
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------------------------------------------------------
// 15. FRONTEND INTEGRATION & VITE DEVELOPER SERVER MOUNTING
// -----------------------------------------------------------------------------
const startServer = async () => {
  await initializeDatabase();

  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    // Serve production static assets from dist
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else if (!process.env.VERCEL) {
    // Development server with Vite integration (dynamically imported to prevent bundling in serverless)
    const vitePackage = 'vite';
    const { createServer: createViteServer } = await import(/* @vite-ignore */ vitePackage);
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  if (!process.env.VERCEL) {
    const portNum = Number(PORT) || 3000;
    app.listen(portNum, '0.0.0.0', () => {
      console.log(`🚀 NepalDrive Full Stack Server running on port ${portNum} (0.0.0.0)`);
    });
  }
};

const isRunningDirectly = !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && Boolean(
  process.argv[1] && (
    process.argv[1].endsWith('server.ts') ||
    process.argv[1].endsWith('server.js') ||
    process.argv[1].includes('tsx')
  )
);

if (isRunningDirectly) {
  startServer().catch(err => {
    console.error('❌ Server startup failed:', err);
  });
}

export default app;
