# 🤖 AI Rules & Tech Stack Guidelines

This document outlines the technical stack and development rules for the **Instead DeFi** platform. All AI assistants and developers must adhere to these guidelines when modifying or adding code.

---

## 🚀 Tech Stack Overview

*   **Framework:** Next.js 15 (App Router) with internationalization (`next-intl`) configured under the `[locale]` dynamic route.
*   **Language:** TypeScript (strict mode) for type safety and robust code.
*   **Styling:** Tailwind CSS for utility-first styling, combined with modern CSS variables in `globals.css` for theme support (Dark/Light).
*   **Web3 & Smart Contracts:** Wagmi (v2), Viem, and RainbowKit for wallet connection and blockchain interactions. Ethers (v6) is used for utility functions like parsing/formatting units.
*   **3D & Visuals:** Three.js, `@react-three/fiber`, and `@react-three/drei` for high-performance 3D rendering.
*   **Animations:** Framer Motion for fluid UI transitions and GSAP for complex scroll-triggered animations.
*   **Database & Backend:** Supabase (PostgreSQL) for off-chain metadata, user profiles, and audit logs, plus Supabase Edge Functions for AI integrations.
*   **Icons:** Lucide React for clean, consistent, and lightweight iconography.

---

## 📐 Library Usage Rules

### 1. Routing & Navigation
*   **Rule:** Never use standard Next.js navigation imports (`next/link`, `next/navigation`).
*   **Action:** Always import `Link`, `redirect`, `usePathname`, and `useRouter` from `@/navigation` to ensure the locale prefix is preserved correctly.

### 2. Web3 & Blockchain Interactions
*   **Rule:** Use Wagmi hooks for all standard blockchain reads and writes.
*   **Action:** 
    *   Use `useReadContract` for reading data.
    *   Use `useWriteContract` and `useWaitForTransactionReceipt` for sending transactions.
    *   Use `ethers` only for formatting/parsing values (e.g., `parseUnits`, `formatEther`).

### 3. Styling & Themes
*   **Rule:** Do not hardcode colors or spacing.
*   **Action:** Use Tailwind CSS classes for layout and spacing. For colors, use the CSS variables defined in `globals.css` (e.g., `var(--bg-base)`, `var(--accent-1)`, `var(--text-muted)`) to maintain dark/light mode compatibility.

### 4. Database & Off-chain Data
*   **Rule:** Do not write raw SQL queries in the frontend.
*   **Action:** Always use the pre-configured Supabase client and helper functions in `src/lib/supabase.ts` to interact with the database.

### 5. Icons
*   **Rule:** Do not import custom SVGs or external icon packages.
*   **Action:** Always use `lucide-react` for UI icons.

---

*Follow these rules strictly to maintain code quality, performance, and consistency across the Instead DeFi platform.*