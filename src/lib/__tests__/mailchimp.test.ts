import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { addOrUpdateMember, subscriberHash } from "../mailchimp";

describe("mailchimp", () => {
  beforeEach(() => {
    process.env.MAILCHIMP_API_KEY = "key-abc";
    process.env.MAILCHIMP_AUDIENCE_ID = "aud123";
    process.env.MAILCHIMP_SERVER_PREFIX = "us21";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.MAILCHIMP_API_KEY;
    delete process.env.MAILCHIMP_AUDIENCE_ID;
    delete process.env.MAILCHIMP_SERVER_PREFIX;
  });

  test("subscriberHash is the md5 of the lowercased email", () => {
    // md5("user@example.com")
    expect(subscriberHash("User@Example.com")).toBe("b58996c504c5638798eb6b511e6f49af");
  });

  test("PUTs the member to the right URL as subscribed, then POSTs the tag", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    const res = await addOrUpdateMember("user@example.com", ["promo-verano-2026"]);

    expect(res.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://us21.api.mailchimp.com/3.0/lists/aud123/members/b58996c504c5638798eb6b511e6f49af",
    );
    expect(init.method).toBe("PUT");
    const body = JSON.parse(init.body);
    expect(body.email_address).toBe("user@example.com");
    expect(body.status_if_new).toBe("subscribed");
    // segunda llamada: tags
    const [tagUrl, tagInit] = fetchMock.mock.calls[1];
    expect(tagUrl).toContain("/tags");
    expect(JSON.parse(tagInit.body).tags[0]).toEqual({ name: "promo-verano-2026", status: "active" });
  });

  test("skips (does not throw) when env is not configured", async () => {
    delete process.env.MAILCHIMP_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await addOrUpdateMember("user@example.com");
    expect(res).toEqual({ ok: false, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns ok:false on network error without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    const res = await addOrUpdateMember("user@example.com");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("network");
  });
});
