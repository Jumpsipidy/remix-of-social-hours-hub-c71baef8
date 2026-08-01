"""E2E: celebration overlay (mobile + desktop) — run: python3 tests/e2e/celebrations.e2e.py"""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path("/tmp/browser/celebrations"); OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://localhost:8080"
STATS = {"name": "Ieva Kazlauskaitė", "hoursEarned": 14, "hoursNeeded": 20,
         "uniqueOrgs": 3, "friendsCount": 5, "loginStreakDays": 7, "classYear": "10a"}

CASES = [
    ("streak", {"kind": "streak", "days": 7, "longest": 12, "stats": STATS}),
    ("achievement", {"kind": "achievement", "label": "10 valandų", "description": "Dviženklis skaičius!",
                     "iconKey": "ten_hours", "stats": STATS}),
    ("fallback", {"kind": "achievement", "label": "Nauja žymė", "description": "Be klipo — atsarginė animacija.",
                  "iconKey": "__no_clip__", "stats": STATS}),
]
DEVICES = [("mobile", 390, 844), ("desktop", 1280, 900)]

async def main():
    failures = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for dev, w, h in DEVICES:
            ctx = await browser.new_context(viewport={"width": w, "height": h}, has_touch=(dev == "mobile"))
            page = await ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            await page.goto(BASE, wait_until="domcontentloaded")
            await page.wait_for_function("() => !!window.__celebrate", timeout=20000)
            for name, payload in CASES:
                await page.evaluate("p => window.__celebrate(p)", payload)
                stage = page.get_by_test_id("celebration-stage")
                await stage.wait_for(state="visible", timeout=5000)
                await page.wait_for_timeout(1400)
                await page.screenshot(path=str(OUT / f"{dev}-{name}.png"))
                box = await stage.bounding_box()
                if box and (box["width"] > w + 1):
                    failures.append(f"{dev}/{name}: overlay wider than viewport")
                skip = page.get_by_test_id("celebration-skip")
                sb = await skip.bounding_box()
                if not sb or sb["height"] < 40:
                    failures.append(f"{dev}/{name}: skip button too small for touch")
                await skip.click()
                await stage.wait_for(state="hidden", timeout=5000)
            if errors:
                failures.append(f"{dev}: page errors {errors}")
            await ctx.close()
        await browser.close()
    print(json.dumps({"failures": failures}, ensure_ascii=False, indent=2))
    print("E2E PASS" if not failures else "E2E FAIL")

asyncio.run(main())
