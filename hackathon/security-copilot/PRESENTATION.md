# Security Copilot — Hackathon Presentation Script & Demo Flow

> **Use this file as your presenter notes.** It has (1) a slide-by-slide speaker script, (2) a live demo walkthrough, and (3) likely judge Q&A. Total target time: **5–7 minutes** (≈4 min talk + 2–3 min demo).

---

## 0. One-line pitch (memorize this)

> *"Security Copilot is an AI-powered threat-intelligence platform that automatically collects security news, verifies it with AI and CVE/NVD validation, routes only trustworthy items to human analysts, and turns approved threats into tailored content for executives, customers, and engineers — all with a full audit trail."*

---

## 1. Slide-by-slide speaker script

### Slide 1 — Title / Hook (30 sec)
**Say:**
> "Every day, thousands of security articles, advisories, and CVEs are published. Security teams drown in noise, miss real threats, and spend hours writing the same advisory five different ways for five different audiences. We built **Security Copilot** to fix that."

**On screen:** Project name, your team name, tagline: *"From raw threat noise to verified, audience-ready intelligence."*

---

### Slide 2 — The Problem (45 sec)
**Say:**
> "Three problems. **One — overload:** analysts can't read every feed. **Two — trust:** not every headline is real or relevant, and verifying CVEs manually is slow. **Three — communication:** once a threat is confirmed, someone still has to write an executive brief, a customer advisory, and a technical breakdown by hand. That's where days get lost."

**On screen (3 bullets):**
- 📥 Information overload — too many sources, too little time
- ❓ Trust gap — manual CVE/NVD verification is slow and error-prone
- ✍️ Communication bottleneck — one threat → many audiences → manual rewriting

---

### Slide 3 — The Solution (45 sec)
**Say:**
> "Security Copilot is an end-to-end pipeline with a human in the loop. It **collects** from trusted RSS sources, **verifies** each finding with AI plus live NVD/CVE validation and a trust score, **routes** only high-confidence items to analysts, and once approved, **generates** stakeholder-specific content and **publishes** it — every action logged for audit."

**On screen:** The 5-stage pipeline icons:
`Collect → Verify → Review → Generate → Publish`

---

### Slide 4 — How it works (the pipeline) (60 sec)
**Say:**
> "Here's the flow. Our RSS sources feed a collection engine that de-dupes articles. Each new article hits the **AI verification engine**, which extracts CVEs, checks them against the official NVD and CISA databases, and computes a **trust score out of 100** across six signals. Below 60, it's auto-rejected — that's the noise filter. At 60 or above, it goes to the analyst review queue. A human approves or rejects. Approved threats flow into content generation, then publishing."

**On screen (the trust-score model — 6 signals, max 100):**

| Signal | Max points | What it measures |
|--------|-----------:|------------------|
| Source reputation | 25 | How trusted the publisher is |
| AI authenticity | 20 | Does the AI think it's a real, genuine story? |
| AI credibility | 20 | Is it well-sourced and believable? |
| External validation | 20 | Confirmed by NVD (+10) and/or CISA KEV (+10)? |
| Technical evidence | 10 | CVE (+5), indicators of compromise (+3), exploit (+2) |
| Recency | 5 | How fresh is it? (≤7 days = full marks) |
| **Total** | **100** | |

> **Decision rule:** score < 60 → auto-reject · score ≥ 60 → human review queue
> (≥90 = high confidence · ≥75 = trusted · ≥60 = needs review · <60 = rejected)

**Key line to land:**
> "The AI never publishes on its own — a human analyst is always in the loop. That's by design for a security product."

*(Section 5 below explains exactly how the score is built, in plain English — use it for the deep-dive slide or for Q&A.)*

---

### Slide 5 — The differentiator: one threat, many audiences (45 sec)
**Say:**
> "This is our favorite part. From a single approved threat, Security Copilot generates five different formats: an **executive brief** for leadership, a **customer advisory** for clients, a **technical analysis** for engineers, a **newsletter** entry, and a **social post**. Same facts, right voice for each audience, in seconds instead of hours."

