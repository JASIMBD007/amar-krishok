import { useEffect } from "react";
import type { Language } from "../types";

const siteUrl = "https://www.amarkrishok.com";
const siteName = "AmarKrishok";
const defaultDescription =
  "AmarKrishok, also searched as Amar Krishok and Amarkrishok, is a direct farmer marketplace for Bangladesh where farmers post crops, buyers order transparently, and fair prices stay visible.";
const defaultKeywords =
  "AmarKrishok, Amar Krishok, Amarkrishok, amar krishok, amarkrishok, আমার কৃষক, আমারকৃষক, Bangladesh farmers, farmer marketplace, crop marketplace, fair crop price, কৃষক, ফসল বাজার, বাজারদর";

type SeoConfig = {
  title: string;
  description: string;
  path: string;
  robots?: string;
};

const publicSeo: Record<string, SeoConfig> = {
  "/": {
    title: "AmarKrishok | Amar Krishok Farmer Marketplace for Bangladesh",
    description: defaultDescription,
    path: "/",
  },
  "/marketplace": {
    title: "Crop Marketplace | AmarKrishok",
    description: "Search verified crop lots by district, crop, farmer, quantity, grade, harvest date, and asking price on AmarKrishok.",
    path: "/marketplace",
  },
  "/prices": {
    title: "Bangladesh Crop Market Prices | AmarKrishok",
    description: "Compare farmer asking prices, wholesale prices, and retail crop prices across AmarKrishok service districts.",
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
  "/login": {
    title: "Login | AmarKrishok",
    description: "Login to AmarKrishok.",
    path: "/login",
    robots: "noindex, nofollow",
  },
};

function getSeo(pathname: string): SeoConfig {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return privateSeo["/admin"];
  }

  return publicSeo[pathname] ?? privateSeo[pathname] ?? publicSeo["/"];
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
    setMeta("name", "robots", seo.robots ?? "index, follow");
    setMeta("property", "og:site_name", siteName);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:title", seo.title);
    setMeta("property", "og:description", seo.description);
    setMeta("property", "og:image", `${siteUrl}/og-image.jpg`);
    setMeta("property", "og:locale", language === "bn-BD" ? "bn_BD" : "en_BD");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", seo.title);
    setMeta("name", "twitter:description", seo.description);
    setMeta("name", "twitter:image", `${siteUrl}/og-image.jpg`);
  }, [language, pathname]);

  return null;
}
