# Multiplayer Movement Debugging Handoff

## Current Issue
**Problem:** Two players can join a lobby and fight, but they appear to be controlling the same sprite instance rather than separate player entities. Each player sees the other player's character, but movements are not properly synchronized between clients.

## Current Status ✅

### ✅ Fixed Issues
1. **Constants Loading System** - Completely resolved
   - Removed fallback defaults to enforce fail-fast behavior
   - Fixed flattened constant structure in database vs nested access in service
   - Added missing constants: `validation.max_ping_ms`, `physics.collision_player_radius`, `physics.collision_stage_thickness`
   - All 129 constants now load properly from YAML → Database → Service

2. **Debug Logging Infrastructure** - Fully implemented
   - Server logs: `[MOVE_IN]`, `[MOVE_OUT]`, `[MOVE_REJECT]`
   - Client logs: `[INPUT_EMIT]`, `[REMOTE_MOVE]`
   - Physics spam logs silenced (gated by `DEBUG_PHYSICS=true`)

3. **Movement Pipeline Connectivity** - Partially working
   - ✅ Frontend sends `playerInput` events with movement data
   - ✅ Backend receives movements via new `playerInput` handler in `SocketManager`
   - ✅ Movement validation system working (with some rejections due to speed limits)

### 🔍 Current Observations

**Server Logs Show:**
```
[MOVE_IN] user=b03a824d-6f14-4962-9389-b070253a66c5 room=room_xxx seq=54 pos=(920.0,1090.0)
[MOVE_IN] user=ee2f1063-68d8-47c2-950b-774419a9d106 room=room_xxx seq=12 pos=(900.0,1004.7)
[MOVE_REJECT] user=b03a824d-6f14-4962-9389-b070253a66c5 reason=Position changed too quickly
```

**What This Tells Us:**
- ✅ Both players are sending movement data to server
- ✅ Server receives and processes movement from both unique user IDs
- ⚠️ Many movements rejected due to validation (may be hampering synchronization)
- ❌ No `[MOVE_OUT]` logs visible (suggesting broadcasts aren't happening)
- ❌ No `[REMOTE_MOVE]` logs from clients (confirming no remote updates received)

## 🔍 Next Debugging Steps

### Priority 1: Fix Movement Broadcast
**Current Issue:** Server receives moves but doesn't broadcast them to other clients.

**Investigation Points:**
1. **Check if `[MOVE_OUT]` logs are being suppressed**
   - Look for the debug log in `GameRoom.handlePlayerMove()` after `broadcastToOthers()`
   - Verify `broadcastToOthers()` actually calls `broadcastToRoom()`

2. **Verify movement validation isn't blocking all broadcasts**
   - Many `[MOVE_REJECT]` logs suggest validation is too strict
   - Check if rejected moves prevent any broadcasting
   - Consider temporarily relaxing validation limits for debugging

3. **Trace the broadcast path:**
   ```
   GameRoom.handlePlayerMove() 
   → calls broadcastToOthers('playerMove', data)
   → should call broadcastToRoom() 
   → should emit to socket.io room
   → should trigger client 'playerMove' handlers
   ```

### Priority 2: Fix Client Remote Movement Reception
**Current Issue:** Clients don't show `[REMOTE_MOVE]` logs.

**Investigation Points:**
1. **Verify client event listener setup**
   - Check if `NetworkManager.handleRemotePlayerMove()` is properly bound to `'playerMove'` events
   - Confirm the event name matches what server broadcasts

2. **Check socket.io room membership**
   - Verify both clients are in the same socket.io room
   - Confirm `broadcastToOthers()` excludes sender correctly

### Priority 3: Movement Validation Tuning
**Current Issue:** Too many movement rejections may be disrupting synchronization.

**Current Validation Limits:**
- `max_position_change_per_ms`: 2.0
- `max_velocity_change_per_ms`: 10.0

**Recommended Actions:**
1. Temporarily increase limits for debugging:
   ```yaml
   validation:
     max_position_change_per_ms: 5.0
     max_velocity_change_per_ms: 20.0
   ```
2. Re-sync constants and test
3. Once synchronization works, tune limits down gradually

## 🏗️ Architecture Context

### Key Files Modified
- `backend/src/networking/SocketManager.ts` - Added `playerInput` handler routing
- `backend/src/game/GameRoom.ts` - Added debug logs, suppressed broadcast spam  
- `backend/src/services/GameConstantsService.ts` - Fixed constant structure, removed fallbacks
- `frontend/src/utils/socket.ts` - Added movement debug logging
- `frontend/src/managers/NetworkManager.ts` - Added remote movement debug logging
- `game-constants-master.yaml` - Added missing constants

### Debug Infrastructure
All debug logs use consistent prefixes:
- `[MOVE_IN]` - Server receiving movement
- `[MOVE_OUT]` - Server broadcasting movement  
- `[MOVE_REJECT]` - Server rejecting movement
- `[INPUT_EMIT]` - Client sending movement
- `[REMOTE_MOVE]` - Client receiving remote movement

### Constants System
- **Source:** `game-constants-master.yaml` (129 constants)
- **Database:** PostgreSQL via Prisma (flattened structure)
- **Service:** `GameConstantsService.getPhysicsConstants()` (nested structure)
- **Sync:** `npm run sync-constants -- --force`

## 🧪 Testing Procedure

1. **Start Backend:** `cd backend && npm run dev`
2. **Open Two Browser Tabs:** Both to `http://localhost:3000`
3. **Join Same Room:** Create lobby with one, join with other
4. **Start Game:** Both ready → game begins
5. **Move Players:** Use WASD/arrow keys on both clients
6. **Check Logs:**
   - Backend console for `[MOVE_IN]`, `[MOVE_OUT]`, `[MOVE_REJECT]`
   - Each browser console for `[INPUT_EMIT]`, `[REMOTE_MOVE]`

## 📋 Quick Commands

```bash
# Restart backend with fresh constants
cd backend
npm run sync-constants -- --force
npm run dev

# Check database constants
psql postgresql://kanishkjain@localhost:5432/brawlbytes_dev -c "SELECT category, COUNT(*) FROM game_constants GROUP BY category;"

# Enable physics debug logs
DEBUG_PHYSICS=true npm run dev
```

## 💡 Likely Root Cause

Based on current evidence, the issue is likely in the **server-to-client broadcast step**. The server receives movements from both players but fails to relay them to other clients. This could be due to:

1. **Socket.io room membership issues** - Players not in same broadcast room
2. **Event name mismatch** - Server emits `'playerMove'` but client listens for different event
3. **Validation blocking broadcasts** - Too many rejections preventing any movement propagation

The debug infrastructure is solid, so the next engineer should be able to trace the exact failure point quickly.

---
*Last updated: January 2025*
*Status: Movement reception working, broadcast/relay not working* 