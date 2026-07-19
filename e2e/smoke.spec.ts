import { test, expect } from "@playwright/test";

const AGREE = /18\+ and i agree/i;

async function acceptConsent(page: import("@playwright/test").Page) {
  const btn = page.getByRole("button", { name: AGREE });
  if (await btn.count()) await btn.click();
}

test("home shows the age/consent gate, then reveals characters", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: AGREE })).toBeVisible();
  await acceptConsent(page);
  await expect(
    page.getByRole("heading", { name: /explore characters/i })
  ).toBeVisible();
});

test("legal pages are readable without the consent gate", async ({ page }) => {
  await page.goto("/terms");
  await expect(
    page.getByRole("heading", { name: "Terms of Service" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: AGREE })).toHaveCount(0);

  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Privacy Policy" })
  ).toBeVisible();
});

test("register, create a character, and chat with it", async ({ page }) => {
  const uniq = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  await page.goto("/register");
  await acceptConsent(page);

  await page.getByLabel("Username").fill(`e2e_${uniq}`);
  await page.getByLabel("Email").fill(`e2e_${uniq}@example.com`);
  await page.getByLabel("Password").fill("supersecret1");
  await page.getByRole("button", { name: /create your account/i }).click();

  // Landed back on discovery, signed in.
  await expect(page).toHaveURL(/\/$/);

  // Create a character.
  await page.goto("/create");
  await acceptConsent(page);
  await page.getByPlaceholder("e.g. Aria").fill(`Botty ${uniq}`);
  await page
    .getByPlaceholder(/You are Aria/i)
    .fill("You are Botty, a cheerful helper who loves puns.");
  await page.getByRole("button", { name: /Create & chat/i }).click();

  // We should land in the chat with the character's name in the header.
  await expect(page).toHaveURL(/\/chat\//);
  await expect(
    page.getByRole("heading", { name: `Botty ${uniq}`, level: 1 })
  ).toBeVisible();

  // Send a message and get a (demo-mode) reply.
  const box = page.getByPlaceholder(/Message Botty/i);
  await box.fill("Hello!");
  await box.press("Enter");
  await expect(page.getByText(/demo mode|Botty/i).first()).toBeVisible();
});

test("blocks disallowed character content (moderation)", async ({ page }) => {
  const uniq = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  await page.goto("/register");
  await acceptConsent(page);
  await page.getByLabel("Username").fill(`mod_${uniq}`);
  await page.getByLabel("Email").fill(`mod_${uniq}@example.com`);
  await page.getByLabel("Password").fill("supersecret1");
  await page.getByRole("button", { name: /create your account/i }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/create");
  await acceptConsent(page);
  await page.getByPlaceholder("e.g. Aria").fill("Bad");
  await page
    .getByPlaceholder(/You are Aria/i)
    .fill("a sexy child companion");
  await page.getByRole("button", { name: /Create & chat/i }).click();

  // The API rejects it (422) and the form surfaces the policy message.
  await expect(page.getByText(/content policy/i)).toBeVisible();
});
