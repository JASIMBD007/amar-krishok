#!/usr/bin/env node
/**
 * Flattens MaxMind's GeoLite2 Country CSV export into the sorted range table GeoService reads.
 *
 * GeoLite2 is free but needs a MaxMind account, and its licence does not allow redistributing the
 * data, so the table is built at deploy time rather than committed here.
 *
 *   1. Sign in at maxmind.com, create a licence key.
 *   2. Download "GeoLite2 Country: CSV Format" and unzip it.
 *   3. node scripts/build-geo-country-db.mjs <unzipped-dir> geo/country-ranges.tsv
 *
 * Output is one range per line: startIp<TAB>endIp<TAB>countryCode, sorted by startIp, IPv4 only.
 * IPv6 is skipped: the reader answers null for those, which files the view as unknown rather than
 * placing it wrongly.
 */
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";

const [, , sourceDir, outputPath = "geo/country-ranges.tsv"] = process.argv;

if (!sourceDir) {
  console.error("Usage: node scripts/build-geo-country-db.mjs <geolite2-country-csv-dir> [output.tsv]");
  process.exit(1);
}

/** Reads a CSV line, honouring quoted fields — country names contain commas. */
function splitCsv(line) {
  const fields = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

async function readCsv(path, onRow) {
  const reader = createInterface({ crlfDelay: Infinity, input: createReadStream(path) });
  let header = null;

  for await (const line of reader) {
    if (!line.trim()) {
      continue;
    }

    const fields = splitCsv(line);
    if (!header) {
      header = fields.map((name) => name.trim());
      continue;
    }

    onRow(Object.fromEntries(header.map((name, index) => [name, fields[index]])));
  }
}

function cidrToRange(cidr) {
  const [address, bits] = cidr.split("/");
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return null;
  }

  const base = octets.reduce((total, octet) => total * 256 + octet, 0);
  const size = 2 ** (32 - Number(bits));
  return [base, base + size - 1];
}

const countryByGeoname = new Map();
await readCsv(join(sourceDir, "GeoLite2-Country-Locations-en.csv"), (row) => {
  if (row.geoname_id && row.country_iso_code) {
    countryByGeoname.set(row.geoname_id, row.country_iso_code);
  }
});

const ranges = [];
await readCsv(join(sourceDir, "GeoLite2-Country-Blocks-IPv4.csv"), (row) => {
  // Registered country is the fallback: some blocks are allocated but not geolocated.
  const code =
    countryByGeoname.get(row.geoname_id) ?? countryByGeoname.get(row.registered_country_geoname_id) ?? null;
  const range = code && cidrToRange(row.network);
  if (range) {
    ranges.push([range[0], range[1], code]);
  }
});

ranges.sort((first, second) => first[0] - second[0]);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `# GeoLite2 Country, flattened. ${ranges.length} IPv4 ranges. Do not commit: MaxMind's licence does not permit redistribution.\n` +
    ranges.map(([start, end, code]) => `${start}\t${end}\t${code}`).join("\n"),
  "utf8",
);

console.log(`Wrote ${ranges.length} ranges to ${outputPath} (${countryByGeoname.size} countries).`);
