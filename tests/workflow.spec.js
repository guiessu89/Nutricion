import {test,expect} from '@playwright/test';
// Exercise the explicit legacy/local path independently of deployment configuration.
test.beforeEach(async({page})=>{await page.route('**/cloud-config.js',r=>r.fulfill({contentType:'application/javascript',body:"export const cloudConfig={url:'',publicKey:''};"}));});
test('registro de comida, persistencia, peso, actividad y perfil',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('h1')).toHaveText('Diario');
 await page.getByRole('button',{name:'Registrar comida'}).click();
 await page.locator('#search').fill('Avena');await page.locator('#grams-0').fill('50');await page.getByRole('button',{name:'Añadir Avena en copos'}).click();await page.getByRole('button',{name:'Confirmar selección',exact:true}).click();
 await expect(page.locator('.hero .big')).toContainText('195');await page.reload();await expect(page.locator('.hero .big')).toContainText('195');
 await page.getByRole('link',{name:'Evolución',exact:false}).first().click();await page.locator('[name=weight]').fill('75.5');await page.getByRole('button',{name:'Guardar registro del día'}).click();await expect(page.locator('table')).toContainText('75.5 kg');
 await page.getByRole('link',{name:'Actividad'}).click();await page.locator('[name=minutes]').fill('30');await page.getByRole('button',{name:'Guardar actividad'}).click();await expect(page.locator('.food-row')).toContainText('Caminar · 30 min');
 await page.getByRole('link',{name:'Mi perfil'}).click();await page.locator('[name=name]').fill('Ana');await page.getByRole('button',{name:'Guardar perfil'}).click();await page.getByRole('link',{name:'Diario',exact:false}).click();await expect(page.locator('h1')).toHaveText('Diario');
 await page.getByRole('button',{name:'Eliminar Avena en copos'}).click();await expect(page.locator('.hero .big')).toContainText('0');expect(errors).toEqual([]);
});

test('copia exportada se puede restaurar y un archivo inválido no altera los datos',async({page})=>{
 await page.goto('/#perfil');
 await page.locator('[name=name]').fill('Perfil de prueba');await page.locator('#profile-form [name=age]').fill('30');
 await page.getByRole('button',{name:'Guardar perfil'}).click();
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Exportar copia JSON'}).click();
 const download=await downloadPromise;
 const stream=await download.createReadStream();const chunks=[];
 for await(const chunk of stream)chunks.push(chunk);
 const backup=Buffer.concat(chunks);
 expect(JSON.parse(backup).profile.name).toBe('Perfil de prueba');
 await page.locator('#profile-form [name=age]').fill('31');await page.getByRole('button',{name:'Guardar perfil'}).click();
 await page.locator('#import-file').setInputFiles({name:'invalido.json',mimeType:'application/json',buffer:Buffer.from('{}')});
 await expect(page.locator('#toast')).toHaveText('Copia no válida. No se han modificado tus datos.');
 await page.reload();await expect(page.locator('#profile-form [name=age]')).toHaveValue('31');
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#import-file').setInputFiles({name:'copia.json',mimeType:'application/json',buffer:backup});
 await expect(page.locator('[name=name]')).toHaveValue('Perfil de prueba');await expect(page.locator('#profile-form [name=age]')).toHaveValue('30');
 await page.reload();await expect(page.locator('[name=name]')).toHaveValue('Perfil de prueba');await expect(page.locator('#profile-form [name=age]')).toHaveValue('30');
});

test('móvil: navegación y registro sin desbordamiento horizontal',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 for(const route of ['hoy','alimentacion','evolucion','actividad','perfil']){
  await page.goto('/#'+route);await expect(page.locator('h1')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.goto('/#hoy');await page.getByRole('button',{name:'Registrar comida'}).click();
 await page.locator('#search').fill('Manzana');await page.getByRole('button',{name:'Añadir Manzana con piel'}).click();await page.getByRole('button',{name:'Confirmar selección',exact:true}).click();
 await expect(page.locator('.hero .big')).toContainText('52');
});

test('elegir cena desde el registro rápido y consultar todas las medidas',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Registrar comida'}).click();
 await page.locator('#meal-select').selectOption('Cena');await page.locator('#search').fill('Manzana');await page.getByRole('button',{name:'Añadir Manzana con piel'}).click();await page.getByRole('button',{name:'Confirmar selección',exact:true}).click();
 await expect(page.locator('.meal').filter({has:page.getByRole('heading',{name:/Cena/})})).toContainText('Manzana con piel');
 await page.goto('/#evolucion');
 for(const [name,value] of Object.entries({weight:'75',chest:'95',arm:'32',thigh:'54'}))await page.locator(`[name=${name}]`).fill(value);
 await page.getByRole('button',{name:'Guardar registro del día'}).click();
 for(const name of ['Pecho','Brazo','Muslo'])await expect(page.getByRole('columnheader',{name})).toBeVisible();
 for(const value of ['95','32','54'])await expect(page.getByRole('cell',{name:value,exact:true})).toBeVisible();
});

