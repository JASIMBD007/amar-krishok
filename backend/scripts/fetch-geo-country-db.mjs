#!/usr/bin/env node
/**
 * Downloads a free IP-to-country range table for the Traffic section.
 *
 * Uses ip-location-db's geo-whois-asn-country set, which is CC0: no account, no licence key, and
 * redistributable, unlike GeoLite2. It already ships as numeric ranges, so the conversion is only
 * commas to tabs plus a sort, which the binary search in GeoService depends on.
 *
 * Never fails the build. A deploy that cannot reach the CDN should still ship; the country column
 * simply stays empty, which is the same state as not having run this at all.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const SOURCE = "https://cdn.jsdelivr.net/npm/@ip-location-db/geo-whois-asn-country/geo-whois-asn-country-ipv4-num.csv";
const OUTPUT = process.argv[2] ?? "geo/country-ranges.tsv";

try {
  const response = await fetch(SOURCE, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const rows = [];
  for (const line of (await response.text()).split("\n")) {
    if (!line) {
      continue;
    }

    const [start, end, code] = line.split(",");
    const startIp = Number(start);
    const endIp = Number(end);
    // Two-letter codes only: the set uses ZZ-style placeholders for unallocated space.
    if (!Number.isFinite(startIp) || !Number.isFinite(endIp) || !code || code.trim().length !== 2) {
      continue;
    }

    rows.push([startIp, endIp, code.trim().toUpperCase()]);
  }

  if (rows.length === 0) {
    throw new Error("no usable rows in the downloaded set");
  }

  rows.sort((first, second) => first[0] - second[0]);

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(
    OUTPUT,
    `# ip-location-db geo-whois-asn-country (CC0). ${rows.length} IPv4 ranges.\n` +
      rows.map(([start, end, code]) => `${start}\t${end}\t${code}`).join("\n"),
    "utf8",
  );

  console.log(`Country database ready: ${rows.length} ranges at ${OUTPUT}`);
} catch (error) {
  console.warn(`Could not build the country database (${error instanceof Error ? error.message : error}).`);
  console.warn("Traffic will record views without a country. This does not fail the build.");
}
