# ⚠️ Risks & Challenges – Real Estate + Bridging Loan Platform

## 🚨 CRITICAL WATCH-OUT AREAS (MVP Focus)

### Watch-out #1: Regulatory & Compliance Hurdles
- **Risk:** Getting the right licenses and approvals for loan facilitation and escrow is the single biggest "go/no-go" factor
- **Impact:** A delay here can halt the entire pilot
- **Specific Challenge:** Lagos State Lands Bureau's verification process is manual and can be a significant bottleneck
- **MVP Mitigation:** 
  - Dedicated team members focused on building strong relationships with regulatory institutions
  - Clear, non-negotiable legal checklist for every property before listing as "verified"
  - Digitize the process as much as possible through our tech stack

### Watch-out #2: Trust Deficit
- **Risk:** Trust is not built on technology alone - a single bad actor getting past verification could kill the brand
- **Impact:** Brand reputation damage before market penetration
- **Specific Challenge:** Low trust, fear of scams, and fraudulent agents are major market risks
- **MVP Mitigation:**
  - Highly controlled pilot with manual verification of initial 20-50 developers
  - Explicit AI moderation from day one to detect fraud
  - All transactions routed through platform-managed escrow account
  - Prove "Finland Africa" brand promise through impeccable execution

### Watch-out #3: Financial and Operational Risks
- **Risk:** In early stages, a few loan defaults can significantly impact financial health
- **Impact:** Unpredictable process from loan application to project completion
- **Specific Challenge:** Loan defaults and cashflow mismatch with small user base
- **MVP Mitigation:**
  - Stick to niche: "small-to-mid scale developers with waiting buyers" in high-demand areas
  - Very conservative lending policy for MVP
  - Meticulously track every loan to understand repayment behavior
  - Reserve portion of revenue to cover potential defaults from start

---

## 1. Regulatory Risks

- CBN & SEC oversight → ensure licensing for loan facilitation.  
- Bureaucratic land/title registration → verification delays.  
- Legal requirements for digital contracts & escrow.  

**Mitigation:** Partner with Lagos State Lands Bureau, integrate arbitration clauses, use licensed MFIs.  

---

## 2. Market Risks

- Trust deficit → fear of scams, fake developers.  
- Low financial literacy → misunderstanding of bridging loans.  
- Competition from offline agents or WhatsApp-based deals.  

**Mitigation:** Transparent process, escrow accounts, in-app communication, early ambassadors.  

---

## 3. Operational Risks

- Title verification delays.  
- Defaults by borrowers.  
- Fraudulent developers trying to list properties.  

**Mitigation:** Small pilot loans, AI fraud detection, strong due diligence + KYC.  

---

## 4. Communication Risks

- Data privacy → storing chats, calls, media securely.  
- Call recording legality → need consent and compliance with Nigerian laws.  
- Fraud in chat/media → fake property images, off-platform payment requests.  

**Mitigation:** End-to-end encryption, conversation linked to contract IDs, AI moderation, recorded consent notices.  

---

## 5. Technical Risks

- System crashes during high traffic.  
- Integration failures (banks, KYC, escrow).  
- Data loss or breach.  

**Mitigation:** Cloud hosting, modular architecture, secure backups, audit trails.  

---

## 6. Financial Risks

- High default rates (>15%).  
- Cashflow mismatch → repayments vs. project completion.  

**Mitigation:** Risk pool fund (small % of investor returns), insurance integration, aligned repayment schedules.

---

## 7. Cost & Infrastructure Risks

### Infrastructure Cost Overruns
- **Risk:** AWS costs escalating beyond budget ($200-500/month MVP target)
- **Specific Concerns:**
  - Twilio communication costs can spike with high usage ($100-300/month)
  - Unexpected traffic spikes increasing compute costs
  - Data storage growth scaling S3 costs
- **Mitigation:** 
  - Real-time cost monitoring and alerts
  - Feature gating during pilot phase
  - Auto-scaling and usage optimization

### Third-Party Service Dependencies
- **Risk:** API rate limits and pricing changes from KYC/payment providers
- **Impact:** Service disruption or unexpected cost increases
- **Mitigation:**
  - Multiple provider options (Flutterwave, Paystack)
  - API call optimization and caching
  - Contract terms review for pricing stability

### Revenue vs. Cost Mismatch
- **Risk:** Infrastructure costs exceeding revenue in early stages
- **Impact:** Extended runway requirements, potential funding gaps
- **Mitigation:**
  - Conservative cost projections
  - Revenue tracking per transaction
  - Break-even analysis monitoring  

