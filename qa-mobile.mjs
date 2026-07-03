// Verifies responsive mobile shell: hamburger, drawer, backdrop, and column stacking.
import { chromium, devices } from 'playwright';

const URL = 'http://127.0.0.1:8123/index.html?demo=1';
const iPhone = devices['iPhone 13'];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...iPhone, locale: 'ar-EG' });
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.React && window.KineticData, { timeout: 15000 });
await page.locator('button', { hasText: /^مدير$/ }).first().click();
await page.locator('input[type="password"]').first().fill('demo');
await page.locator('button', { hasText: /^تسجيل الدخول$/ }).first().click();
await page.waitForTimeout(900);

// 1. Hamburger visible on phone.
const burger = page.locator('.mobile-menu-btn').first();
const burgerVisible = await burger.isVisible();
console.log(`[${burgerVisible ? 'PASS' : 'FAIL'}] Hamburger visible on phone`);

// 2. Sidebar hidden until hamburger opens it.
const sidebarBox = await page.locator('aside.sidebar').first().boundingBox();
const initialOffscreen = sidebarBox === null || sidebarBox.x >= 375 || sidebarBox.x + sidebarBox.width <= 0;
console.log(`[${initialOffscreen ? 'PASS' : 'FAIL'}] Sidebar off-canvas by default — x=${sidebarBox?.x} w=${sidebarBox?.width}`);

// 3. Click hamburger → sidebar on-screen.
await burger.click();
await page.waitForTimeout(350);
const openBox = await page.locator('aside.sidebar').first().boundingBox();
const onScreen = openBox && openBox.x < 375 && openBox.x + openBox.width > 0;
console.log(`[${onScreen ? 'PASS' : 'FAIL'}] Drawer opens on hamburger click — x=${openBox?.x} w=${openBox?.width}`);

// 4. Backdrop present when open.
const backdropVisible = await page.locator('.sidebar-backdrop.open').isVisible().catch(() => false);
console.log(`[${backdropVisible ? 'PASS' : 'FAIL'}] Backdrop visible while drawer open`);

// 5. Clicking a nav item closes the drawer.
await page.locator('aside.sidebar .nav-item').filter({ hasText: /المرضى/ }).first().click();
await page.waitForTimeout(400);
const closedBox = await page.locator('aside.sidebar').first().boundingBox();
const closedOffscreen = closedBox && (closedBox.x >= 375 || closedBox.x + closedBox.width <= 0);
console.log(`[${closedOffscreen ? 'PASS' : 'FAIL'}] Drawer auto-closes after nav — x=${closedBox?.x}`);

// 6. Navigate to Treatments (which has grid-3 stat cards) and confirm grids collapse.
await burger.click();
await page.waitForTimeout(350);
await page.locator('aside.sidebar .nav-item').filter({ hasText: /خطط العلاج/ }).first().click();
await page.waitForTimeout(500);
const gridInfo = await page.evaluate(() => {
  const g = document.querySelector('.grid-3');
  if (!g) return null;
  const cs = getComputedStyle(g);
  return { cols: cs.gridTemplateColumns, colCount: cs.gridTemplateColumns.split(' ').length };
});
const isOneCol = gridInfo && gridInfo.colCount === 1;
console.log(`[${isOneCol ? 'PASS' : 'FAIL'}] .grid-3 collapses to 1 column — cols="${gridInfo?.cols}"`);

await browser.close();