**On screen:** Fan-out diagram — 1 threat → [Exec brief · Customer advisory · Technical analysis · Newsletter · Social post]

---

### Slide 6 — Tech & Architecture (40 sec)
**Say:**
> "Built on a clean, layered architecture. **FastAPI + PostgreSQL** backend with a repository/service pattern, **React + TypeScript + Material UI** frontend, **OpenAI** for verification and content — with a heuristic fallback so it works even without an API key. **JWT auth with role-based access** for Admin, Analyst, and Viewer, plus a background **APScheduler** worker that polls feeds automatically. Everything's containerized — one `docker compose up` and it runs."

**On screen:**
- Backend: FastAPI · SQLAlchemy · PostgreSQL · Alembic · APScheduler
- Frontend: React · TypeScript · Material UI · Redux · TanStack Query
- AI: OpenAI (configurable, heuristic fallback)
- Security: JWT · RBAC · full audit logging
- Live integrations: RSS feeds · NVD CVE lookup

---

### Slide 7 — Demo (transition)
**Say:**
> "Let me show you the real thing."

→ Switch to the live app. (See Section 2 below.)

---

### Slide 8 — Impact / Close (30 sec)
**Say:**
> "Security Copilot turns hours of manual triage and writing into minutes, while keeping a human and a full audit trail in the loop. It's the difference between reacting to threats late and communicating them clearly the moment they're verified. Thank you — happy to take questions."

**On screen:**
- ⏱️ Hours → minutes per threat
- ✅ Human-in-the-loop + full audit trail
- 🎯 Right message, right audience, instantly

---

## 2. Live demo walkthrough (2–3 min)

**Setup before you present:**
```bash
cd security-copilot
cp .env.example .env        # optional: add OPENAI_API_KEY for live AI (else heuristic fallback)
docker compose up --build
```
- Frontend: http://localhost:3000
- API docs (backup demo): http://localhost:8000/docs
- **Login —** Email: `admin@securitycopilot.dev` · Password: `Admin123!`

> ⚠️ **Pre-demo checklist:** Start the stack 5+ minutes early. Run a collection once beforehand so the queue already has data. Have the `/docs` page open in a second tab as a fallback if the UI misbehaves. Keep your trust-score slide visible while you talk through the demo.

**Demo path (follow the menu in this order):**

1. **Login** → land on `/dashboard`
   > "This is the analyst's home — live stats on collection, trust distribution, and source performance."

2. **Sources** (`/sources`, admin only)
   > "Here we manage trusted RSS sources — The Hacker News, BleepingComputer, SecurityWeek. I'll trigger a manual collection..." → click collect.
   > "The background worker also does this automatically every 60 minutes."

3. **Intelligence list** (`/intelligence`)
   > "Collected articles. Notice each one has a trust score — the AI already filtered out the low-confidence noise." → open one item (`/intelligence/:id`).
   > "Here's the AI verification: extracted CVE, NVD validation, severity, business impact, recommended actions."

4. **Review queue** (`/review`, analyst/admin)
   > "Only items scoring 60+ reach here. This is the human-in-the-loop step." → open one (`/review/:id`) → **Approve**.

5. **Content** (`/content`)
   > "Now the magic — from this one approved threat I generate an executive brief... a customer advisory... a technical analysis." → generate and show one or two.

6. **Publishing** (`/publishing-channels` or `/client-mails`)
   > "Approved content gets published to channels or emailed to clients, with a publish history."

7. **Audit logs** (`/audit`, admin) — *optional, only if time allows*
   > "And every action — every approval, every publish — is logged. Critical for a security product."

**If a step breaks:** fall back to **http://localhost:8000/docs** and show the live API responding (e.g., `POST /api/v1/collector/collect-all`, then `GET /api/v1/articles`). It proves the backend works even if the UI stalls.

---

## 2b. Our news sources (where the intelligence comes from)

We don't scrape the whole internet — we pull from a curated set of **trusted, well-known security publishers**, plus official government/vendor databases for fact-checking. There are two kinds:

