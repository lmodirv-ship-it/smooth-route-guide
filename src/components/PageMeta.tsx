import { useEffect } from "react";

interface PageMetaProps {
  title: string;
  description?: string;
  image?: string;
  keywords?: string;
  type?: "website" | "article" | "product";
  noIndex?: boolean;
}

const SITE_URL = "https://www.hn-driver.com";
const DEFAULT_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/g9dYUUMiwpd1WQjB2jpPGmqKT172/social-images/social-1773746971172-LOGO_HN_DRIVER.webp";
const LOCALES = ["ar", "fr", "en", "es"];

/** Upsert a <meta> tag by attribute (name or property). */
const upsertMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

/** Upsert a <link rel="..."> tag, optionally keyed by hreflang. */
const upsertLink = (rel: string, href: string, hreflang?: string) => {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (hreflang) el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const PageMeta = ({
  title,
  description,
  image = DEFAULT_IMAGE,
  keywords,
  type = "website",
  noIndex = false,
}: PageMetaProps) => {
  useEffect(() => {
    document.title = title;
    const path = window.location.pathname + window.location.search;
    const canonical = `${SITE_URL}${window.location.pathname}`;

    if (description) upsertMeta("name", "description", description);
    if (keywords) upsertMeta("name", "keywords", keywords);
    upsertMeta("name", "robots", noIndex ? "noindex,nofollow" : "index,follow,max-image-preview:large");

    // Open Graph (Facebook, WhatsApp, LinkedIn)
    upsertMeta("property", "og:title", title);
    if (description) upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:url", `${SITE_URL}${path}`);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:site_name", "HN GROUPE");

    // Twitter / X
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    if (description) upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);

    // Canonical + hreflang for international SEO
    upsertLink("canonical", canonical);
    LOCALES.forEach((lang) => {
      upsertLink("alternate", `${canonical}?lang=${lang}`, lang);
    });
    upsertLink("alternate", canonical, "x-default");
  }, [title, description, image, keywords, type, noIndex]);

  return null;
};

export default PageMeta;
