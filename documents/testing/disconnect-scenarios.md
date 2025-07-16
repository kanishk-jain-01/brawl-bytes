# Disconnect Handling Test Scenarios

This document outlines test scenarios for the disconnect handling and reconnection logic implemented in tasks 5.7.1-5.7.5.

## Test Environment Setup

### Prerequisites
- Backend server running on port 3001
- Frontend client(s) connected
- Game room created with 2 players
- Configurable timeout settings available

### Configuration Testing
Test different timeout configurations:
- Short grace period (5 seconds)
- Long grace period (60 seconds)
- Short max reconnection time (30 seconds)
- Long max reconnection time (5 minutes)
- Different max disconnect counts (1, 3, 5, 10)
- Auto-cleanup enabled/disabled

## Basic Disconnect Scenarios

### 1. Single Player Disconnect During Lobby
- **Setup**: 2 players in waiting room
- **Action**: Player 1 disconnects (close browser/network)
- **Expected**: 
  - Player 2 sees disconnect notification
  - Room remains open for grace period
  - No game pause (game not started)

### 2. Single Player Disconnect During Game
- **Setup**: Active game with 2 players
- **Action**: Player 1 disconnects
- **Expected**:
  - Game pauses immediately
  - Pause overlay shows for remaining player
  - Disconnected player gets grace period to reconnect
  - Physics and timers paused

### 3. Single Player Reconnect Within Grace Period
- **Setup**: Player disconnected during game
- **Action**: Player reconnects within 30 seconds
- **Expected**:
  - Game resumes automatically
  - Pause overlay disappears
  - Player state synchronized
  - Game continues from pause point

### 4. Single Player Fails to Reconnect (Timeout)
- **Setup**: Player disconnected during game
- **Action**: Wait for grace period to expire
- **Expected**:
  - Player removed from room
  - Game ends with remaining player as winner
  - Room cleanup if auto-cleanup enabled

## Multiple Disconnect Scenarios

### 5. Both Players Disconnect Simultaneously
- **Setup**: Active game with 2 players
- **Action**: Both players disconnect at same time
- **Expected**:
  - Game pauses
  - Room scheduled for cleanup after max reconnection time
  - Both players get grace period

### 6. Sequential Disconnects
- **Setup**: Active game with 2 players
- **Action**: Player 1 disconnects, then Player 2 disconnects 10 seconds later
- **Expected**:
  - Game pauses on first disconnect
  - Second disconnect triggers room cleanup scheduling
  - Both timeouts tracked independently

### 7. One Player Reconnects, Other Doesn't
- **Setup**: Both players disconnected
- **Action**: Player 1 reconnects, Player 2 times out
- **Expected**:
  - Game ends when Player 2 times out
  - Player 1 declared winner
  - Room cleanup cancelled and re-initiated

## Reconnection Edge Cases

### 8. Multiple Disconnects by Same Player
- **Setup**: Game in progress
- **Action**: Same player disconnects and reconnects multiple times
- **Expected**:
  - Disconnect count increments each time
  - Exponential backoff applied on frontend
  - Player removed after max disconnect count reached

### 9. Reconnect After Game End
- **Setup**: Player disconnected, game ended due to timeout
- **Action**: Disconnected player tries to reconnect
- **Expected**:
  - Reconnection rejected (room no longer exists or game ended)
  - Player redirected to main menu

### 10. Rapid Disconnect/Reconnect Cycles
- **Setup**: Game in progress
- **Action**: Player rapidly disconnects and reconnects (< 1 second cycles)
- **Expected**:
  - System handles gracefully without crashes
  - Timeouts properly cleared and reset
  - Game state remains consistent

## Total Reconnection Time Scenarios

### 11. Exceed Max Reconnection Time
- **Setup**: Player with previous disconnect history
- **Action**: Disconnect when total time would exceed max (2 minutes)
- **Expected**:
  - Player removed immediately
  - No grace period given
  - Game ends or continues with remaining players

### 12. Multiple Short Disconnects Within Limit
- **Setup**: Player disconnects multiple times for short periods
- **Action**: Each disconnect is 10 seconds, total under 2 minutes
- **Expected**:
  - Each disconnect gets grace period
  - Total time tracked across disconnects
  - Player not removed until limit exceeded

## Room Cleanup Scenarios

### 13. Auto-Cleanup After All Players Disconnect
- **Setup**: Game room with auto-cleanup enabled
- **Action**: All players disconnect and don't reconnect
- **Expected**:
  - Room scheduled for cleanup after max reconnection time
  - Room destroyed and removed from active rooms
  - Resources properly freed

