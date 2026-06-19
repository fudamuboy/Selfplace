# Selfplace AI Architectural Governance Rule

This document defines the permanent, system-wide engineering principles and governance rules for the evolution of Selfplace.

---

## 🧠 AI-First Architecture Principle

From now on, every new feature, module, database table, workflow, or behavioral system added to Selfplace must be evaluated for AI integration before implementation.

Whenever a new feature is proposed, the implementation review must answer:

1. **AI Awareness:** Should the AI be aware of this feature?
2. **Individual Dossier:** Should this feature contribute to the Individual Dossier?
3. **Relationship Dossier:** Should this feature contribute to the Shared Relationship Dossier?
4. **Memory Generation:** Should this feature generate memories?
5. **Relationship Events:** Should this feature generate relationship events?
6. **Conversation Modes:** Should this feature influence conversation modes?
7. **Insights & Recommendations:** Should this feature affect insights or recommendations?
8. **Privacy Controls:** Are privacy controls required for this feature?

---

## 🔒 Stability Requirement

Bug fixes, refactors, optimizations, and feature additions must not silently bypass or disconnect the AI architecture.

All changes should preserve the integrity of the following layers:

* **Privacy Layer:** Ensuring user privacy preferences (e.g., `exclude_ai_chat`, `exclude_journals`) are strictly enforced at all entry points.
* **Memory Layer:** Retaining historical summaries, behavioral patterns, and memory decay rules.
* **Event Layer:** Generating, tracking, and prioritizing timeline and active relationship events.
* **Individual Dossier (Layer 1):** Identity-level details, zodiac energy, mood history, and recent user activities.
* **Relationship Dossier (Layer 2):** Relationship weather, shared rituals, milestones, garden level, and closeness drift.
* **Conversation Intent Layer (Layer 3):** Support, Reflection, and Companion modes (with Curiosity-First directives).

---

## 🔌 Extension Rule

When new functionality is introduced:

* **Extend** the AI architecture.
* Do **not** replace the AI architecture.
* Do **not** create isolated systems that the AI cannot understand.

Every major feature should either:

* **Option A:** Integrate directly into the existing AI ecosystem.
* **Option B:** Explicitly document (in its implementation plan and source files) why it remains outside the AI ecosystem.

---

## 📈 Architectural Goal

Selfplace AI should continuously evolve together with the application. The AI should never become disconnected from new user activities, new relationship systems, or new personal growth features.

* The application grows.
* **The AI grows with it.**

---

## 🛡️ AI Impact Assessment

### 1. Purpose & Domain of Application
Selfplace AI operates strictly as an **emotional companion and self-reflection facilitator**. It is designed to assist users in building self-awareness and understanding relationship dynamics.
* **Safety Boundary:** The AI is **not** a clinical diagnostic tool, therapist, or psychiatric coach. If crisis, distress, or clinical anxiety keywords are detected, the system transitions to a supportive listener mode rather than offering actionable advice.

### 2. Privacy & Data Minimization
All user-generated inputs are classified and protected through strict gating:
* **Private Conversations:** Excluded from the shared connection memory if `exclude_ai_chat` is enabled.
* **Journal Data:** Private journals are strictly gated. Only compressed high-level themes (~50 tokens) are exposed, never raw journal texts.
* **Consent Controls:** Users retain individual granular controls over what metrics (check-ins, cards, personality profile, journals) are utilized by the context builder.

### 3. Risk Mitigation & Guardrails
* **Hallucination Control:** System instructions restrict the AI from claiming historical occurrences not explicitly recorded in the dossiers.
* **Co-Dependency Prevention:** In Companion Mode, the AI relies on a **Curiosity-First** approach. It avoids acting as a constant solver of the user's problems, instead redirecting conversation to the user's hobbies, memories, and personal growth interests.

### 4. Data Lifecycle & Memory Decay
To maintain performance and keep context budgets light, data decays over time:
* **Journal Themes:** Automatically deleted from persistent database records after 14 days of journal inactivity.
* **Memory Surfacing Cooldowns:** Surfaced memories are cooldown-restricted (e.g., 12 hours, 1 day, 3 days based on frequency).
* **Memory Auto-Retirement:** Any memory referenced 3 times is permanently retired from the active prompt context to prevent repetitive feedback.