test('predictor previsualiza y aplica objetivos persistentes sin sobrescribirlos al estimar',async({page})=>{
 await page.goto('/#perfil');const f=page.locator('#predictor-form');
 await f.locator('[name=weight]').fill('80');await f.locator('[name=height]').fill('180');await f.locator('[name=age]').fill('30');await f.locator('[name=sex]').selectOption('male');await f.locator('[name=activity]').selectOption('moderate');
 await f.getByRole('button',{name:'Estimar objetivos'}).click();await expect(page.locator('#prediction')).toContainText('2760 kcal/día');
 await expect(page.locator('#profile-form [name=goal]')).toHaveValue('2000');
 await page.getByRole('button',{name:'Aplicar estos objetivos'}).click();await page.reload();await expect(page.locator('#profile-form [name=goal]')).toHaveValue('2760');
 await page.getByRole('button',{name:'Guardar perfil'}).click();await page.reload();await expect(page.locator('#predictor-form [name=sex]')).toHaveValue('male');await expect(page.locator('#predictor-form [name=sex]')).toBeDisabled();await expect(page.locator('#predictor-form [name=height]')).not.toBeEditable();
 await page.locator('#predictor-form [name=excluded]').check();await page.getByRole('button',{name:'Estimar objetivos'}).click();await expect(page.locator('#prediction')).toContainText('profesional');await expect(page.locator('#apply-prediction')).toHaveCount(0);
});

