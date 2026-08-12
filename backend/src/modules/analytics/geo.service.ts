import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * IP to country, read from a compact range table built out of MaxMind's GeoLite2 Country CSV.
 *
 * The binary .mmdb format would need a native reader dependency. The CSV export carries the same
 * data, so `scripts/build-geo-country-db.mjs` flattens it once into sorted ranges that a binary
 * search can answer in microseconds with nothing but the standard library.
 *
 * The table is optional on purpose. Without it every view is filed as unknown and the rest of the
 * analytics keeps working, so a missing licence key degrades one column rather than the deploy.
 */
@Injectable()
export class GeoService implements OnModuleInit {
  private readonly logger = new Logger(GeoService.name);
  /** Parallel arrays rather than objects: one allocation each instead of ~200k small ones. */
  private starts: Uint32Array = new Uint32Array(0);
  private ends: Uint32Array = new Uint32Array(0);
  private countries: string[] = [];

  async onModuleInit() {
    const path = process.env.GEO_COUNTRY_DB?.trim() || resolve(process.cwd(), "geo/country-ranges.tsv");

    try {
      const raw = await readFile(path, "utf8");
      this.load(raw);
      this.logger.log(`Country lookup ready: ${this.countries.length} ranges from ${path}`);
      return;
    } catch {
      this.logger.log(`No country database at ${path}; fetching one instead.`);
    }

    // Not awaited: a cold boot must not wait on a CDN. The table arrives a few seconds in and
    // views recorded before then are simply filed without a country.
    //
    // This runs at startup rather than at build time on purpose. The build step only happens if
    // the host actually uses render.yaml, and a service created by hand does not — which is how
    // this ended up missing on a deploy that otherwise succeeded.
    void this.download();
  }

  /** Pulls the CC0 range table straight into memory. Failure costs the country column, nothing more. */
  private async download() {
    if (process.env.GEO_COUNTRY_DOWNLOAD === "off") {
      return;
    }

    const source =
      process.env.GEO_COUNTRY_URL?.trim() ||
      "https://cdn.jsdelivr.net/npm/@ip-location-db/geo-whois-asn-country/geo-whois-asn-country-ipv4-num.csv";

    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      this.load(await response.text());
      this.logger.log(`Country lookup ready: ${this.countries.length} ranges downloaded.`);
    } catch (error) {
      this.logger.warn(
        `Could not fetch a country database (${error instanceof Error ? error.message : error}). ` +
          "Views will be recorded without a country.",
      );
    }
  }

  /** Accepts both the local tab file and the comma-separated set the CDN serves. */
  private load(raw: string) {
    const rows: [number, number, string][] = [];

    for (const row of raw.split("\n")) {
      if (!row || row.startsWith("#")) {
        continue;
      }

      const [start, end, country] = row.includes("\t") ? row.split("\t") : row.split(",");
      const startIp = Number(start);
      const endIp = Number(end);
      const code = country?.trim().toUpperCase();
      if (!Number.isFinite(startIp) || !Number.isFinite(endIp) || code?.length !== 2) {
        continue;
      }

      rows.push([startIp, endIp, code]);
    }

    // Sorted here rather than trusted from the source: the binary search below returns a wrong
    // country rather than an error if the table is out of order, and a wrong country is worse
    // than none. One sort at boot is cheap against that.
    rows.sort((first, second) => first[0] - second[0]);

    const starts = new Uint32Array(rows.length);
    const ends = new Uint32Array(rows.length);
    const countries: string[] = [];
    rows.forEach(([startIp, endIp, code], index) => {
      starts[index] = startIp;
      ends[index] = endIp;
      countries.push(code);
    });

    this.starts = starts;
    this.ends = ends;
    this.countries = countries;
  }

  /** Returns an ISO alpha-2 code, or null for private, IPv6 and unplaceable addresses. */
  lookup(ip: string | null): string | null {
    const value = ipv4ToInt(ip);
    if (value === null || this.countries.length === 0) {
      return null;
    }

    let low = 0;
    let high = this.countries.length - 1;
    while (low <= high) {
      const middle = (low + high) >>> 1;
      if (value < this.starts[middle]) {
        high = middle - 1;
      } else if (value > this.ends[middle]) {
        low = middle + 1;
      } else {
        return this.countries[middle];
      }
    }

    return null;
  }
}

/**
 * Render terminates TLS at a proxy, so the visitor's address is the first entry in
 * X-Forwarded-For. Later entries are the proxies themselves and must not be trusted as the client.
 */
export function clientIpFrom(headers: Record<string, string | string[] | undefined>, fallback?: string) {
  const forwarded = headers["x-forwarded-for"];
  const chain = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = chain?.split(",")[0]?.trim();
  return first || fallback?.replace(/^::ffff:/, "") || null;
}

function ipv4ToInt(ip: string | null): number | null {
  if (!ip) {
    return null;
  }

  // IPv4-mapped IPv6 ("::ffff:1.2.3.4") carries a real v4 address; plain IPv6 we cannot place.
  const plain = ip.replace(/^::ffff:/i, "");
  const parts = plain.split(".");
  if (parts.length !== 4) {
    return null;
  }

  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      return null;
    }

    value = value * 256 + octet;
  }

  // Loopback and RFC1918 ranges mean local traffic, which is ours rather than a visitor's.
  if (isPrivate(value)) {
    return null;
  }

  return value;
}

function isPrivate(value: number) {
  return (
    (value >>> 24) === 10 || // 10.0.0.0/8
    (value >>> 24) === 127 || // 127.0.0.0/8
    (value >>> 20) === 0xac1 || // 172.16.0.0/12
    (value >>> 16) === 0xc0a8 // 192.168.0.0/16
  );
}
