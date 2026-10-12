"""Critical public flows: pages load without crashes, key forms render, bad links fail safely.
Run: python3 tests/e2e/critical-flows.e2e.py  (E2E_BASE_URL overrides http://localhost:8080)
"""
import asyncio
import os
from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")

PAGES = [
    ("/", "socialin"),
    ("/login", "Prisijungti"),
    ("/register", None),
    ("/forgot-password", None),
    ("/tasks", None),
    ("/verify", None),
    ("/privacy", None),
    ("/terms", None),
    ("/versijos", None),
]


async def main():
    failures = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        for path, text in PAGES:
            errors.clear()
            r = await page.goto(BASE + path, wait_until="domcontentloaded")
            await page.wait_for_timeout(1500)
            if not r or r.status >= 500:
                failures.append(f"{path}: HTTP {r.status if r else 'none'}")
            body = (await page.inner_text("body")).lower()
            if text and text.lower() not in body:
                failures.append(f"{path}: missing '{text}'")
            if errors:
                failures.append(f"{path}: page error {errors[0][:120]}")

        # Login form: wrong password shows error, stays on /login
        await page.goto(BASE + "/login", wait_until="domcontentloaded")
        await page.get_by_label("El. paštas").fill("nera-tokio@example.com")
        await page.get_by_label("Slaptažodis").fill("blogas-slaptazodis-123")
        await page.get_by_role("button", name="Prisijungti", exact=False).last.click()
        await page.wait_for_timeout(3000)
        if "/login" not in page.url:
            failures.append("login: bad password left the login page")

        # Protected page redirects signed-out visitor
        await page.goto(BASE + "/chat", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        if "/login" not in page.url:
            failures.append(f"/chat signed-out not redirected (at {page.url})")

        # Fake certificate and fake invite fail safely
        for path in ("/verify/NEBUVO-TOKIO-KODO", "/invite/netikras-kvietimas"):
            errors.clear()
            r = await page.goto(BASE + path, wait_until="domcontentloaded")
            await page.wait_for_timeout(2500)
            if r and r.status >= 500:
                failures.append(f"{path}: HTTP {r.status}")
            if errors:
                failures.append(f"{path}: page error {errors[0][:120]}")

        # Health endpoint
        r = await page.request.get(BASE + "/api/public/health")
        if r.status >= 500:
            failures.append(f"health: HTTP {r.status}")

        await browser.close()

    if failures:
        print("FAIL:\n- " + "\n- ".join(failures))
        raise SystemExit(1)
    print(f"PASS: {len(PAGES)} pages, login rejection, auth redirect, bad links, health")


asyncio.run(main())
