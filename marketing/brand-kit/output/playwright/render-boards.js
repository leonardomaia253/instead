async function renderBoards(page) {
  await page.setViewportSize({ width: 1600, height: 1000 });

  const files = [
    "01-essencia",
    "02-logo-protecao",
    "03-paleta",
    "04-tipografia",
    "05-sistema-visual",
    "06-aplicacoes",
  ];

  for (const name of files) {
    await page.goto(`http://127.0.0.1:4174/${name}.html`, {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `C:/Users/Administrator/instead/marketing/brand-kit/output/playwright/${name}.png`,
      type: "png",
    });
  }
}
