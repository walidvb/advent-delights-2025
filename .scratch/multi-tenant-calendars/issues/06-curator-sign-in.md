# 06: Curator sign-in

**What to build:** A person types their email address, receives a six-digit code, types it in, and arrives at their dashboard. It is empty, because they have no Calendars yet.

There are no passwords, and deliberately no Google or GitHub sign-in. Only Curators have accounts; Contributors never will.

**Blocked by:** 01, 05

**Status:** ready-for-agent

- [ ] Submitting an email address sends a six-digit code to it
- [ ] Entering a correct code signs the person in and lands them on their dashboard
- [ ] A wrong or expired code is refused with a clear message and can be retried
- [ ] The session survives a page reload and a browser restart
- [ ] Signing in with the same email on a second device reaches the same account
- [ ] Visiting the dashboard while signed out redirects to sign-in rather than erroring
- [ ] Signing out works
