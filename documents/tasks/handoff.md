# Handoff – Front-End Authentication (Task **4.10**)

*Brawl Bytes – September 2025*

---

## 1. Objective
Implement a lightweight but production-grade authentication flow on the **frontend** that interoperates with the existing backend JWT system.  The goal is to unblock multiplayer testing by ensuring every browser tab receives a valid `authenticate(token)` before entering the lobby.

Task 4.10 is **mostly complete**.  The remaining effort is small and well-scoped (logout + tests).  Below is everything you need to finish the job quickly.

---

## 2. What's Already Done ✅

| Sub-Task | Status | Notes |
| -------- | ------ | ----- |
| **4.10.1** Auth API wrapper | **Complete** | `frontend/src/api/auth.ts` – helpers for `login`, `register`, `refreshToken`, plus token storage utilities. Uses `axios`, added to `package.json`. |
| **4.10.2** LoginScene UI | **Complete** | `frontend/src/scenes/LoginScene.ts` – HTML overlay with Login / Register toggle. Stores token on success and authenticates socket. |
| **4.10.3** Token storage & auto-auth | **Complete** | Token saved in `localStorage` under `brawlbytes_access_token`.  `BootScene` routes to Menu vs Login based on token.  `main.ts` auto-authenticates socket on connect. |
| **4.10.4** Socket.io `authenticate(token)` | **Complete** | Implemented in `main.ts` & `LoginScene.ts`. |
| **4.10.5** Logout flow | **⚠️ Pending** | Needs simple menu button to clear token & return to `LOGIN_SCENE`. |
| **4.10.6** Front-end auth unit tests | **⚠️ Pending** | Jest tests for `auth.ts` + LoginScene happy-path. |

Other changes:

* Added `axios` + `@types/axios` dependencies.
* Updated ESLint & TS passes (0 errors; ~190 warnings remain from legacy code).

---

## 3. Folder & File Map

```text
frontend/
  src/api/auth.ts           ← REST helpers + token utils (done)
  src/scenes/LoginScene.ts  ← New scene (done)
  src/scenes/BootScene.ts   ← Redirect logic added (done)
  src/main.ts               ← Socket init & auto-auth (done)
  src/scenes/MenuScene.ts   ← TODO: add "Logout" option
```

Token key constant: `brawlbytes_access_token` (defined in `auth.ts`).

Env var: `VITE_API_URL` (defaults to `http://localhost:3001`).

---

## 4. Remaining Work ⚒️

### 4.10.5 Logout Flow
1. **Add a Menu option** inside `MenuScene` (or a small button in HUD) labelled *Logout*.
2. Action: 
   ```ts
   import { clearToken } from '@/api/auth';

   clearToken();
   getSocketManager().disconnect(); // optional – will auto-reconnect on Login
   this.scene.start('LOGIN_SCENE');
   ```
3. Optional: emit a toast to confirm logout.

### 4.10.6 Unit Tests
1. `frontend/src/__tests__/auth/AuthApi.test.ts`
   * Mock axios.
   * Test success + failure for `login` & `register`.
2. `frontend/src/__tests__/scenes/LoginScene.test.ts`
   * Render scene with Phaser Test Harness (see existing scene tests).
   * Simulate form submit → expect `storeToken` called and scene switch to Menu.

Both test suites should pass `npm run test`.

---

## 5. How to Run & Verify

```bash
# 1. Backend (needs DB + migrations already set up)
cd backend && npm run dev

# 2. Frontend
cd frontend
npm install           # already run, but ensure deps
npm run dev           # Vite on http://localhost:5173
```

Manual flow:
1. Open game → Boot → **Login** (new users can register).
2. Upon success you land on Menu → Play flow should now populate lobby.
3. Open second tab → repeat.

Run validations:
```bash
npm run typecheck   # no errors
npm run lint        # 0 errors (warnings OK)
npm run test        # should pass once you add the two suites above
```

---

## 6. Gotchas & Tips 💡

* **CORS** – backend already allows `localhost:5173` with credentials.
* **Token expiry** – `refreshToken` helper exists but is unused; okay for MVP (tokens are 24 h).
* **HTML overlay** – LoginScene injects a DOM node; remember to call `destroyForm()` in `shutdown` if you hot-reload the scene.
* **Phaser input lock** – The overlay uses native inputs; Phaser's `setInputEnabled(false)` isn't needed.
* **Socket reconnection** – If backend restarts, `socket.io-client` auto-reconnects and `main.ts`'s `connect()` promise is still resolved.  You may need to re-authenticate on `reconnect` event for prod; skip for MVP.

---

## 7. References & Docs

* `documents/authentication.md` – full backend auth spec.
* PR-level changes live in `git log --since="2025-09-01" -- frontend/src/api/auth.ts` etc.
* Task list: `documents/tasks/tasks-mvp-implementation.md`.

---

> "Prepared, you now are.  Finish the trail, swiftly you shall." – *Master Yoda* 