### 14. Cleanup Cancellation on Reconnect
- **Setup**: Room scheduled for cleanup (all players disconnected)
- **Action**: One player reconnects before cleanup
- **Expected**:
  - Cleanup cancelled
  - Room remains active
  - Player successfully reconnected

### 15. Manual Room Cleanup
- **Setup**: Room with disconnected players
- **Action**: Force cleanup via admin command
- **Expected**:
  - All timeouts cleared
  - Players removed
  - Room destroyed immediately

## Network Condition Testing

### 16. Poor Network Connection
- **Setup**: Simulate unstable network (packet loss, high latency)
- **Action**: Player experiences intermittent connectivity
- **Expected**:
  - System distinguishes between poor connection and disconnect
  - Appropriate handling without false disconnects

### 17. Graceful vs Ungraceful Disconnects
- **Setup**: Game in progress
- **Action**: Test both browser close (graceful) and network unplugging (ungraceful)
- **Expected**:
  - Both handled identically
  - Same timeout and cleanup behavior

## Frontend UI Testing

### 18. Connection Status Display
- **Setup**: Various connection states
- **Action**: Monitor connection status display component
- **Expected**:
  - Accurate status updates
  - Proper reconnection progress indication
  - Auto-hide on successful connection

### 19. Pause Overlay Functionality
- **Setup**: Game paused due to disconnect
- **Action**: Verify pause overlay appearance and behavior
- **Expected**:
  - Overlay shows reason for pause
  - Waiting message displayed
  - Proper cleanup when game resumes

### 20. Player Disconnect Notifications
- **Setup**: Multiple players in game
- **Action**: One player disconnects
- **Expected**:
  - Other players see notification
  - Notification shows grace period countdown
  - Welcome back message on reconnect

## Performance and Stress Testing

### 21. Many Simultaneous Disconnects
- **Setup**: Multiple game rooms with players
- **Action**: Simulate server restart or network outage
- **Expected**:
  - Server handles multiple disconnects gracefully
  - No memory leaks or resource issues
  - Proper cleanup of all resources

### 22. Long-Duration Disconnect Tracking
- **Setup**: Game with extended match time
- **Action**: Track disconnects over long period (hours)
- **Expected**:
  - Timeouts and counters work correctly over time
  - No integer overflow or precision issues

## Error Handling

### 23. Invalid Reconnection Attempts
- **Setup**: Various invalid states
- **Action**: Attempt reconnection with invalid userId, expired room, etc.
- **Expected**:
  - Proper error responses
  - No server crashes
  - Clear error messages to client

### 24. Server Restart Scenario
- **Setup**: Active games with players
- **Action**: Restart backend server
- **Expected**:
  - Clients detect disconnection
  - Reconnection attempts with exponential backoff
  - Graceful handling of room state loss

## Configuration Edge Cases

### 25. Zero/Negative Timeout Values
- **Setup**: Configure invalid timeout values
- **Action**: Create room with zero or negative timeouts
- **Expected**:
  - Sensible defaults applied
  - No crashes or undefined behavior

### 26. Very Large Timeout Values
- **Setup**: Configure extremely large timeout values
- **Action**: Test with timeouts > 1 hour
- **Expected**:
  - System handles large timeouts correctly
  - No integer overflow issues

## Success Criteria

For each test scenario:
- [ ] No server crashes or unhandled errors
- [ ] Consistent game state across all clients
- [ ] Proper resource cleanup (no memory leaks)
- [ ] User-friendly error messages and feedback
- [ ] Correct timeout and counter behavior
- [ ] Appropriate game flow (pause/resume/end)

## Manual Testing Checklist

### Development Testing
- [ ] Test with browser dev tools (network throttling)
- [ ] Test with multiple browser tabs/windows
- [ ] Test browser refresh scenarios
- [ ] Test with different browsers

### Network Testing
- [ ] Test on different network types (WiFi, mobile, ethernet)
- [ ] Test with VPN connections
- [ ] Test with proxy servers
- [ ] Test with firewall restrictions

### Device Testing
- [ ] Test on different devices (desktop, mobile, tablet)
- [ ] Test with different screen sizes
- [ ] Test with different input methods

## Automated Testing Recommendations

Consider implementing automated tests for:
- Unit tests for GameRoom disconnect handling logic
- Integration tests for Socket.io connection management
- End-to-end tests for critical user flows
- Load tests for multiple simultaneous disconnects
- Memory leak detection tests

## Monitoring and Observability

Implement logging and metrics for:
- Disconnect/reconnect rates
- Average reconnection time
- Timeout occurrences
- Room cleanup frequency
- Error rates by scenario type