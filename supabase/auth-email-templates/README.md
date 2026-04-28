# Supabase Auth Email Branding Kit

Production-ready transactional email templates for Supabase Auth:

- Confirm signup
- Magic link sign-in
- Reset password
- Invite user

These templates are designed for:

- Strong brand consistency (Velo tone + visual identity)
- Better readability on desktop/mobile clients
- Safer copy for security-sensitive actions
- Fast operator rollout from Supabase Dashboard

## How to apply in Supabase

1. Open Supabase Dashboard for your project.
2. Go to `Authentication -> Email Templates`.
3. For each template type, paste the matching HTML from this folder.
4. Keep the corresponding subject line from this guide.
5. Save and send a test email for each flow.

## Recommended subject lines

- Confirm signup: `Welcome to Velo - confirm your email`
- Magic link: `Your secure sign-in link for Velo`
- Reset password: `Reset your Velo password`
- Invite user: `You have been invited to Velo`

## Required placeholders

Do not remove these placeholders from HTML templates:

- `{{ .ConfirmationURL }}`
- `{{ .SiteURL }}`
- `{{ .Email }}`

Supabase injects values at send time.

## Branding checklist (operator)

- Set sender name and sender email in `Authentication -> SMTP Settings`.
- Use a domain with SPF, DKIM, and DMARC correctly configured.
- Keep `site_url` and `additional_redirect_urls` aligned with production domains in `supabase/config.toml`.
- Validate each flow end-to-end:
  - register -> confirm
  - login magic link
  - forgot password -> reset
  - invite -> accept

## Security and UX notes

- Emails avoid showing sensitive user data beyond recipient address.
- Clear fallback URL is always visible in case button click fails.
- Copy warns users to ignore links they did not request.
- This kit focuses on Auth emails only; app-generated outbound emails are covered in `docs/master-email-operations.md`.
---

*Last updated (git): **2026-04-27***