### A. News & blog feeds (the raw stories we collect)

These 8 sources are seeded into the platform out of the box. Admins can add or remove more from the **Sources** page.

| # | Source | Type | Why we trust it |
|---|--------|------|-----------------|
| 1 | **The Hacker News** | News feed | One of the largest cybersecurity news outlets |
| 2 | **BleepingComputer** | News feed | Breaks a lot of ransomware/breach stories first |
| 3 | **SecurityWeek** | News feed | Established enterprise-security news |
| 4 | **Dark Reading** | News feed | Long-running, analyst-grade security journalism |
| 5 | **Krebs on Security** | News feed | Brian Krebs — respected investigative reporting |
| 6 | **CrowdStrike Blog** | Vendor blog | Threat research from a top EDR vendor |
| 7 | **SentinelOne Blog** | Vendor blog | Malware/threat-actor research |
| 8 | **Microsoft Security Blog** | Vendor blog | Official Microsoft security advisories & research |

> They're pulled as **RSS feeds** — a standard, machine-readable format every publisher offers. A background worker re-checks them automatically (and analysts can hit "collect" manually).

### B. Official databases (used to *fact-check*, not to collect news)

When a story mentions a vulnerability, we confirm it against the **authoritative, government-run sources** — this is what makes us more than a news aggregator:

| Source | What it is | How we use it |
|--------|-----------|---------------|
| **NVD** (NIST National Vulnerability Database) | The US government's official list of every known software vulnerability (CVE) | We look up the CVE the article mentions — does it actually exist? |
| **CISA KEV** (Known Exploited Vulnerabilities) | CISA's official list of vulns *currently being exploited by attackers* | If the CVE is on this list, it's a confirmed, active threat — big trust boost |

*(The platform also has adapters for GitHub Security Advisories, NVD, CISA, and national CERT feeds for pulling structured threat events directly.)*

**One-liner if a judge asks:**
> "We collect from trusted security publishers like The Hacker News, BleepingComputer, Krebs, and vendor blogs from Microsoft, CrowdStrike and SentinelOne — then we fact-check every vulnerability against the official US government NVD and CISA databases."

---

## 2c. How the validation / trust score works — in plain English

Think of the trust score like a **credit score for a news story**. Every article starts at 0 and earns points across **six checks**. The maximum is **100**. The more independent evidence that the story is real and serious, the higher it climbs.

Here's each check, explained simply:

**1. Who's saying it? — "Source reputation" (up to 25 points)**
> Is this from a source we trust? A government agency (CISA/NVD) or a top vendor (Microsoft) earns the most points. A well-known news site (The Hacker News, BleepingComputer) earns a lot. An unknown blog earns almost nothing.
> *Like trusting a doctor's diagnosis more than a stranger's guess.*

**2. Does the AI think it's genuine? — "AI authenticity" (up to 20 points)**
> Our AI reads the article and rates 0–100 how authentic it looks — is it a real security story, or spam/clickbait/marketing fluff? We convert that rating into up to 20 points.

**3. Is it believable and well-sourced? — "AI credibility" (up to 20 points)**
> The AI also rates how credible the *content* is — does it cite evidence, name the affected products, sound like real reporting? Again converted into up to 20 points.

**4. Can we confirm it officially? — "External validation" (up to 20 points)** ← *the important one*
> This is the fact-check. We take the CVE (the vulnerability ID, like `CVE-2024-1234`) from the article and:
> - Look it up in **NVD** — if it's a real, registered vulnerability → **+10 points**
> - Check **CISA's KEV list** — if attackers are *actively exploiting* it right now → **+10 points**
> *This is what separates a real threat from a rumor. The article can't fake this — either the government database confirms it or it doesn't.*

**5. Is there hard technical proof? — "Technical evidence" (up to 10 points)**
> We scan the text for concrete attack details:
> - Mentions a CVE → **+5**
> - Contains "indicators of compromise" (malicious IPs, file hashes, C2 servers) → **+3**
> - Mentions a working exploit / proof-of-concept / "actively exploited" → **+2**
> *More technical detail = more likely it's a genuine, actionable threat.*

