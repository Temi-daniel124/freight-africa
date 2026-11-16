import { describe, expect, it } from "vitest";
import { hostRoute } from "./hosts";

const pass = { kind: "pass" };
const redirect = (to: string) => ({ kind: "redirect", to });

describe("hostRoute (D033)", () => {
  it("keeps the public website on freight-africa.com", () => {
    expect(hostRoute("freight-africa.com", "/")).toEqual(pass);
    expect(hostRoute("freight-africa.com", "/waitlist")).toEqual(pass);
    expect(hostRoute("freight-africa.com", "/application")).toEqual(pass);
  });

  it("sends the old /auth and /app paths to the app host, keeping the query", () => {
    expect(hostRoute("freight-africa.com", "/auth", "/auth?next=%2Fapp%2Fship")).toEqual(redirect("https://app.freight-africa.com/auth?next=%2Fapp%2Fship"));
    expect(hostRoute("www.freight-africa.com", "/app/ship")).toEqual(redirect("https://app.freight-africa.com/app/ship"));
    expect(hostRoute("freight-africa.com", "/admin/trips")).toEqual(redirect("https://admin.freight-africa.com/admin/trips"));
  });

  it("serves the app and its sign-in on the app host", () => {
    expect(hostRoute("app.freight-africa.com", "/auth/code")).toEqual(pass);
    expect(hostRoute("app.freight-africa.com", "/app/ship")).toEqual(pass);
    expect(hostRoute("app.freight-africa.com", "/")).toEqual(redirect("https://app.freight-africa.com/app"));
    expect(hostRoute("app.freight-africa.com", "/admin")).toEqual(redirect("https://admin.freight-africa.com/admin"));
    expect(hostRoute("app.freight-africa.com", "/legal/terms")).toEqual(redirect("https://freight-africa.com/legal/terms"));
  });

  it("serves the staff console and its own sign-in on the admin host", () => {
    expect(hostRoute("admin.freight-africa.com", "/admin/trips")).toEqual(pass);
    expect(hostRoute("admin.freight-africa.com", "/auth")).toEqual(pass);
    expect(hostRoute("admin.freight-africa.com", "/")).toEqual(redirect("https://admin.freight-africa.com/admin"));
    expect(hostRoute("admin.freight-africa.com", "/app/ship")).toEqual(redirect("https://app.freight-africa.com/app/ship"));
  });

  it("lets every host serve its own files and API routes, and hides signed-in hosts from search", () => {
    expect(hostRoute("app.freight-africa.com", "/_next/static/chunk.js")).toEqual(pass);
    expect(hostRoute("app.freight-africa.com", "/api/auth/sms-hook")).toEqual(pass);
    expect(hostRoute("admin.freight-africa.com", "/brand/web/icon-192.png")).toEqual(pass);
    expect(hostRoute("app.freight-africa.com", "/robots.txt")).toEqual({ kind: "robots" });
    expect(hostRoute("app.freight-africa.com", "/sitemap.xml")).toEqual(redirect("https://freight-africa.com/sitemap.xml"));
  });

  it("leaves previews and localhost alone", () => {
    expect(hostRoute("localhost:3100", "/auth")).toEqual(pass);
    expect(hostRoute("freight-africa-git-x.vercel.app", "/app")).toEqual(pass);
    expect(hostRoute("APP.freight-africa.com:443", "/")).toEqual(redirect("https://app.freight-africa.com/app"));
  });
});
