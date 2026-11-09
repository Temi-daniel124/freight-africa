#!/usr/bin/env node
// Points Supabase Auth email at Resend's SMTP server for the Freight Africa project only (BUILD.md step 0.11).
// Needs: SUPABASE_ACCESS_TOKEN (personal access token) and RESEND_SMTP_KEY (Resend key "supabase-auth-smtp").
// Optional: SITE_URL (default https://freight-africa.com), PREVIEW_URL_PATTERN (Vercel preview pattern).
const REF = "czlowhaycaivpgimcefk";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const smtpKey = process.env.RESEND_SMTP_KEY;
if (!token || !smtpKey) {
  console.error("Set SUPABASE_ACCESS_TOKEN and RESEND_SMTP_KEY in this shell first.");
  process.exit(1);
}

const siteUrl = process.env.SITE_URL || "https://freight-africa.com";
const allowList = [
  "https://freight-africa.com/**",
  "https://www.freight-africa.com/**",
  "http://localhost:3000/**",
  process.env.PREVIEW_URL_PATTERN,
].filter(Boolean);

const body = {
  external_email_enabled: true,
  mailer_autoconfirm: false,
  mailer_secure_email_change_enabled: true,
  smtp_admin_email: "no-reply@mail.freight-africa.com",
  smtp_host: "smtp.resend.com",
  smtp_port: "465",
  smtp_user: "resend",
  smtp_pass: smtpKey,
  smtp_sender_name: "Freight Africa",
  site_url: siteUrl,
  uri_allow_list: allowList.join(","),
};

const endpoint = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
if (!endpoint.includes(`/projects/${REF}/`)) process.exit(1); // guard against edits (D026)

const res = await fetch(endpoint, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error(`Supabase answered ${res.status}: ${(await res.text()).slice(0, 500)}`);
  process.exit(1);
}

const config = await res.json();
console.log("OK: Supabase Auth now sends email through Resend for", REF);
console.log({
  smtp_host: config.smtp_host,
  smtp_port: config.smtp_port,
  smtp_user: config.smtp_user,
  smtp_admin_email: config.smtp_admin_email,
  smtp_sender_name: config.smtp_sender_name,
  site_url: config.site_url,
  uri_allow_list: config.uri_allow_list,
});
