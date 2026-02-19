
## Rebuild Login Page — Use Supabase OAuth Directly

### Problem

The current `AuthPage.tsx` calls `lovable.auth.signInWithOAuth("google", ...)` which is a Lovable Cloud-specific helper. Since this project uses an **external Supabase** instance, Google login must go through the Supabase SDK directly via `supabase.auth.signInWithOAuth`. This is likely why Google login is not working.

### What Will Change

**1. `src/hooks/useAuth.tsx` — Add `signInWithGoogle`**

Add a `signInWithGoogle` method to the `AuthContext` interface and `AuthProvider`, using:

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: window.location.origin },
});
```

**2. `src/pages/AuthPage.tsx` — Remove Lovable Cloud dependency**

- Remove the `import { lovable } from "@/integrations/lovable/index"` import entirely.
- Replace `handleGoogleSignIn` to call `signInWithGoogle()` from `useAuth` instead.
- No visual changes — the layout, design, and all three login methods (Google, Email/Password, Anonymous) stay exactly the same.

### Technical Notes

- `signInWithOAuth` triggers a redirect to Google and back to `window.location.origin`, where Supabase picks up the session automatically via the URL hash — no additional code needed.
- The Supabase project must have Google configured in the Dashboard under Authentication → Providers (Client ID + Secret from Google Cloud Console) and the redirect URL added to the Google OAuth app. This was already communicated in the previous step.
- `useAuth` already correctly handles the session via `onAuthStateChange`, so the Google callback will be picked up automatically after redirect.

### Files to Edit

| File | Change |
|---|---|
| `src/hooks/useAuth.tsx` | Add `signInWithGoogle` to context and provider |
| `src/pages/AuthPage.tsx` | Use `signInWithGoogle` from `useAuth`; remove `lovable` import |
