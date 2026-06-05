# BusTrack Firebase Hosting Readiness

BusTrack is a static Firebase Hosting app. Deploy the repository root as the Hosting public directory.

## Primary Pages

- `index.html` - role selection
- `user.html` - passenger portal
- `driver/driver.html` - driver dashboard
- `driver/bus-operations.html` - live operations console

## Deploy

```bash
firebase deploy --only hosting
```

## Real-Device Test Pass

1. Open the HTTPS Hosting URL on a mobile browser.
2. Passenger: search a route and confirm result cards show signal, ETA, and crowd states.
3. Passenger: open a live bus, join a journey, refresh, and confirm the journey restores.
4. Driver: open a bus, start simulation mode, refresh, and confirm recovery offers resume.
5. Driver: test browser GPS on HTTPS and confirm permission errors show in the GPS debug panel.
6. Toggle airplane mode or disconnect network briefly and confirm reconnect messaging appears.
7. Open the same bus in a second driver browser and confirm the active session lock blocks it.

## Expected Production States

- `Waiting for Driver Signal` means no active/stale driver update is currently available.
- `ETA pending` means ETA is waiting for active tracking coordinates.
- `No crowd reports yet` means no active passenger journey contributors are reporting crowd status.
- `Firebase disabled` or reconnect messages mean the client could not reach Firebase or the SDK.
