import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

const BASE_URL = process.env.APP_URL || "https://speeds-classes-baghdad-looksmart.trycloudflare.com";

describe("MCW - Marbles Championship Wrestling", () => {
  it("renders homepage and navigates to the leaderboard", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: BASE_URL });

    const heroAssert = await testdriver.assert(
      "The Marbles Championship Wrestling landing page is visible with the headline and Login with Twitch button"
    );
    expect(heroAssert).toBeTruthy();

    await testdriver.find("Leaderboard link in the navigation header").click();

    const leaderboardAssert = await testdriver.assert(
      "The Leaderboard page is displayed with the LEADERBOARD title"
    );
    expect(leaderboardAssert).toBeTruthy();

    await testdriver.find("MCW logo in the navigation header").click();

    const homeAssert = await testdriver.assert(
      "The homepage hero section is visible with Marbles Championship Wrestling title"
    );
    expect(homeAssert).toBeTruthy();

    await testdriver.scroll("down", { amount: 500 });

    const howItWorksAssert = await testdriver.assert(
      "The How It Works section is visible with step cards"
    );
    expect(howItWorksAssert).toBeTruthy();
  });

  it("renders login page with Twitch authentication prompt", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: `${BASE_URL}/login` });

    const loginAssert = await testdriver.assert(
      "The Enter the Ring heading and Login with Twitch button are visible"
    );
    expect(loginAssert).toBeTruthy();
  });

  it("renders character creator and alignment tools", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: `${BASE_URL}/test` });

    const customizerAssert = await testdriver.assert(
      "The Manual Override page is visible with the character customizer and marble options"
    );
    expect(customizerAssert).toBeTruthy();
  });
});