test('grasa corporal opcional conserva compatibilidad y calcula masa libre de grasa',async({page})=>{
 await page.goto('/#evolucion');await page.locator('[name=weight]').fill('80');await page.locator('[name=bodyFat]').fill('25');await page.getByRole('button',{name:'Guardar registro del día'}).click();await expect(page.getByRole('cell',{name:'25 %',exact:true})).toBeVisible();await expect(page.getByRole('cell',{name:'60.0 kg',exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('cell',{name:'25 %',exact:true})).toBeVisible();
});

test('déficit agresivo y edición vinculada antes y después de aplicar',async({page})=>{
 await page.goto('/#perfil');const f=page.locator('#predictor-form');
 for(const [k,v] of Object.entries({weight:'80',height:'180',age:'30'}))await f.locator(`[name=${k}]`).fill(v);
 await f.locator('[name=sex]').selectOption('male');await f.locator('[name=activity]').selectOption('custom');await f.locator('[name=activityFactor]').fill('1.55');
 await f.locator('[name=objective]').selectOption('lose');await f.locator('[name=lossMode]').selectOption('deficit');await f.locator('[name=deficitPercent]').fill('25');await f.getByRole('button',{name:'Estimar objetivos'}).click();
 const editor=page.locator('#target-preview');await expect(editor.locator('[name=goal]')).toHaveValue('2070');
 const assertEnergy=async form=>{const v=await form.evaluate(f=>Object.fromEntries(['goal','protein','carbs','fat'].map(k=>[k,Number(f.elements[k].value)])));expect(Math.abs(v.goal-v.protein*4-v.carbs*4-v.fat*9)).toBeLessThanOrEqual(.5);return v;};
 await editor.locator('[name=goal]').fill('2000');await assertEnergy(editor);
 await editor.locator('[name=protein]').fill('160');await expect(editor.locator('[name=goal]')).toHaveValue('2000');await assertEnergy(editor);
 await editor.locator('[name=fat]').fill('60');await assertEnergy(editor);
 await page.getByRole('button',{name:'Aplicar estos objetivos'}).click();
 const profile=page.locator('#profile-form');await expect(profile.locator('[name=goal]')).toHaveValue('2000');await expect(profile.locator('[name=fat]')).toHaveValue('60');
 await profile.locator('[name=carbs]').fill('200');await expect(profile.locator('[name=goal]')).toHaveValue('2000');await assertEnergy(profile);
 await profile.getByRole('button',{name:'Guardar perfil'}).click();await page.reload();await expect(page.locator('#profile-form [name=carbs]')).toHaveValue('200');
});

test('macro imposible no se aplica ni se guarda',async({page})=>{
 await page.goto('/#perfil');const f=page.locator('#profile-form');await f.locator('[name=protein]').fill('600');
 await expect(f.locator('.target-status')).toContainText('no cabe');await f.getByRole('button',{name:'Guardar perfil'}).click();await page.reload();await expect(page.locator('#profile-form [name=protein]')).toHaveValue('120');
});

test('peso objetivo y ritmos calculan plazo que cambia con calorías y se conserva',async({page})=>{
 await page.goto('/#perfil');const f=page.locator('#predictor-form');
 for(const [k,v] of Object.entries({weight:'80',height:'180',age:'30'}))await f.locator(`[name=${k}]`).fill(v);
 await f.locator('[name=sex]').selectOption('male');await f.locator('[name=activity]').selectOption('moderate');await f.locator('[name=objective]').selectOption('lose');
 await expect(f.locator('[name=targetWeight]')).toBeVisible();await expect(f.locator('[name=deficitPercent]')).not.toBeVisible();
 await f.locator('[name=targetWeight]').fill('70');await f.locator('[name=pace]').selectOption('moderate');await f.getByRole('button',{name:'Estimar objetivos'}).click();
 const slow=Number(await page.locator('#target-preview [name=goal]').inputValue());const slowTimeline=await page.locator('#preview-timeline').textContent();
 await f.locator('[name=pace]').selectOption('fast');await f.getByRole('button',{name:'Estimar objetivos'}).click();
 const fast=Number(await page.locator('#target-preview [name=goal]').inputValue());expect(fast).toBeLessThan(slow);await expect(page.locator('#preview-timeline')).toContainText('80 → 70 kg');expect(await page.locator('#preview-timeline').textContent()).not.toBe(slowTimeline);
 await page.locator('#target-preview [name=goal]').fill('2760');await expect(page.locator('#preview-timeline')).toContainText('no se prevé alcanzar');
 await page.locator('#target-preview [name=goal]').fill(String(fast));await page.getByRole('button',{name:'Aplicar estos objetivos'}).click();await page.reload();
 await expect(page.locator('#predictor-form [name=targetWeight]')).toHaveValue('70');await expect(page.locator('#predictor-form [name=pace]')).toHaveValue('fast');await expect(page.locator('#profile-timeline')).toContainText('80 → 70 kg');
 const before=await page.locator('#profile-timeline').textContent();await page.locator('#profile-form [name=goal]').fill(String(fast+100));expect(await page.locator('#profile-timeline').textContent()).not.toBe(before);
});

test('datos fijos de solo lectura y copia profesional en todas las secciones',async({page})=>{
 await page.goto('/#perfil');const profile=page.locator('#profile-form');await profile.locator('[name=name]').fill('Ana');await profile.locator('[name=height]').fill('170');await profile.locator('[name=age]').fill('30');await profile.getByRole('button',{name:'Guardar perfil'}).click();
 await expect(profile.locator('[name=name]')).not.toBeEditable();await expect(profile.locator('[name=height]')).not.toBeEditable();await expect(page.locator('#predictor-form [name=height]')).not.toBeEditable();await expect(profile.locator('[name=age]')).toBeEditable();await expect(profile.locator('[name=goal]')).toBeEditable();
 await profile.locator('[name=age]').fill('31');await profile.getByRole('button',{name:'Guardar perfil'}).click();await page.reload();await expect(page.locator('#profile-form [name=name]')).not.toBeEditable();await expect(page.locator('#profile-form [name=age]')).toHaveValue('31');
 for(const route of ['hoy','alimentacion','evolucion','actividad','perfil']){
  await page.goto('/#'+route);await expect(page.locator('body')).not.toContainText(/a tu ritmo|a tu manera|pequeños hábitos|grandes cambios|cada pequeño paso|bienestar|para cuidarte|constancia importa/i);
  if(route!=='perfil')await expect(page.locator('#account-panel')).toHaveCount(0);
 }
 await expect(page.locator('#content > :last-child')).toHaveAttribute('id','account-panel');
});
