import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { URL } from "node:url";

const outputDirectory = new URL("../dist/", import.meta.url);
const source = await readFile(new URL("index.html", outputDirectory), "utf8");

const pages = [
  {
    path: "marketplace",
    title: "ফসলের বাজার | Crop Marketplace | আমার কৃষক",
    description: "আমার কৃষক মার্কেটপ্লেসে জেলা, ফসল, কৃষক, পরিমাণ, গ্রেড ও দাম অনুযায়ী যাচাইকৃত ফসলের লট খুঁজুন ও সরাসরি অর্ডার করুন।",
    heading: "যাচাইকৃত ফসলের বাজার",
    copy: "বাংলাদেশের কৃষকদের প্রকাশিত আলু, পেঁয়াজ, ধান, সবজি ও অন্যান্য ফসলের লট জেলা, গ্রেড, পরিমাণ ও দাম অনুযায়ী খুঁজুন।",
  },
  {
    path: "prices",
    title: "আজকের কৃষি বাজারদর | Bangladesh Crop Prices | আমার কৃষক",
    description: "আমার কৃষকে বাংলাদেশের বিভিন্ন জেলার আজকের কৃষি বাজারদর, কৃষকের চাওয়া দাম এবং পাইকারি ফসলের দাম তুলনা করুন।",
    heading: "আজকের কৃষি বাজারদর",
    copy: "বাংলাদেশের বিভিন্ন জেলার আলু, পেঁয়াজ, ধান, সবজি ও অন্যান্য ফসলের প্রকাশিত বাজারদর দেখুন এবং কৃষকের চাওয়া দামের সঙ্গে তুলনা করুন।",
  },
  {
    path: "register/farmer",
    title: "কৃষক অ্যাকাউন্ট খুলুন | Register as a Farmer | আমার কৃষক",
    description: "আমার কৃষকে কৃষক বা বিক্রেতা হিসেবে নিবন্ধন করুন এবং যাচাইয়ের পরে সরাসরি ফসলের লট প্রকাশ করুন।",
    heading: "কৃষক অ্যাকাউন্ট খুলুন",
    copy: "আমার কৃষকে নিবন্ধন করে যাচাইয়ের পরে আপনার ফসল, পরিমাণ, গ্রেড, জেলা ও চাওয়া দাম সরাসরি ক্রেতাদের কাছে প্রকাশ করুন।",
  },
  {
    path: "register/buyer",
    title: "ক্রেতা অ্যাকাউন্ট খুলুন | Register as a Buyer | আমার কৃষক",
    description: "আমার কৃষকে পাইকারি ক্রেতা হিসেবে নিবন্ধন করুন এবং যাচাইকৃত কৃষকদের কাছ থেকে সরাসরি ফসল অর্ডার করুন।",
    heading: "ক্রেতা অ্যাকাউন্ট খুলুন",
    copy: "আমার কৃষকে নিবন্ধন করে জেলা, ফসল, গ্রেড, পরিমাণ ও দাম অনুযায়ী যাচাইকৃত কৃষকদের কাছ থেকে ফসল অর্ডার করুন।",
  },
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceMeta(html, attribute, key, content) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta(?=[^>]*${attribute}=["']${escapedKey}["'])[^>]*>`, "i");
  return html.replace(pattern, `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`);
}

for (const page of pages) {
  const canonical = `https://www.amarkrishok.com/${page.path}`;
  const fallback = `<main class="seo-app-fallback">
        <h1>${page.heading}</h1>
        <p>${page.copy}</p>
        <nav aria-label="Public pages">
          <a href="/">আমার কৃষক হোম</a>
          <a href="/marketplace">ফসলের বাজার</a>
          <a href="/prices">আজকের কৃষি বাজারদর</a>
        </nav>
      </main>`;

  let html = source
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${page.title}</title>`)
    .replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<main class="seo-app-fallback">[\s\S]*?<\/main>/i, fallback);

  html = replaceMeta(html, "name", "description", page.description);
  html = replaceMeta(html, "property", "og:url", canonical);
  html = replaceMeta(html, "property", "og:title", page.title);
  html = replaceMeta(html, "property", "og:description", page.description);
  html = replaceMeta(html, "name", "twitter:title", page.title);
  html = replaceMeta(html, "name", "twitter:description", page.description);

  const destination = join(outputDirectory.pathname, page.path);
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, "index.html"), html);
}

process.stdout.write(`Prerendered ${pages.length} public routes with route-specific SEO metadata.\n`);
