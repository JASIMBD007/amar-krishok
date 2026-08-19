import { useEffect } from "react";
import type { Language } from "../types";

const siteUrl = "https://www.amarkrishok.com";
const siteName = "AmarKrishok";
const defaultDescription =
  "আমার কৃষক (AmarKrishok) বাংলাদেশের কৃষক ও পাইকারি ক্রেতাদের সরাসরি ফসল কেনাবেচার কৃষি মার্কেটপ্লেস—আজকের বাজারদর, যাচাইকৃত ফসল, লজিস্টিকস ও সুরক্ষিত পেমেন্ট।";
const defaultKeywords =
  "আমার কৃষক, আমারকৃষক, AmarKrishok, Amar Krishok, Amarkrishok, amar krishok, amarkrishok, কৃষি মার্কেটপ্লেস, কৃষকের বাজার, ফসলের বাজার, অনলাইন কৃষি বাজার, কৃষি বাজারদর, আজকের ফসলের দাম, পাইকারি ফসলের দাম, বাংলাদেশ কৃষি বাজার, কৃষক থেকে ক্রেতা, Bangladesh agriculture marketplace, Bangladesh crop market, farmer marketplace Bangladesh, farmer to buyer Bangladesh, wholesale crop prices Bangladesh, fair crop price, আলুর দাম, পেঁয়াজের দাম, ধানের দাম";

type SeoConfig = {
  title: string;
  description: string;
  path: string;
  robots?: string;
};

const publicSeo: Record<string, SeoConfig> = {
  "/": {
    title: "আমার কৃষক (AmarKrishok) | বাংলাদেশের কৃষি মার্কেটপ্লেস",
    description: defaultDescription,
    path: "/",
  },
  "/marketplace": {
    title: "ফসলের বাজার | Crop Marketplace | আমার কৃষক",
    description: "আমার কৃষক মার্কেটপ্লেসে জেলা, ফসল, কৃষক, পরিমাণ, গ্রেড ও দাম অনুযায়ী যাচাইকৃত ফসলের লট খুঁজুন ও সরাসরি অর্ডার করুন।",
    path: "/marketplace",
  },
  "/prices": {
    title: "আজকের কৃষি বাজারদর | Bangladesh Crop Prices | আমার কৃষক",
    description: "আমার কৃষকে বাংলাদেশের বিভিন্ন জেলার আজকের কৃষি বাজারদর, কৃষকের চাওয়া দাম এবং পাইকারি ফসলের দাম তুলনা করুন।",
    path: "/prices",
  },
  "/register/buyer": {
    title: "Register as a Buyer | AmarKrishok",
    description: "Create a buyer account for AmarKrishok and request verified crop supply directly from farmers after admin approval.",
    path: "/register/buyer",
  },
  "/register/farmer": {
    title: "Register as a Farmer | AmarKrishok",
    description: "Create a farmer or seller account for AmarKrishok to post crop lots after admin verification.",
    path: "/register/farmer",
  },
};

const privateSeo: Record<string, SeoConfig> = {
  "/admin": {
    title: "Admin Login | AmarKrishok",
    description: "Protected AmarKrishok admin area.",
    path: "/admin",
    robots: "noindex, nofollow",
  },
  "/buyer": {
    title: "Buyer Tools | AmarKrishok",
    description: "Protected AmarKrishok buyer order tools.",
    path: "/buyer",
    robots: "noindex, nofollow",
  },
  "/farmer": {
    title: "Farmer Tools | AmarKrishok",
    description: "Protected AmarKrishok farmer crop posting tools.",
    path: "/farmer",
    robots: "noindex, nofollow",
  },
  "/desk": {
    title: "Farmer Dashboard | AmarKrishok",
    description: "Protected AmarKrishok farmer dashboard, listings, offers and payouts.",
    path: "/desk",
    robots: "noindex, nofollow",
  },
  "/orders": {
    title: "Buyer Dashboard | AmarKrishok",
    description: "Protected AmarKrishok buyer dashboard, orders and escrow.",
    path: "/orders",
    robots: "noindex, nofollow",
  },
  "/notifications": {
    title: "Notifications | AmarKrishok",
    description: "Protected AmarKrishok notification centre.",
    path: "/notifications",
    robots: "noindex, nofollow",
  },
  "/messages": {
    title: "Messages | AmarKrishok",
    description: "Protected AmarKrishok conversations with buyers, farmers and staff.",
    path: "/messages",
    robots: "noindex, nofollow",
  },
  "/login": {
    title: "Login | AmarKrishok",
    description: "Login to AmarKrishok.",
    path: "/login",
    robots: "noindex, nofollow",
  },
};

const privatePrefixes = ["/admin", "/buyer", "/checkout", "/desk", "/farmer", "/login", "/messages", "/notifications", "/orders", "/profile", "/signed-out"];

function getSeo(pathname: string): SeoConfig {
  const privatePrefix = privatePrefixes.find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (privatePrefix) {
    const base = privateSeo[privatePrefix] ?? {
      title: `Private account page | ${siteName}`,
      description: `Protected ${siteName} account page.`,
      path: privatePrefix,
      robots: "noindex, nofollow",
    };
    return { ...base, path: pathname };
  }

  if (pathname.startsWith("/lot/")) {
    return {
      title: "যাচাইকৃত ফসলের লট | Crop Lot | আমার কৃষক",
      description: "আমার কৃষকে একটি যাচাইকৃত ফসলের লটের পরিমাণ, গ্রেড, জেলা, কৃষকের দাম, বাজারদরের তুলনা ও ডেলিভারি তথ্য দেখুন।",
      path: pathname,
    };
  }

  return publicSeo[pathname] ?? {
    title: `Page not found | ${siteName}`,
    description: `The requested ${siteName} page could not be found.`,
    path: pathname,
    robots: "noindex, nofollow",
  };
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.content = content;
}

function setCanonical(url: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }

  element.href = url;
}

export function Seo({ language, pathname }: { language: Language; pathname: string }) {
  useEffect(() => {
    const seo = getSeo(pathname);
    const canonical = `${siteUrl}${seo.path}`;

    document.documentElement.lang = language;
    document.title = seo.title;
    setCanonical(canonical);
    setMeta("name", "application-name", siteName);
    setMeta("name", "apple-mobile-web-app-title", siteName);
    setMeta("name", "author", siteName);
    setMeta("name", "keywords", defaultKeywords);
    setMeta("name", "description", seo.description);
    setMeta("name", "robots", seo.robots ?? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    setMeta("property", "og:site_name", siteName);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:title", seo.title);
    setMeta("property", "og:description", seo.description);
    setMeta("property", "og:image", `${siteUrl}/og-image.jpg`);
    setMeta("property", "og:locale", language === "bn-BD" ? "bn_BD" : "en_BD");
    setMeta("property", "og:locale:alternate", language === "bn-BD" ? "en_BD" : "bn_BD");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", seo.title);
    setMeta("name", "twitter:description", seo.description);
    setMeta("name", "twitter:image", `${siteUrl}/og-image.jpg`);
  }, [language, pathname]);

  return null;
}
