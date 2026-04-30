// Lightweight GA4 / GTM helper. Loads dynamically based on vitrine_settings.
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

let initialized = false;

export async function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  const consent = localStorage.getItem("asia_consent");
  if (consent !== "granted") return;
  initialized = true;
  try {
    const { data } = await supabase.from("vitrine_settings").select("gtm_id, ga4_id, meta_pixel_id").maybeSingle();
    if (!data) return;
    window.dataLayer = window.dataLayer || [];

    if (data.gtm_id) injectGTM(data.gtm_id);
    if (data.ga4_id && !data.gtm_id) injectGA4(data.ga4_id);
    if (data.meta_pixel_id) injectMetaPixel(data.meta_pixel_id);
  } catch {/* silent */}
}

function injectGTM(id: string) {
  const s = document.createElement("script");
  s.async = true;
  s.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`;
  document.head.appendChild(s);
}

function injectGA4(id: string) {
  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s1);
  const s2 = document.createElement("script");
  s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
  document.head.appendChild(s2);
}

function injectMetaPixel(id: string) {
  const s = document.createElement("script");
  s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`;
  document.head.appendChild(s);
}

function push(event: string, payload: Record<string, any> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
}

export const track = {
  viewItemList: (items: any[], list_name = "catalog") =>
    push("view_item_list", { ecommerce: { item_list_id: list_name, item_list_name: list_name, items: items.map(toItem) } }),
  viewItem: (part: any) =>
    push("view_item", { ecommerce: { items: [toItem(part)] } }),
  selectItem: (part: any) =>
    push("select_item", { ecommerce: { items: [toItem(part)] } }),
  addToCart: (part: any, quantity = 1) =>
    push("add_to_cart", { ecommerce: { items: [{ ...toItem(part), quantity }] } }),
  beginCheckout: (items: any[]) =>
    push("begin_checkout", { ecommerce: { items: items.map(toItem) } }),
  generateLead: (kind: "quote" | "b2b", payload: Record<string, any> = {}) =>
    push("generate_lead", { lead_kind: kind, ...payload }),
  contact: (channel: string, payload: Record<string, any> = {}) =>
    push("contact", { method: channel, ...payload }),
  scroll75Category: (slug: string) =>
    push("scroll_75_category", { slug }),
};

function toItem(p: any) {
  return {
    item_id: p.material,
    item_name: p.description,
    item_brand: p.manufacturer || "XCMG",
    item_category: p.part_category || undefined,
    price: p.estimated_price || undefined,
  };
}

// Server-side conversion (Google Ads Enhanced Conversions)
export type ConversionEvent = "quote_submitted" | "quote_lead" | "b2b_lead" | "whatsapp_click";
export async function trackServerConversion(payload: { event: ConversionEvent; value?: number; currency?: string; email?: string; phone?: string; transaction_id?: string }) {
  try {
    await supabase.functions.invoke("track-conversion", { body: payload });
  } catch {/* silent */}
}
