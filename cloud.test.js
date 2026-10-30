import test from 'node:test';import assert from 'node:assert/strict';import {CloudStore} from './cloud.js';
const config={url:'https://example.supabase.co',publicKey:'public-test-key'};
test('no permite peticiones sin sesión ni configuración',async()=>{await assert.rejects(()=>new CloudStore({}).load());await assert.rejects(()=>new CloudStore(config).save({}));});
test('sesión, versión de lectura y guardado confirmados por servidor',async()=>{
 const calls=[];const responses=[{access_token:'test-access',refresh_token:'test-refresh',expires_in:3600},[{user_id:'owner'}],[{revision:7,payload:{version:1}}],8];
 const store=new CloudStore(config,async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(responses.shift()),{status:200});});
 await store.login('test@example.org','test-only');assert.deepEqual(await store.load(),{version:1});assert.equal(store.revision,7);await store.save({version:1});assert.equal(store.revision,8);assert.equal(JSON.parse(calls[3].options.body).expected_revision,7);assert.equal(calls[3].options.headers.Authorization,'Bearer test-access');
});
test('un conflicto no avanza revisión y nunca confirma un guardado',async()=>{const store=new CloudStore(config,async()=>new Response('{}',{status:409}));store.setSession({access_token:'test',expires_in:3600});store.revision=2;await assert.rejects(()=>store.save({}),/otro dispositivo/);assert.equal(store.revision,2);});
test('cuenta distinta del propietario no carga estado vacío como autorizado',async()=>{const store=new CloudStore(config,async()=>new Response('[]'));store.setSession({access_token:'test',expires_in:3600});await assert.rejects(()=>store.load(),/propietaria/);});

test('400 al entrar explica credenciales sin confundirlo con guardado',async()=>{
 const store=new CloudStore(config,async()=>new Response(JSON.stringify({code:400,error_code:'invalid_credentials',message:'sensitive backend detail'}),{status:400}));
 await assert.rejects(()=>store.login('user@example.org','test-only'),e=>e.message.includes('Email o contraseña incorrectos')&&!e.message.includes('guardado')&&!e.message.includes('sensitive'));
});
test('400 por email no confirmado muestra el paso concreto',async()=>{
 const store=new CloudStore(config,async()=>new Response(JSON.stringify({code:'email_not_confirmed'}),{status:400}));
 await assert.rejects(()=>store.login('user@example.org','test-only'),/email no está confirmado/);
});
test('errores RPC conservan contexto y código seguro sin exponer detalles SQL',async()=>{
 const store=new CloudStore(config,async()=>new Response(JSON.stringify({code:'23514',details:'private data',message:'private SQL'}),{status:400}));store.setSession({access_token:'test',expires_in:3600});
 await assert.rejects(()=>store.save({}),e=>e.message.includes('No se pudo guardar')&&e.message.includes('23514')&&!e.message.includes('private'));
});
test('respuestas no JSON no ocultan el estado HTTP',async()=>{
 const store=new CloudStore(config,async()=>new Response('<html>private</html>',{status:400}));
 await assert.rejects(()=>store.login('user@example.org','test-only'),e=>e.message.includes('HTTP 400')&&!e.message.includes('guardado')&&!e.message.includes('private'));
});
