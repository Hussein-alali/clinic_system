// Verifies admin can add a new branch and switch between branches.
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8123/index.html?demo=1';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: 'ar-EG' });
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.React && window.KineticData, { timeout: 15000 });
await page.locator('button', { hasText: /^مدير$/ }).first().click();
await page.locator('input[type="password"]').first().fill('demo');
await page.locator('button', { hasText: /^تسجيل الدخول$/ }).first().click();
await page.waitForTimeout(700);

// 1. Open the branch switcher.
const switcher = page.locator('aside button', { hasText: /فرع مصر الجديدة/ }).first();
await switcher.click();
await page.waitForTimeout(200);

// 2. Confirm "إضافة فرع جديد" is visible for admin.
const addBtn = page.locator('button', { hasText: /إضافة فرع جديد/ }).first();
const canAdd = await addBtn.isVisible();
console.log(`[${canAdd ? 'PASS' : 'FAIL'}] Admin sees "إضافة فرع جديد"`);
await addBtn.click();
await page.waitForTimeout(300);

// 3. Fill and submit the modal.
await page.locator('input.input').first().fill('فرع المعادي');
await page.locator('button', { hasText: /إضافة الفرع/ }).first().click();
await page.waitForTimeout(500);

// 4. Verify the new branch is stored + active.
const state = await page.evaluate(() => ({
  count: (window.BRANCHES || []).length,
  activeId: window.ACTIVE_BRANCH_ID,
  activeName: (window.BRANCHES || []).find(b => b.id === window.ACTIVE_BRANCH_ID)?.name,
}));
const added = state.count === 2 && state.activeName === 'فرع المعادي';
console.log(`[${added ? 'PASS' : 'FAIL'}] New branch added and active — count=${state.count} active="${state.activeName}"`);

// 5. Verify the switcher label updated.
const sidebarLabel = await page.locator('aside button', { hasText: /فرع المعادي/ }).first().isVisible();
console.log(`[${sidebarLabel ? 'PASS' : 'FAIL'}] Sidebar shows new active branch`);

// 6. Edit the active branch via the pencil icon.
await page.locator('aside button', { hasText: /فرع المعادي/ }).first().click();
await page.waitForTimeout(200);
await page.locator('button[title="تعديل الفرع"]').first().click();
await page.waitForTimeout(300);
const nameInput = page.locator('input.input').first();
await nameInput.fill('فرع المعادي المحدّث');
await page.locator('button', { hasText: /حفظ التغييرات/ }).first().click();
await page.waitForTimeout(500);
const edited = await page.evaluate(() => {
  const b = (window.BRANCHES || []).find(x => x.name === 'فرع المعادي المحدّث');
  return !!b;
});
console.log(`[${edited ? 'PASS' : 'FAIL'}] Branch edit updates name`);

// 7. Confirm DB persistence path exists (updateBranch on window).
const apiOk = await page.evaluate(() => (
  typeof window.addBranch === 'function' &&
  typeof window.updateBranch === 'function' &&
  typeof window.removeBranch === 'function' &&
  typeof window.loadBranches === 'function'
));
console.log(`[${apiOk ? 'PASS' : 'FAIL'}] Branch DB API exposed on window`);

// 8. Direct API call: delete the extra branch and confirm it's gone.
await page.evaluate(async () => {
  const activeId = window.ACTIVE_BRANCH_ID;
  const first = (window.BRANCHES || []).find(b => b.id !== activeId);
  const other = (window.BRANCHES || []).find(b => b.id === activeId);
  // Switch to the original branch first so we can delete the extra one.
  if (other && (window.BRANCHES || []).length > 1) {
    const orig = (window.BRANCHES || []).find(b => b.id !== activeId) || other;
    // Delete a non-active branch: pick the one different from active.
  }
  const toDel = (window.BRANCHES || []).find(b => b.id !== activeId) || first;
  if (toDel && window.removeBranch) await window.removeBranch(toDel.id);
});
await page.waitForTimeout(300);
const finalCount = await page.evaluate(() => (window.BRANCHES || []).length);
console.log(`[${finalCount === 1 ? 'PASS' : 'FAIL'}] Delete removes extra branch — count=${finalCount}`);

await browser.close();
