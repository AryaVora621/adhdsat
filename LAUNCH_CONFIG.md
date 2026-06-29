# Launch Config — human-only steps

These cannot be done from code. Do them before public launch.

## 1. Rotate the Supabase DB password (security — hard blocker)
The pooler connection string was pasted in chat earlier, so treat it as leaked.
Supabase dashboard → Project Settings → Database → Reset database password.
Then update `DATABASE_URL` in the Vercel project env (Production) and redeploy.

## 2. Supabase Auth config (needed for sign-in / sign-up to work end-to-end)
Guest mode ("Start free") already works with no config. Real accounts need:

Supabase dashboard → Authentication → URL Configuration:
- **Site URL**: `https://adhdsat.vercel.app`
- **Redirect URLs** (add both): `https://adhdsat.vercel.app/**` and `http://localhost:5173/**`
  (the second only if you want magic links to work in local dev)

Without this, magic-link emails and OAuth redirect back to the default
`localhost:3000` and the sign-in loop breaks.

### Enable Google sign-in
Authentication → Providers → Google → enable, then paste a Google OAuth
client ID + secret (from Google Cloud Console → Credentials → OAuth client,
type "Web application", authorized redirect URI:
`https://rhhpshsyrvckouqtyeov.supabase.co/auth/v1/callback`).
Until this is done the "Continue with Google" button will error; email
magic-link works without it.

### Email magic-link
Works out of the box on Supabase's built-in mailer (rate-limited to a few/hour).
For production volume, set up a custom SMTP provider under
Authentication → Emails → SMTP Settings.

## 3. Stripe (deferred — payments milestone)
Not started yet by design. When the Stripe account is ready: wire Checkout +
webhook to flip `users.plan` to `pro`. The plan-gating is already in place.