**6. Is it fresh? — "Recency" (up to 5 points)**
> Newer = more useful. Published in the last week gets the full 5 points; it scales down as the story ages (a year+ old gets 0).

### Adding it up

```
 Source reputation     (0–25)
 AI authenticity       (0–20)
 AI credibility        (0–20)
 External validation   (0–20)   ← NVD + CISA fact-check
 Technical evidence    (0–10)
 Recency               (0–5)
 ─────────────────────────────
 TRUST SCORE           (0–100)
```

### What the score decides

| Score | Meaning | What happens |
|------:|---------|--------------|
| **90–100** | High confidence | Goes to analyst review (flagged top-tier) |
| **75–89** | Trusted | Goes to analyst review |
| **60–74** | Needs review | Goes to analyst review |
| **Below 60** | Not trustworthy enough | **Auto-rejected** — never bothers a human |

> **The simple version to say out loud:**
> *"Every story earns points for who published it, whether our AI finds it genuine and credible, whether we can confirm the vulnerability in the official government databases, how much technical proof it has, and how recent it is — out of 100. Anything under 60 is automatically thrown out as noise; everything above goes to a human analyst. So analysts only spend time on threats that are already verified as real."*

### A quick worked example (great for the demo)

> A BleepingComputer article about an actively-exploited Microsoft flaw, `CVE-2024-XXXX`, published yesterday:
> - Source reputation (BleepingComputer): **+20**
> - AI authenticity (looks genuine, ~90/100): **+18**
> - AI credibility (well-sourced, ~85/100): **+17**
> - External validation (in NVD **+10**, on CISA KEV **+10**): **+20**
> - Technical evidence (CVE **+5**, exploit mentioned **+2**): **+7**
> - Recency (yesterday): **+5**
> - **Total = 87 → "Trusted" → straight to the analyst queue.** ✅

---

## 3. Likely judge Q&A (prep answers)

**Q: How is this different from just asking ChatGPT to summarize security news?**
> "Three things: live CVE/NVD validation so it's grounded in real vulnerability data, not hallucinated; a quantified trust score that auto-filters noise; and a human approval gate with full audit logging — which a raw LLM can't give you."

**Q: What if the AI is wrong?**
> "It never publishes autonomously. The AI scores and drafts; a human analyst approves before anything goes out. And it has a heuristic fallback, so it degrades gracefully without an API key."

**Q: Is the trust score just made up?**
> "No — it's a transparent weighted model across six signals: source reputation, AI authenticity, AI credibility, official NVD + CISA validation, technical evidence, and recency, capped at 100. The external-validation part is grounded in real government databases, not opinion. Anything under 60 is auto-rejected, and the source reputation weights are tunable per deployment." (See section 2c for the full breakdown.)

**Q: How does it scale / is it production-ready?**
> "Clean layered architecture (API → service → repository → ORM), fully containerized, RBAC and audit logging built in. The collector runs as a scheduled background worker. It's an MVP but the structure is production-shaped."

**Q: What would you build next?**
> "Real social-channel publishing (LinkedIn/X are abstracted today), more sources, and a feedback loop where analyst decisions retrain the trust scoring."

---

## 4. Quick reference card (keep this visible while presenting)

| Thing | Value |
|-------|-------|
| Tagline | "From raw threat noise to verified, audience-ready intelligence." |
| Login | `admin@securitycopilot.dev` / `Admin123!` |
| Frontend | http://localhost:3000 |
| API docs (fallback) | http://localhost:8000/docs |
| Pipeline | Collect → Verify → Review → Generate → Publish |
| Trust threshold | < 60 auto-reject · ≥ 60 human review |
| Roles | Admin · Analyst · Viewer |
| Stack | FastAPI · PostgreSQL · React/TS · MUI · OpenAI · JWT/RBAC |
| Killer feature | 1 threat → 5 audience-specific content formats |
| Closing number | Hours → minutes, human-in-the-loop |
