#!/usr/bin/env bash
#
# Flight Scraper — Linux installer for the StudentSpot/DormSpot box.
#
# Idempotent. Run as user `pablo` from the repo root (/mnt/hdd/flight-scraper).
# Installs a LOW-PRIORITY systemd service that yields CPU/IO to StudentSpot and
# never touches DormSpot's files, services, or ports. DB is MongoDB Atlas (cloud),
# so there is zero local DB contention.
#
# Steps 1-5 run as pablo. Step 6 needs sudo (systemd unit install only).
#
set -euo pipefail

REPO_DIR="/mnt/hdd/flight-scraper"
VENV="$REPO_DIR/.venv"
PYTHON="${PYTHON:-python3}"

cd "$REPO_DIR"

echo "==> 1/6  Python venv + dependencies"
if [ ! -d "$VENV" ]; then
  "$PYTHON" -m venv "$VENV"
fi
"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet -r requirements.txt

echo "==> 2/6  Checking .env"
if [ ! -f "$REPO_DIR/.env" ]; then
  echo "    ERROR: $REPO_DIR/.env missing."
  echo "    Create it from .env.example with the Atlas MONGODB_URI, then re-run."
  exit 1
fi

echo "==> 3/6  MongoDB indexes + TTLs (idempotent)"
"$VENV/bin/python" -m database.setup_indexes

echo "==> 4/6  Seeding the route pool (idempotent, staggered over 24h)"
# NOTE: --stats short-circuits and skips seeding, so it must be a separate call.
"$VENV/bin/python" -m scripts.seed_targets --stagger 1440 --prune
"$VENV/bin/python" -m scripts.seed_targets --stats

echo "==> 5/6  Smoke test: one forced end-to-end scrape (EIN->BCN -> Atlas)"
"$VENV/bin/python" -m scheduler.pool_scheduler --route EIN BCN

echo "==> 6/6  Installing systemd units (sudo)"
sudo cp deploy/flight-scraper.service          /etc/systemd/system/
sudo cp deploy/flight-scraper-restart.service  /etc/systemd/system/
sudo cp deploy/flight-scraper-restart.timer    /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now flight-scraper.service
sudo systemctl enable --now flight-scraper-restart.timer

echo
echo "Done. The scheduler is running and will idle outside 07:00-23:00 automatically."
echo "Watch it:   journalctl -u flight-scraper -f"
echo "Status:     systemctl status flight-scraper --no-pager"
echo "Pool stats: $VENV/bin/python -m scripts.seed_targets --stats"
