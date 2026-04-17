# Email deliverability (CRM outbound)

## What the app does

- **Gmail API sends** build MIME with `multipart/alternative` (plain + HTML) when HTML is present, which improves compatibility with spam filters versus HTML-only payloads.
- **Hybrid inbox search**: Gmail `threads.list` receives a stripped query (CRM-only operators removed). Filters such as `is:tracked`, `is:opened`, `is:clicked`, and `in:mine` (thread owner in CRM) run client-side using CRM emails linked by `gmailThreadId`.

## What you must configure (domain)

- **SPF, DKIM, DMARC** on the domain you send from (Google Workspace for Gmail OAuth users, or your DNS when using Resend or another ESP).
- **Reputation**: avoid sudden high volume from a single mailbox; use the **communication_jobs** queue with spacing for bulk sends.
- **Marketing**: only queue contacts with `marketing_opt_in`; provide a real unsubscribe URL before adding `List-Unsubscribe` headers (future hardening).

## Limits

- Inbox placement is decided by recipients and providers; no client change guarantees avoiding spam or Promotions.
