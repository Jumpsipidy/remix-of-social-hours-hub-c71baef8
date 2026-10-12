"""Authenticated flows with DEDICATED TEST ACCOUNTS only (never real students).

Env (skipped when missing):
  E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD  - test student at a test school
  E2E_ORG_EMAIL / E2E_ORG_PASSWORD          - test organization with >=1 open task
  E2E_CERT_STUDENT_EMAIL / E2E_CERT_STUDENT_PASSWORD - test student with enough finished hours
  E2E_BASE_URL (default http://localhost:8080)

Safe data: the student books the first open task of the test organization with the
note "E2E-TEST"; the org approves only reservations carrying that note.
Run: python3 tests/e2e/authenticated-flows.e2e.py
"""
import asyncio
import os
from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
NOTE = "E2E-TEST"


def creds(prefix):
    e, p = os.environ.get(f"{prefix}_EMAIL"), os.environ.get(f"{prefix}_PASSWORD")
    return (e, p) if e and p else None


async def login(browser, email, password):
    ctx = await browser.new_context(viewport={"width": 1280, "height": 1800}, accept_downloads=True)
    page = await ctx.new_page()
    await page.goto(BASE + "/login", wait_until="domcontentloaded")
    await page.wait_for_timeout(1500)
    await page.keyboard.press("Escape")
    await page.get_by_label("El. paštas").fill(email)
    await page.get_by_label("Slaptažodis").fill(password)
    await page.locator("form button[type=submit]").click()
    await page.wait_for_url(lambda u: "/login" not in u, timeout=20000)
    return ctx, page


async def student_reserves(browser, c, fails):
    ctx, page = await login(browser, *c)
    await page.goto(BASE + "/tasks", wait_until="domcontentloaded")
    btn = page.get_by_role("button", name="Rezervuoti").first
    await btn.wait_for(timeout=15000)
    await btn.click()
    note = page.get_by_role("dialog").locator("textarea")
    if await note.count():
        await note.first.fill(NOTE)
    await page.get_by_role("dialog").get_by_role("button", name="Rezervuoti").last.click()
    await page.wait_for_timeout(3000)
    await page.goto(BASE + "/student", wait_until="domcontentloaded")
    await page.wait_for_timeout(3000)
    if "laukia" not in (await page.inner_text("body")).lower():
        fails.append("student: new reservation not shown as pending")
    await ctx.close()


async def org_approves(browser, c, fails):
    ctx, page = await login(browser, *c)
    await page.goto(BASE + "/organization", wait_until="domcontentloaded")
    row = page.locator(f"text={NOTE}").first
    try:
        await row.wait_for(timeout=15000)
    except Exception:
        fails.append("org: E2E-TEST reservation not visible")
        return await ctx.close()
    card = row.locator("xpath=ancestor::*[.//button][1]")
    await card.get_by_role("button", name="Patvirtinti").first.click()
    await page.wait_for_timeout(3000)
    await ctx.close()


async def certificate_downloads(browser, c, fails):
    ctx, page = await login(browser, *c)
    await page.goto(BASE + "/student", wait_until="domcontentloaded")
    try:
        async with page.expect_download(timeout=30000) as d:
            await page.get_by_role("button", name="sertifikat", exact=False).first.click()
        dl = await d.value
        path = await dl.path()
        with open(path, "rb") as f:
            if f.read(4) != b"%PDF":
                fails.append("certificate: download is not a PDF")
    except Exception as e:
        fails.append(f"certificate: no download ({str(e)[:80]})")
    await ctx.close()


async def main():
    fails, ran = [], []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for name, prefix, fn in [
            ("student reservation", "E2E_STUDENT", student_reserves),
            ("org hour approval", "E2E_ORG", org_approves),
            ("certificate download", "E2E_CERT_STUDENT", certificate_downloads),
        ]:
            c = creds(prefix)
            if not c:
                print(f"SKIP {name}: set {prefix}_EMAIL/_PASSWORD")
                continue
            ran.append(name)
            await fn(browser, c, fails)
        await browser.close()
    if fails:
        print("FAIL:\n- " + "\n- ".join(fails))
        raise SystemExit(1)
    print(f"PASS: {', '.join(ran) or 'nothing (no test accounts set)'}")


asyncio.run(main())
