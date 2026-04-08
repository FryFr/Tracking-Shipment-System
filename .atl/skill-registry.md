# Skill Registry — Dynapro Tracking System
Generated: 2026-04-06

## Project Context
- **Stack**: React 19, TypeScript 5.9, Vite 7, Tailwind CSS 3, Firebase (Auth + Firestore + Hosting)
- **State**: Local React state (useState/useEffect) — no Zustand
- **Styling**: Tailwind CSS 3 (NOT v4)
- **Node**: v24.13.0

## User Skills

| Skill | Trigger |
|-------|---------|
| [react-19](~/.claude/skills/react-19/SKILL.md) | When writing React components — no useMemo/useCallback needed |
| [typescript](~/.claude/skills/typescript/SKILL.md) | When writing TypeScript code — types, interfaces, generics |
| [tailwind-4](~/.claude/skills/tailwind-4/SKILL.md) | When styling with Tailwind — cn(), theme variables |
| [github-pr](~/.claude/skills/github-pr/SKILL.md) | When creating PRs or writing PR descriptions |
| [branch-pr](~/.claude/skills/branch-pr/SKILL.md) | When creating a pull request or preparing changes for review |
| [skill-creator](~/.claude/skills/skill-creator/SKILL.md) | When creating new agent skills |
| [playwright](~/.claude/skills/playwright/SKILL.md) | When writing E2E tests (not currently installed) |
| [zod-4](~/.claude/skills/zod-4/SKILL.md) | When using Zod for validation (not currently installed) |

## Compact Rules

### react-19
- No manual useMemo/useCallback — React Compiler handles it
- Use React 19 `use()` hook for promises/context
- Server Components are default in Next.js but NOT in this Vite/SPA setup
- Keep components in src/components/, hooks in src/hooks/

### typescript
- Strict mode implied — use explicit types at module boundaries
- Prefer `interface` for object shapes, `type` for unions/intersections
- No `any` — use `unknown` + type guards when needed
- Export types from src/types/

### tailwind-4 (NOTE: project uses Tailwind 3, not 4)
- Use `cn()` from clsx + tailwind-merge for conditional classes
- Dark theme: bg-[#0a0a0a], bg-white/5, border-white/10 patterns
- Glassmorphism: backdrop-blur-xl, bg-white/5, border border-white/10

### github-pr / branch-pr
- Conventional commits: feat:, fix:, chore:, docs:, refactor:
- No "Co-Authored-By" attribution in commits

## Convention Files
- No CLAUDE.md at project level
- No .cursorrules
- Global CLAUDE.md: C:\Users\sebas\.claude\CLAUDE.md (voseo Spanish, senior architect tone)

## Testing Capabilities
**No test runner detected** — strict TDD mode UNAVAILABLE.
No vitest, jest, or other test frameworks installed. No test files exist.
Quality tools: ESLint (eslint.config.js), TypeScript type-check (tsc --noEmit).
