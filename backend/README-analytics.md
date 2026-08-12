# Visitor analytics

Counts page views in the admin console under **Traffic**. First-party: the beacon posts to this
API, so no third-party script is loaded and the site's CSP does not need to be opened up.

## What is stored

`PageView` holds a path, a country code, a referrer host and a `visitorHash`. **No IP address is
written.** The hash is `sha256(secret + UTC date + ip + user agent)`, so it counts a person once
per day and cannot be matched across days — the salt changes at midnight. That is deliberate: it
buys a "visitors" number without the table becoming a record of who visited.

Set `ANALYTICS_SALT` to a long random string in production. Without it a fresh salt is generated
per process, which is still safe but resets the day's visitor count on every restart.

## Country lookup (optional)

Country is resolved server-side from the request IP. Until a database is installed, every view is
filed as unknown and the rest of the section works normally.

GeoLite2 is free but needs a MaxMind account, and its licence forbids redistributing the data, so
the table is built at deploy time rather than committed:

1. Create a free account at maxmind.com and generate a licence key.
2. Download **GeoLite2 Country: CSV Format** and unzip it.
3. `node scripts/build-geo-country-db.mjs <unzipped-dir> geo/country-ranges.tsv`

Point `GEO_COUNTRY_DB` at the file if you put it elsewhere. To do this on Render, add the download
and build step to `buildCommand` with the licence key as an environment variable.

IPv4 only. IPv6 visitors are filed as unknown rather than guessed at.

## Limits worth knowing

- A JavaScript beacon misses visitors who block scripts, and crawlers that do not run JS never
  appear — which is usually what you want, but it means these numbers are lower than raw server
  logs.
- Visitors sending Do Not Track or Global Privacy Control are not counted at all.
- Staff sessions are skipped, so the operations team refreshing the console does not inflate it.
