# Setting up this NAS software on another system

This is a self-hosted NAS web app: Express + SQLite backend, React web UI.
Follow this to get it running on a new machine, or hand the "Prompt for
Claude" section at the bottom to Claude Code / Claude running on that machine
and let it do the work.

## What you need on the target system

- **Node.js v22 or newer** (the backend uses Node's built-in `node:sqlite`
  module — no native build tools required, unlike most SQLite packages).
  Check with `node -v`. Get it from https://nodejs.org if missing.
- **Git**.
- A folder on that machine you want to serve as NAS storage (can be any
  existing folder — it does not need to be empty).

## Step-by-step

### 1. Clone the repo
```bash
git clone https://github.com/asal1989/NAS-SOFTWARE.git
cd NAS-SOFTWARE
```

### 2. Install dependencies
```bash
cd server && npm install
cd ../client && npm install
cd ..
```

### 3. Configure the server
Copy the example env file and edit it:
```bash
cp server/.env.example server/.env
```
Open `server/.env` and set:
- `STORAGE_ROOT` — the real folder on **this** machine to share (e.g.
  `D:\Shared` on Windows, `/home/you/shared` on Linux/Mac).
- `JWT_SECRET` — replace with a long random string (used to sign login
  tokens). Anything unique and unguessable is fine, e.g. output of:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `PORT` — leave as `4000` unless that port is already in use.

### 4. Build the web UI
```bash
cd client && npm run build && cd ..
```

### 5. Start the server
```bash
cd server && npm start
```
It listens on `0.0.0.0:4000`, so it's reachable from other devices on the
network, not just localhost.

On Windows you can instead use the provided scripts from the repo root:
- `.\start.ps1` — builds the client and starts the server (steps 4+5 in one).
- `.\dev.ps1` — runs backend and frontend separately with hot-reload, for
  active development only.

### 6. First login
Open `http://localhost:4000` (or `http://<this-machine's-LAN-IP>:4000` from
another device) and log in:
- Username: `admin`
- Password: `admin123`

**Change it immediately** — click your username in the top bar and follow the
prompts.

### 7. Allow access from other devices on the network
The app binds to all interfaces, but the OS firewall likely blocks inbound
connections to port 4000 by default.

**Windows** (run PowerShell as Administrator):
```powershell
New-NetFirewallRule -DisplayName "NAS Server 4000" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow -Profile Any
```

**Linux (ufw)**:
```bash
sudo ufw allow 4000/tcp
```

**macOS**: System Settings → Network → Firewall → allow incoming connections
for `node` when prompted, or add a rule for port 4000.

Then find this machine's LAN IP (`ipconfig` on Windows, `ip addr` / `ifconfig`
on Linux/Mac) and connect to `http://<that-ip>:4000` from other devices.

### 8. Add users and set folder permissions
Log in as admin → **Admin** in the top bar → create users, and for each
non-admin user list the folders they're allowed to access (comma-separated,
relative to `STORAGE_ROOT`, e.g. `/Photos, /Docs`).

### 9. (Optional) Windows SMB network-drive sharing
See the "Also sharing via SMB" section in [README.md](README.md) — this
mounts the same folder as a normal Windows network drive, independent of the
web app's own login system.

## Keeping it running

`npm start` runs in the foreground — closing the terminal stops the server.
To keep it running persistently:
- **Windows**: run it via Task Scheduler (trigger: at log on, run
  `server/npm start` or the `start.ps1` script), or use a tool like
  [NSSM](https://nssm.cc/) to run it as a Windows service.
- **Linux**: use `systemd` (create a `.service` file that runs
  `npm start` in the `server` directory) or `pm2`.

## Data locations (not in git — machine-specific)

- `server/.env` — your config (storage path, secret, port).
- `server/data/nas.sqlite` — user accounts and permissions database, created
  automatically on first run.
- `server/storage/` — placeholder test folder; irrelevant once you point
  `STORAGE_ROOT` elsewhere.
- `client/dist/` — built web UI, created by `npm run build`.

---

## Prompt for Claude (paste this into Claude Code on the target machine)

```
Set up the NAS-SOFTWARE app from https://github.com/asal1989/NAS-SOFTWARE.git
on this machine. Follow SETUP.md in the repo end to end: clone it, install
server and client dependencies, create server/.env from server/.env.example
with a random JWT_SECRET, ask me which folder on this machine to use as
STORAGE_ROOT, build the client, and start the server. Then check whether this
machine's firewall needs a rule opened for port 4000 for LAN access and tell
me the exact command to run (elevated) if so. Confirm the app loads at
http://localhost:4000 before finishing, and tell me the LAN IP other devices
should use to reach it.
```
