# 05: Credentials wizard

**What to build:** An interactive script that walks a human through the setup steps only they can do, so the procedure never has to be re-explained to an agent.

Sending the sign-in code requires an email provider, and that provider requires a verified sending domain. That means an account, DNS records on the domain, and an API key — all of which need a person at a keyboard.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Running the script walks through creating the email-provider account and opens the right page at each step
- [ ] It prints the exact DNS records to add for the sending domain and waits for confirmation
- [ ] It captures the API key and writes it to local development secrets and to the deployed Worker's secrets
- [ ] It is safe to re-run: existing values are detected rather than duplicated
- [ ] The key is never printed to the terminal or committed
- [ ] A test send reaches a real inbox before the script reports success
