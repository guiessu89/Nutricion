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
