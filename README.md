# Meridian

Meridian is a governed civic intelligence system. It captures decisions, risks, and commitments from city meetings using AI ensemble pipelines, governs what happens next with deterministic engines, records every decision in an immutable audit chain, and renders role-appropriate views for inspectors, directors, council members, and the public.

## Live Demo

- Live demo: https://meridian-holdpoint.vercel.app
- Video demo: https://youtu.be/4C28pTbKbYM
- Repository: https://github.com/TDE6541/meridian
- Repository posture: this is the public GitHub repository for HackFW review. The repo includes deeper governed implementation history, but this README is the public submission front door.

## Eval Accounts

Log in at the live demo URL with Auth0 to see role-specific views. These accounts are intentional public demo eval accounts for HackFW review.

| Role | Email | Password |
| --- | --- | --- |
| Field Inspector | timdeavenport+inspector@gmail.com | Meridian2026! |
| Department Director | timdeavenport+director@gmail.com | Meridian2026! |
| Council Member | timdeavenport+council@gmail.com | Meridian2026! |
| Operations Lead | timdeavenport+operations@gmail.com | Meridian2026! |
| Public Viewer | timdeavenport+public@gmail.com | Meridian2026! |

## Built for HackFW

HackFW asks for working solutions tied to Fort Worth, reindustrialization, and convergent technology. Meridian applies convergent AI and governance infrastructure to civic permitting and infrastructure workflows: the kinds of back-office decisions that determine whether industrial projects, inspections, repairs, and public work can move safely.

The demo uses a fictional Fort Worth-style permit, Permit #4471. The point is not "AI approves permits." The point is "AI-assisted civic workflows need authority, evidence, and public accountability before action."

## The Problem

AI can summarize, draft, and recommend actions quickly. In civic workflows, speed without authority and evidence creates risk. A confident AI approval is not enough when permits, inspections, infrastructure, and public records are involved.

## What Meridian Does

Meridian is a governed civic intelligence pipeline.

It captures civic decision context, governs proposed AI-assisted actions, records the decision path, and renders the right view for the right audience.

Capture — AI ensemble pipelines, adapted from HoldPoint, ingest unstructured civic data: meeting transcripts, permit filings, inspection reports, field notes, and council sessions. The AI extracts structured decisions, risks, commitments, and action items from raw civic input.

Govern — When an AI agent tries to act on captured intelligence — approving a permit, scheduling an inspection, escalating a concern, or moving a civic workflow forward — deterministic JavaScript governance engines evaluate the action against authority, evidence, and disclosure rules. No language model decides what is allowed. The engines decide. If required authority is missing, the action holds. If required evidence is missing, the action holds.

Record — Every governance decision is recorded in an audit/proof chain: what was attempted, what was present, what was missing, and why the action was held.

Render — Different roles see different views of the same governance truth. An inspector can see inspection context. A director can see authority and approval posture. A council member can review civic status. The public can see a redacted transparency report with sensitive details withheld.

Foreman explains the recorded governance path and guides the demo narrative. It does not create governance truth or decide which actions are allowed.

The deployed demo applies this pipeline to fictional Permit #4471: a field inspector flags a structural concern during a corridor walk, an AI agent tries to approve the reconstruction package, and Meridian refuses because director-level authority and supporting field evidence are both missing.

Operating rule:

```text
No authority, no action.
No evidence, no approval.
Every decision recorded.
Every hold explained.
```

## Demo Walkthrough

The live demo is a six-act guided walkthrough:

1. Capture - permit concern and attempted action enter the system
2. Authority - director approval is required and absent
3. Governance - deterministic rules find missing authority/evidence
4. Absence - missing proof becomes a structured HOLD
5. Chain - the refusal is recorded in an audit/proof trail
6. Public - a redacted public-safe view is generated

## The Foreman Guide

Foreman is the guided explanation layer. It does not decide whether an action is allowed and does not create governance truth. Deterministic Meridian engines govern. Foreman explains the record in plain language for a city worker, reviewer, or judge.

In short: AI can explain the civic record, but deterministic governance decides whether action is allowed.

## How It Works

Meridian is designed to govern AI agents that act on civic infrastructure. In the full architecture, an AI ensemble pipeline — adapted from HoldPoint, a construction meeting intelligence system — captures decisions, risks, and commitments from city meetings: planning commissions, permitting boards, council sessions. AI agents then try to act on that captured intelligence: approving permits, scheduling inspections, escalating concerns. Meridian sits between the AI agent and the action. The AI captures and explains. The deterministic engines govern.

- React/Vite dashboard renders the proof cockpit.
- Deterministic JavaScript governance logic evaluates action posture.
- Authority and evidence checks produce HOLDs when proof is missing.
- The audit/proof chain records decisions and refusals.
- Role-aware views separate internal proof from public disclosure.
- The public-safe view redacts sensitive fields.
- AI/voice is explanatory only, not the source of governance decisions.

## Tech Stack

- React
- Vite
- TypeScript / JavaScript
- Node.js
- deterministic JavaScript governance engines
- Vercel deployment
- Auth0 demo role-session proof
- dashboard test suite
- Node test runner

## Local Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/TDE6541/meridian.git
cd meridian
npm install
npm --prefix dashboard install
```

Run the dashboard locally:

```bash
npm --prefix dashboard run dev
```

Vite will print the local dashboard URL. A pinned localhost command is also available:

```bash
npm --prefix dashboard run dev -- --host 127.0.0.1 --port 5174
```

## Running Tests

Use the repo and dashboard verification commands:

```bash
npm test
npm --prefix dashboard test
npm --prefix dashboard run typecheck
npm --prefix dashboard run build
```

## Project Structure

```text
dashboard/        deployed proof cockpit and guided demo UI
src/governance/   deterministic governance logic
src/entities/     civic entity substrate
src/integration/  corridor scenario integration proof
src/live/         local/demo live-mode proof surfaces
tests/            repo-wide proof and regression tests
docs/closeouts/   governed closeout history
```

## What This Is Not

Meridian is not a production city system, not an official Fort Worth deployment, and not legal compliance certification. It is a deployed proof cockpit demonstrating how AI-assisted civic decisions can be governed before they are allowed to move forward.

Meridian does not claim TPIA or TRAIGA certification, live Accela/GIS integration, live OpenFGA integration, live municipal infrastructure, a public portal, or replacement of city review staff. Meridian does not use AI to decide permit approvals.

## Why It Matters

Cities will use AI. Meridian demonstrates a safer operating pattern: AI can explain, but deterministic governance decides whether action is allowed.

The AI tried to act. Meridian refused. The Foreman explained why. The chain proves it. The city is safer.
