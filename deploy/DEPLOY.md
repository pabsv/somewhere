# Flight Scraper — Linux deploy runbook (StudentSpot box)

MVP goal: scrape EIN / AMS / BRU / CRL → all 230 pool destinations, tiered cadence,
6-month lookahead, spread across the full 24h day, on the Linux box that
runs StudentSpot/DormSpot. **DormSpot has absolute priority** — the flight scraper is
installed as a low-priority systemd service that yields CPU/IO under contention and
shares no local resources (DB is Atlas/cloud).

## Target environment (from deploy/*.service)
- User: `pablo`
- Repo path: `/mnt/hdd/flight-scraper`
- venv: `/mnt/hdd/flight-scraper/.venv`
- Egress: NordVPN (`nordvpnd.service`)
- DB: MongoDB Atlas (cluster `flightinitialsetup`, db `flight_scraper`)

## DormSpot protection (already encoded in flight-scraper.service)
- `Nice=10`, `CPUWeight=20` (StudentSpot is default 100 → flights gets ~1/5 share)
- `IOWeight=20`, `CPUQuota=150%`, `MemoryHigh=512M`, `MemoryMax=1G`
- `After=network-online.target nordvpnd.service` — won't start before VPN is up
- Never modifies StudentSpot units, files, or ports

## Scheduling model (no cron needed)
- `flight-scraper.service` runs continuously; the scheduler **runs 24h (window 00:00–24:00 since 2026-07-14)**
  on its own (`pool_scheduler.in_active_window`), so a single long-running service is enough.
- `flight-scraper-restart.timer` fires a clean restart at 07:10 daily (margin after the
  box wakes 07:00 and StudentSpot starts 07:05). Handles "PC turns on whenever".

---

## Pre-deploy SSH recon (run first, verifies assumptions)
```bash
ssh pablo@<box>            # find host via: tailscale status
# then on the box:
whoami; uname -a
python3 --version          # need 3.9+
ls -ld /mnt/hdd /mnt/hdd/flight-scraper 2>/dev/null
df -h /mnt/hdd
systemctl is-active nordvpnd 2>/dev/null; nordvpn status 2>/dev/null
systemctl list-units --type=service | grep -iE 'student|dorm|spot'   # confirm StudentSpot unit name
systemctl status flight-scraper 2>/dev/null   # is anything already installed?
```

## Code transfer (decide after recon)
- **If repo already at /mnt/hdd/flight-scraper:** `git pull` (after we commit+push the
  origins→4 / window→180 edits) — reproducible, preferred long-term.
- **If not present:** `git clone https://github.com/pabsv/somewhere.git /mnt/hdd/flight-scraper`
- **Quick path (no commit):** `rsync` the local working tree over Tailscale SSH.

## Install
```bash
cd /mnt/hdd/flight-scraper
# create .env with the Atlas MONGODB_URI (see .env.example)
bash deploy/install.sh        # venv, deps, indexes, seed, smoke test, systemd enable
```

## Verify
```bash
systemctl status flight-scraper --no-pager
journalctl -u flight-scraper -f                       # watch live slots
.venv/bin/python -m scripts.seed_targets --stats      # pool counts
.venv/bin/python -m scheduler.pool_scheduler --dry-run # next 20 due routes
```
Then confirm in Atlas that the `flights` and `scrape_runs` collections are filling.

## Rollback / pause
```bash
sudo systemctl disable --now flight-scraper.service flight-scraper-restart.timer
# StudentSpot is untouched throughout.
```

## Pool math (4 origins, tiered, 180-day window)
- 920 routes total (4 × 230). Daily scrape load ≈ 290/day (A daily, B every 3d, C weekly)
  vs 480 slots/day at 2-min cadence — comfortable headroom. Initial backlog of ~920
  never-scraped routes clears in ~2 days.
- ~17 fli HTTP calls per route per cycle (2 one-way SearchDates sweeps ≈ 7 calls + top-10 details, max 2 per departure date).
