import {test,expect} from '@playwright/test';
test('gráfica ocupa su contenedor, muestra objetivo, tendencia y último peso, con rangos independientes',async({page})=>{
 await page.route('**/cloud-config.js',r=>r.fulfill({contentType:'application/javascript',body:"export const cloudConfig={url:'',publicKey:''};"}));
 await page.addInitScript(()=>localStorage.setItem('mi-nutricion',JSON.stringify({version:1,profile:{goal:2000,protein:120,carbs:250,fat:65,predictor:{input:{objective:'lose',targetWeight:65}}},entries:[],weights:[{date:'2026-01-01',weight:80},{date:'2026-01-03',weight:78},{date:'2026-09-08',weight:74.8}],activities:[],custom:[]})));
 await page.setViewportSize({width:1440,height:1000});await page.goto('/#evolucion');await expect(page.locator('[data-weight-goal]')).toHaveCount(1);await expect(page.locator('.weight-chart-svg text').filter({hasText:'Objetivo: 65 kg'})).toBeVisible();expect(await page.locator('[data-weight-goal]').evaluate(el=>Number(el.getAttribute('x2'))-Number(el.getAttribute('x1')))).toBeGreaterThan(500);await expect(page.locator('[data-weight-trend]')).toBeVisible();await expect(page.locator('[data-last-weight]')).toHaveText('74,8 kg');
 const dimensions=await page.locator('.weight-chart-svg').evaluate(el=>({width:el.getBoundingClientRect().width,boxWidth:el.parentElement.getBoundingClientRect().width,viewWidth:el.viewBox.baseVal.width}));expect(Math.abs(dimensions.width-dimensions.boxWidth)).toBeLessThan(2);expect(Math.abs(dimensions.width-dimensions.viewWidth)).toBeLessThan(2);
 const diaryDate=await page.locator('#date').inputValue();await page.locator('#weight-from').fill('2026-01-01');await page.locator('#weight-from').dispatchEvent('change');await page.locator('#weight-to').fill('2026-01-03');await page.locator('#weight-to').dispatchEvent('change');await expect(page.locator('[data-last-weight]')).toHaveText('78 kg');await expect(page.locator('#date')).toHaveValue(diaryDate);
 await page.getByRole('button',{name:'30 días',exact:true}).click();await expect(page.locator('[data-last-weight]')).toHaveText('74,8 kg');await expect(page.locator('[data-weight-trend]')).toHaveCount(0);await page.getByRole('button',{name:'Todo',exact:true}).click();await expect(page.locator('[data-weight-trend]')).toBeVisible();
 await page.setViewportSize({width:390,height:844});await expect.poll(async()=>page.locator('.weight-chart-svg').evaluate(el=>Math.abs(el.getBoundingClientRect().width-el.viewBox.baseVal.width))).toBeLessThan(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#weight-from').fill('2027-01-01');await page.locator('#weight-from').dispatchEvent('change');await expect(page.locator('#weight-chart-status')).toContainText('fecha inicial');await expect(page.locator('svg.weight-chart-svg')).toHaveCount(0);
});
async function interactiveChart(page,crowded=false){
 await page.route('**/cloud-config.js',r=>r.fulfill({contentType:'application/javascript',body:"export const cloudConfig={url:'',publicKey:''};"}));
 await page.addInitScript(crowded=>localStorage.setItem('mi-nutricion',JSON.stringify({version:1,profile:{goal:2000,protein:120,carbs:250,fat:65},entries:[],weights:[{date:'2026-01-01',weight:80},{date:'2026-01-03',weight:crowded?80:78},{date:'2026-09-08',weight:74.8}],activities:[],custom:[]})),crowded);
 await page.goto('/#evolucion');
}
test('puntos del gráfico muestran fecha y peso con ratón y teclado y se actualizan al filtrar',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await interactiveChart(page);await page.locator('[data-weight-point="0"]').hover();await expect(page.getByRole('tooltip')).toHaveText('01/01/2026 · 80 kg');await page.locator('h1').hover();await expect(page.getByRole('tooltip')).toBeHidden();
 await page.locator('[data-weight-point="1"]').focus();await expect(page.getByRole('tooltip')).toHaveText('03/01/2026 · 78 kg');await page.keyboard.press('Escape');await expect(page.getByRole('tooltip')).toBeHidden();
 await page.getByRole('button',{name:'30 días',exact:true}).click();await expect(page.locator('[data-weight-point]')).toHaveCount(1);await page.locator('[data-weight-point="0"]').click();await expect(page.getByRole('tooltip')).toHaveText('08/09/2026 · 74,8 kg');
 await page.locator('#weight-from').fill('2027-01-01');await page.locator('#weight-from').dispatchEvent('change');await expect(page.getByRole('tooltip')).toHaveCount(0);await page.locator('.weight-plot').hover();expect(errors).toEqual([]);
});
test.describe('interacción táctil',()=>{
 test.use({hasTouch:true,viewport:{width:390,height:844}});
 test('tocar un punto fija fecha y peso; tocar fuera cierra el detalle',async({page})=>{
  await interactiveChart(page);await page.locator('[data-weight-point="1"]').tap();await expect(page.getByRole('tooltip')).toHaveText('03/01/2026 · 78 kg');await page.locator('[data-weight-point="2"]').tap();await expect(page.getByRole('tooltip')).toHaveText('08/09/2026 · 74,8 kg');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'/tmp/weight-touch.png',fullPage:true});await page.locator('h1').tap();await expect(page.getByRole('tooltip')).toBeHidden();
 });
});

test('puntos próximos no ocultan la consulta de registros anteriores',async({page})=>{
 await interactiveChart(page,true);const point=await page.locator('[data-weight-point="0"]').boundingBox();await page.mouse.move(point.x+point.width/2,point.y+point.height/2);await expect(page.getByRole('tooltip')).toHaveText('01/01/2026 · 80 kg');await page.mouse.click(point.x+point.width/2,point.y+point.height/2);await expect(page.getByRole('tooltip')).toHaveText('01/01/2026 · 80 kg');
});
