# My NAS

Turns this PC's local storage into a network-accessible file server, with a web
dashboard (upload/download/browse) and user accounts with per-folder
permissions — plus optional SMB sharing so it also shows up as a mapped
network drive on other PCs.

## First-time setup

1. Point it at your real storage location.
   Edit [server/.env](server/.env) and change `STORAGE_ROOT` to the folder you
   want to share, e.g.:
   ```
   STORAGE_ROOT=D:\Shared
   ```
   (It currently points at `server/storage`, a placeholder folder inside this
   project — fine for testing, not where you actually want your files long-term.)

2. Install dependencies (first time only):
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

3. Start it:
   ```powershell
   .\start.ps1
   ```
   This builds the web UI and starts the server on port 4000.

4. Open `http://localhost:4000` (or `http://<this-pc's-LAN-IP>:4000` from
   another device on the same network) and log in with:
   - Username: `admin`
   - Password: `admin123`

   **Change this password immediately**: click your username in the top bar
   and follow the prompts to set a new one.

## Day-to-day use

Just run `.\start.ps1` whenever you want the server up. Leave the terminal
window open — closing it stops the server. To run it in the background
permanently (so it survives reboots), see "Run as a background service" below.

Other devices reach it at `http://<this-pc's-LAN-IP>:4000` — find your IP with
`ipconfig` (look for the Wi-Fi or Ethernet adapter's IPv4 address).

## Managing users

Log in as an admin, go to **Admin** in the top bar:
- Create users with a username/password.
- Give each non-admin user one or more **allowed folders** (comma-separated,
  relative to `STORAGE_ROOT`, e.g. `/Photos, /Docs`). They'll only be able to
  see and manage those folders.
- Admins have access to everything.

## Also sharing via SMB (network drive)

The web app is one way in. If you also want the shared folder to show up as
a mapped network drive (`\\<pc-name>\Shared`) in File Explorer on other
Windows PCs, set up Windows' built-in SMB sharing on the same folder you put
in `STORAGE_ROOT`:

1. Right-click the folder (e.g. `D:\Shared`) → **Properties** → **Sharing**
   tab → **Advanced Sharing** → check **Share this folder**.
2. Click **Permissions** and grant the Windows accounts/groups you want
   access for (Read, or Read/Write as needed).
3. Ensure **Network discovery** and **File and printer sharing** are on:
   **Settings → Network & Internet → Advanced network settings → Advanced
   sharing settings**.
4. On another PC, map it: File Explorer → **This PC** → **Map network
   drive** → `\\<this-pc's-name-or-IP>\Shared`.

Note: SMB permissions are separate from this app's user accounts — SMB uses
Windows accounts, the web app uses its own login system. They both point at
the same files on disk, but access control is managed independently in each.

## Project layout

- `server/` — Express API (auth, file operations, admin) + SQLite user DB
  (`server/data/nas.sqlite`) + serves the built web UI in production.
- `client/` — React web UI (Vite).
- `server/.env` — configuration: `PORT`, `JWT_SECRET`, `STORAGE_ROOT`.

Change `JWT_SECRET` in `server/.env` to a random string before exposing this
beyond your local network.
