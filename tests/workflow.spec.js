import {test,expect} from '@playwright/test';
test('registro de comida, persistencia, peso, actividad y perfil',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('h1')).toHaveText('Tu día, a tu manera');
 await page.getByRole('button',{name:'Registrar comida'}).click();
 await page.locator('#search').fill('Avena');await page.locator('#grams-0').fill('50');await page.getByRole('button',{name:'Añadir Avena en copos'}).click();
 await expect(page.locator('.hero .big')).toContainText('195');await page.reload();await expect(page.locator('.hero .big')).toContainText('195');
 await page.getByRole('link',{name:'Evolución',exact:false}).first().click();await page.locator('[name=weight]').fill('75.5');await page.getByRole('button',{name:'Guardar registro del día'}).click();await expect(page.locator('table')).toContainText('75.5 kg');
 await page.getByRole('link',{name:'Actividad'}).click();await page.locator('[name=minutes]').fill('30');await page.getByRole('button',{name:'Guardar actividad'}).click();await expect(page.locator('.food-row')).toContainText('Caminar · 30 min');
 await page.getByRole('link',{name:'Mi perfil'}).click();await page.locator('[name=name]').fill('Ana');await page.getByRole('button',{name:'Guardar perfil'}).click();await page.getByRole('link',{name:'Hoy',exact:false}).click();await expect(page.locator('h1')).toHaveText('Tu día, Ana');
 await page.getByRole('button',{name:'Eliminar Avena en copos'}).click();await expect(page.locator('.hero .big')).toContainText('0');expect(errors).toEqual([]);
});

test('copia exportada se puede restaurar y un archivo inválido no altera los datos',async({page})=>{
 await page.goto('/#perfil');
 await page.locator('[name=name]').fill('Perfil de prueba');
 await page.getByRole('button',{name:'Guardar perfil'}).click();
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Exportar copia JSON'}).click();
 const download=await downloadPromise;
 const stream=await download.createReadStream();const chunks=[];
 for await(const chunk of stream)chunks.push(chunk);
 const backup=Buffer.concat(chunks);
 expect(JSON.parse(backup).profile.name).toBe('Perfil de prueba');
 await page.locator('[name=name]').fill('Otro nombre');await page.getByRole('button',{name:'Guardar perfil'}).click();
 await page.locator('#import-file').setInputFiles({name:'invalido.json',mimeType:'application/json',buffer:Buffer.from('{}')});
 await expect(page.locator('#toast')).toHaveText('Copia no válida. No se han modificado tus datos.');
 await page.reload();await expect(page.locator('[name=name]')).toHaveValue('Otro nombre');
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#import-file').setInputFiles({name:'copia.json',mimeType:'application/json',buffer:backup});
 await expect(page.locator('[name=name]')).toHaveValue('Perfil de prueba');
 await page.reload();await expect(page.locator('[name=name]')).toHaveValue('Perfil de prueba');
});

test('móvil: navegación y registro sin desbordamiento horizontal',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 for(const route of ['hoy','alimentacion','evolucion','actividad','perfil']){
  await page.goto('/#'+route);await expect(page.locator('h1')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.goto('/#hoy');await page.getByRole('button',{name:'Registrar comida'}).click();
 await page.locator('#search').fill('Manzana');await page.getByRole('button',{name:'Añadir Manzana con piel'}).click();
 await expect(page.locator('.hero .big')).toContainText('52');
});

test('elegir cena desde el registro rápido y consultar todas las medidas',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Registrar comida'}).click();
 await page.locator('#meal-select').selectOption('Cena');await page.locator('#search').fill('Manzana');await page.getByRole('button',{name:'Añadir Manzana con piel'}).click();
 await expect(page.locator('.meal').filter({has:page.getByRole('heading',{name:/Cena/})})).toContainText('Manzana con piel');
 await page.goto('/#evolucion');
 for(const [name,value] of Object.entries({weight:'75',chest:'95',arm:'32',thigh:'54'}))await page.locator(`[name=${name}]`).fill(value);
 await page.getByRole('button',{name:'Guardar registro del día'}).click();
 for(const name of ['Pecho','Brazo','Muslo'])await expect(page.getByRole('columnheader',{name})).toBeVisible();
 for(const value of ['95','32','54'])await expect(page.getByRole('cell',{name:value,exact:true})).toBeVisible();
});
