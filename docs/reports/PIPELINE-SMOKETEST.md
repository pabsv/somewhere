# Pipeline Smoke Test

Date: 2026-07-21

## Command 1

```
/mnt/hdd/flight-scraper/.venv/bin/python -c "import fli, pymongo, dotenv; print('deps ok')"
```

Output:

```
deps ok
```

## Command 2

```
/mnt/hdd/flight-scraper/.venv/bin/python -c "from dotenv import load_dotenv; load_dotenv(); import os; from pymongo import MongoClient; db=MongoClient(os.getenv('MONGODB_URI'))['flight_scraper']; print('oneway_fares docs:', db.oneway_fares.count_documents({})); print('CRL-MAN:', bool(db.oneway_fares.find_one({'leg_key':'CRL-MAN'})))"
```

Output:

```
oneway_fares docs: 1079
CRL-MAN: True
```

## frontend/lib/openjaw-core.ts — line 14

```
const MIN_LEG_PRICE = 1;
```

PIPELINE_OK
