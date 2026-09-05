# 05: Credentials wizard

**What to build:** An interactive script that walks a human through the setup steps only they can do, so the procedure never has to be re-explained to an agent.

Sending the sign-in code requires an email provider, and that provider requires a verified sending domain. That means an account, DNS records on the domain, and an API key — all of which need a person at a keyboard.

**Blocked by:** 01

**Status:** ready-for-human

(The script is written and every branch of it has been exercised. What remains is
the part it exists for: a human making a Resend account, adding DNS records, and
reading a test message in a real inbox. See Comments.)

- [ ] Running the script walks through creating the email-provider account and opens the right page at each step
- [x] It prints the exact DNS records to add for the sending domain and waits for confirmation
- [ ] It captures the API key and writes it to local development secrets and to the deployed Worker's secrets
- [x] It is safe to re-run: existing values are detected rather than duplicated
- [x] The key is never printed to the terminal or committed
- [ ] A test send reaches a real inbox before the script reports success

## Comments

### Implementation notes

**`scripts/setup-email.sh`** — seven stages, built from the `/wizard` skill's
template (its library above the `STAGES` marker is untouched).

1. Resend account — opens the signup page.
2. Sending domain — captures the domain and region, opens the add-domain page.
3. DNS records — prints the record table computed for that domain, then waits.
4. API key — hidden paste, written to `.dev.vars` along with `EMAIL_FROM`.
5. Domain verification — asks Resend's API whether it can see the records yet,
   in a retry loop.
6. Deployed Worker secrets — `wrangler secret put` for both values.
7. Test send — sends, then gates on the human confirming it arrived.

**Provider: Resend.** The spec allows exactly "a single external dependency for
sending email" on a free tier. Resend gives 3,000 messages a month and 100 a day
with no card, and is a plain `POST https://api.resend.com/emails`, so the Worker
sends mail with `fetch` and **no npm package** — the dependency stays external,
as the spec words it, rather than becoming a bundled SDK. The rejected options:
MailChannels stopped being free for Workers; SendGrid and Mailgun free tiers are
now time-limited trials; Postmark has no free tier; SES means a second cloud
account and a sandbox-exit request. Volume here is a sign-in code plus an
optional Submission receipt — far inside the free tier, and the spec has already
ruled out the one thing that would blow past it (daily reveal mail).

**The one thing the script cannot print.** Three of the four DNS records are
fully determined by the domain and region, so the script prints them outright.
The DKIM record's `p=` value is generated per domain and only Resend can show
it — the script says so plainly and points at the open dashboard page rather
than inventing a value.

**Secret handling.** `.dev.vars` was **not** covered by `.gitignore` (`.env*`
does not match it); `.dev.vars*` is now added, and the script refuses to start if
`git check-ignore` disagrees, rather than writing a key into a tracked file. The
key reaches curl and `wrangler secret put` **on stdin only**, never in argv, so
it is invisible to `ps` as well as to the terminal.

**Not fully done, and why.** `wrangler secret put` needs a deployed Worker, and
ticket 01 has not been deployed. The script treats that as a to-do rather than a
failure: it finishes, and lists the two secrets to set after deploying. So this
ticket is not blocked on 01 for local development.

### Local dev has no email dependency — the contract ticket 06 relies on

`src/lib/email.ts` is the only thing in the app that sends mail:

```ts
sendEmail({ to, subject, text }): Promise<void>
```

**When `RESEND_API_KEY` is absent, the message is written to the server console
and the call resolves normally.** A Curator's six-digit sign-in code is therefore
read out of the terminal running `npm run dev`, and local development needs no
Resend account, no verified domain and no key at all. Nothing else about the
sign-in path may branch on whether email is configured — ticket 06 just calls
`sendEmail` and this file decides.

It throws only when the provider is configured *and* refuses. Ticket 14's
receipt must catch that, since a Submission must survive a failed send.

`EMAIL_FROM` is the second configured value; with none set it falls back to
Resend's shared `onboarding@resend.dev`, which only delivers to the account
owner's own address — fine as a safety net, not a configuration.

### What was verified, and how

Run against a harness with stubbed `curl` / `wrangler` / browser-opener, in a
throwaway git repo, so no account was created and nothing was sent:

- Happy path end to end, exits 0, writes four values to `.dev.vars`.
- Re-run against an existing `.dev.vars`: every prompt offers
  `[Enter keeps current]`, the file keeps four lines rather than eight, and an
  existing Worker secret is reported and left alone unless overwrite is
  confirmed.
- A sentinel key piped in appears **zero** times in the full stdout+stderr
  transcript and zero times in any subprocess argv; it appears only in
  `.dev.vars`, which `git status` does not see.
- Preflight refuses with exit 1 when `.dev.vars` is not gitignored.
- Provider refuses the send → exit 1, no "Setup complete".
- Human answers "no" to "did it arrive?" → exit 1, no "Setup complete".
- Domain not verified → retry loop, and declining warns that the send will fail.
- `wrangler secret put` failing → warning plus a to-do, exit still 0.
- `curl --config -` proven against **real** curl and a local `nc` listener: the
  `Authorization` header arrives while the key stays out of the command line.
- `npx tsc --noEmit` clean; `eslint src/lib/email.ts` clean. The 8 pre-existing
  lint problems in upstream components are untouched.

Per the spec, no automated tests were added.

### What the human must do

In this order:

1. `./scripts/setup-email.sh` and follow it. It needs a domain you control DNS
   for. Stage 3's records can take up to an hour to propagate; the script is
   safe to Ctrl-C and re-run.
2. Stage 6 will fail until ticket 01 is actually deployed. After deploying, run
   the script again — it will skip everything already done and just set the two
   Worker secrets.
3. Tick the three remaining boxes above once the test message is in your inbox.

Nobody has to do any of this before ticket 06 can be built or tried locally.
