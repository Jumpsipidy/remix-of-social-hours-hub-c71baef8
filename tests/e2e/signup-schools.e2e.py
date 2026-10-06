"""Regression: anonymous registration can load schools without role-check access."""
import asyncio
import os
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 1800})
        async with page.expect_response(
            lambda response: "/rest/v1/schools?" in response.url
        ) as result:
            await page.goto(os.environ.get("E2E_BASE_URL", "http://localhost:8080") + "/register")
        response = await result.value
        assert response.status == 200, f"School list failed: {response.status}"
        rows = await response.json()
        assert isinstance(rows, list) and rows, "Expected active schools for registration"
        assert all(set(row) == {"id", "name", "city"} for row in rows), "Only public school fields may be returned"
        await page.locator("select").first.wait_for(state="visible")
        assert await page.locator("select").first.input_value() == rows[0]["id"]
        print("PASS: anonymous signup loads and selects a school without administrator permissions")
        await browser.close()


asyncio.run(main())