# 📊 Contract & Loan Flow Diagrams – Real Estate + Bridging Loan Platform (Lagos Pilot)

## 1. Overview

This document visualizes the flow of funds, contracts, and communication between all stakeholders (buyers, developers, investors, banks, and platform) in Lagos.

---

## 2. Contract & Loan Flow

```mermaid
flowchart TD
    A[Buyer / Renter] -->|Search Property| B[Platform]
    B -->|Verified Listings| C[Developer / Property Owner]
    B -->|Loan Request| D[Bank / MFI / Investor]
    D -->|Loan Approval & Disbursement| E[Escrow Wallet]
    E -->|Payment Released Upon Contract Signing| C
    B -->|Digital Contract + KYC Verification| F[Legal Validator]
    F -->|Contract Signed Confirmation| B
    B -->|Loan Repayment Schedule| E
    E -->|Repayment Tracking & Investor Returns| D
