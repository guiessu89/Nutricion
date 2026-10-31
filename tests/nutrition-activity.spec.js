import {test,expect} from '@playwright/test';
const seed={version:1,profile:{goal:2000,protein:120,carbs:250,fat:65},entries:[{id:'meal',date:'2026-10-30',meal:'Desayuno',grams:100,food:{name:'Alimento de prueba',kcal:2500,p:120,c:150,f:140}}],weights:[{date:'2026-10-29',weight:80},{date:'2026-11-01',weight:90}],activities:[],custom:[]};
async function setup(page){
 await page.route('**/cloud-config.js',r=>r.fulfill({contentType:'application/javascript',body:"export const cloudConfig={url:'',publicKey:''};"}));
 await page.addInitScript(data=>{if(!localStorage.getItem('mi-nutricion'))localStorage.setItem('mi-nutricion',JSON.stringify(data));},seed);
 await page.goto('/#hoy');await page.locator('#date').fill('2026-10-30');await page.locator('#date').dispatchEvent('change');
}
test('colores y texto, cierre persistente y objetivos de referencia independientes del perfil',async({page})=>{
 await setup(page);await expect(page.locator('.hero')).toHaveClass(/status-high/);await expect(page.locator('.calorie-summary .nutrition-badge')).toHaveText('Por encima · 125%');
 for(const [i,kind,label] of [[0,'ok','En rango'],[1,'low','Por debajo'],[2,'high','Por encima']]){await expect(page.locator('.stat').nth(i)).toHaveClass(new RegExp('status-'+kind));await expect(page.locator('.stat .nutrition-badge').nth(i)).toContainText(label);}
 await expect(page.getByText('Calorías en rango: —',{exact:false})).toBeVisible();await page.locator('#review-day').click();await expect(page.locator('#review-day')).toHaveText('Reabrir día');
 await expect(page.getByText('Calorías en rango: 0/1',{exact:false})).toBeVisible();
 await page.getByRole('link',{name:'Mi perfil'}).click();await page.locator('#profile-form [name=goal]').fill('2500');await page.getByRole('button',{name:'Guardar perfil'}).click();await expect(page.locator('#toast')).toHaveText('Perfil actualizado');
 await page.getByRole('link',{name:'Diario',exact:false}).click();await expect(page.locator('.hero .big')).toContainText('/ 2000 kcal');
 await page.reload();await page.locator('#date').fill('2026-10-30');await page.locator('#date').dispatchEvent('change');await expect(page.locator('#review-day')).toHaveText('Reabrir día');await expect(page.locator('.hero .big')).toContainText('/ 2000 kcal');
 await page.locator('#review-day').click();await expect(page.locator('.hero .big')).toContainText('/ 2500 kcal');await expect(page.locator('.calorie-summary .nutrition-badge')).toHaveText('En rango · 100%');
 await page.locator('#date').fill('2026-10-29');await page.locator('#date').dispatchEvent('change');await expect(page.locator('#review-day')).toBeDisabled();await expect(page.locator('.calorie-summary .nutrition-badge')).toContainText('Sin registros');
});
test('correr y escalar desde Diario: gasto separado, fecha y peso correctos, persistencia y borrado',async({page})=>{
 await setup(page);await page.locator('#add-activity').click();const form=page.locator('#activity-form');await expect(form).toBeVisible();await expect(form.locator('[name=exerciseWeight]')).toHaveValue('80');
 await form.locator('[name=variant]').selectOption('run_8');await form.locator('[name=minutes]').fill('30');await expect(page.locator('#exercise-preview')).toContainText('315 kcal');await page.getByRole('button',{name:'Guardar actividad'}).click();
 await expect(page.locator('#exercise-energy')).toHaveText('≈ 315 kcal');await expect(page.locator('.hero .big')).toHaveText('2500 / 2000 kcal');
 await form.locator('[name=type]').selectOption('Escalada');await form.locator('[name=variant]').selectOption('boulder');await form.locator('[name=minutes]').fill('20');await expect(page.locator('#exercise-preview')).toContainText('218 kcal');await page.getByRole('button',{name:'Guardar actividad'}).click();await expect(page.locator('#exercise-energy')).toHaveText('≈ 533 kcal');
 await page.reload();await page.locator('#date').fill('2026-10-30');await page.locator('#date').dispatchEvent('change');await expect(page.locator('#exercise-energy')).toHaveText('≈ 533 kcal');await expect(page.locator('.hero .big')).toHaveText('2500 / 2000 kcal');
 await page.locator('#date').fill('2026-10-29');await page.locator('#date').dispatchEvent('change');await expect(page.locator('#exercise-energy')).toHaveText('≈ 0 kcal');
 await page.locator('#date').fill('2026-10-30');await page.locator('#date').dispatchEvent('change');await page.getByRole('button',{name:'Eliminar actividad',exact:true}).first().click();await expect(page.locator('#exercise-energy')).toHaveText('≈ 218 kcal');await page.getByRole('button',{name:'Eliminar actividad',exact:true}).click();await expect(page.locator('#exercise-energy')).toHaveText('≈ 0 kcal');
 const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('mi-nutricion')));expect(data.activities).toHaveLength(0);expect(data.entries).toEqual(seed.entries);expect(data.profile).toEqual(seed.profile);
});
test('Diario móvil: estados legibles y tabla con desplazamiento propio',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);const summary=await page.locator('.daily-summary').boundingBox();expect(summary.height).toBeLessThan(310);await expect(page.locator('.daily-summary + .diary-content')).toBeVisible();expect((await page.getByRole('heading',{name:'Diario de comidas',exact:true}).boundingBox()).y).toBeLessThan(650);await page.getByText('Ver detalle diario',{exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('.calorie-summary .nutrition-badge')).toBeVisible();await page.screenshot({path:'/tmp/nutricion-status-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/nutricion-status-desktop.png',fullPage:true});
});
