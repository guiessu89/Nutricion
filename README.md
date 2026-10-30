# Mi Nutrición
App personal en español, estática y sin dependencias de ejecución. Diario de alimentos y macros, objetivos editables, peso y medidas, ejercicio y copias JSON.

## Desarrollo
Requiere Node 24 para pruebas y Python 3 para servidor local. Ejecutar `npm ci`, `npm test` y `npm start` desde este directorio. Para pruebas de interfaz: `npm run test:ui` con Chromium instalado en `/usr/bin/chromium` y el servidor arrancado. Abrir el puerto 5173 en el navegador durante desarrollo. Playwright es una dependencia de desarrollo. La aplicación no necesita claves.

## Publicación
Subir los archivos a main y configurar Settings → Pages → Source: GitHub Actions. El workflow ejecuta pruebas y publica únicamente los cuatro archivos de la aplicación. No se ha publicado desde este entorno.

## Datos y límites
Los registros se guardan en localStorage del navegador y no se sincronizan entre dispositivos. Exportar copias desde Mi perfil. No borrar almacenamiento sin copia. No hay autenticación: cualquier persona con acceso al perfil del navegador puede acceder a los datos.

50 alimentos genéricos orientativos por 100 g; no son una biblioteca certificada USDA. Comprobar etiquetas y preparación. Se pueden crear alimentos propios y buscar productos de Open Food Facts con conexión (datos ODbL, https://world.openfoodfacts.org/data). Las llamadas pueden fallar por CORS, disponibilidad o límites del servicio. El catálogo local sigue funcionando. La integración online aún debe verificarse en un navegador con acceso a Internet.

Los objetivos iniciales son ejemplos, no estimaciones personalizadas ni consejo médico. El ejercicio se registra sin restar calorías. No hay escáner de códigos, recetas ni sincronización todavía.
