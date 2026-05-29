import { describe, it, expect } from "vitest";
import {
  isBlockedHost,
  isBlockedIp,
  normalizeUrl,
} from "@/lib/website-extract-guard";

describe("normalizeUrl", () => {
  it("adds https:// to a bare domain", () => {
    expect(normalizeUrl("miweb.com")?.toString()).toBe("https://miweb.com/");
  });

  it("keeps an explicit http/https scheme", () => {
    expect(normalizeUrl("http://miweb.com")?.protocol).toBe("http:");
  });

  it("rejects non-http(s) schemes and junk", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("file:///etc/passwd")).toBeNull();
    expect(normalizeUrl("ftp://host/x")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
  });
});

describe("isBlockedHost", () => {
  it("blocks loopback / internal-style names", () => {
    for (const h of [
      "localhost",
      "app.localhost",
      "service.local",
      "db.internal",
      "router", // bare, no dot
    ]) {
      expect(isBlockedHost(h), h).toBe(true);
    }
  });

  it("allows normal public domains", () => {
    for (const h of ["example.com", "www.dinkbit.com", "sub.domain.co.uk"]) {
      expect(isBlockedHost(h), h).toBe(false);
    }
  });
});

describe("isBlockedIp", () => {
  it("blocks the cloud metadata address and link-local range", () => {
    expect(isBlockedIp("169.254.169.254")).toBe(true);
    expect(isBlockedIp("169.254.0.1")).toBe(true);
  });

  it("blocks loopback, RFC1918, CGNAT and this-host ranges", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.5",
      "192.168.1.1",
      "172.16.0.1",
      "172.31.255.255",
      "100.64.0.1",
      "0.0.0.0",
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("blocks multicast / reserved and malformed IPv4", () => {
    expect(isBlockedIp("224.0.0.1")).toBe(true);
    expect(isBlockedIp("255.255.255.255")).toBe(true);
    expect(isBlockedIp("999.1.1.1")).toBe(true);
  });

  it("blocks IPv6 loopback, link-local, ULA and IPv4-mapped internals", () => {
    for (const ip of [
      "::1",
      "::",
      "fe80::1",
      "fc00::1",
      "fd12:3456::1",
      "::ffff:127.0.0.1",
      "::ffff:169.254.169.254",
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("allows ordinary public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700::1111"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("blocks 172.x outside the private 16–31 block boundary correctly", () => {
    expect(isBlockedIp("172.15.0.1")).toBe(false); // just below RFC1918
    expect(isBlockedIp("172.32.0.1")).toBe(false); // just above RFC1918
    expect(isBlockedIp("172.16.0.1")).toBe(true);
  });
});
