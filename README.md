# Mi Nutrición
App personal en español, estática y sin dependencias de ejecución. Diario de alimentos y macros, objetivos editables, peso y medidas, ejercicio y copias JSON.

## Desarrollo
Requiere Node 24 para pruebas y Python 3 para servidor local. Ejecutar `npm ci`, `npm test` y `npm start` desde este directorio. Para pruebas de interfaz: `npm run test:ui` con Chromium instalado en `/usr/bin/chromium` o mediante `npx playwright install chromium`. Las pruebas arrancan su propio servidor si no hay uno activo. Abrir el puerto 5173 en el navegador durante desarrollo. Playwright es una dependencia de desarrollo. La aplicación no necesita claves.

## Publicación
Subir los archivos a main y configurar Settings → Pages → Source: GitHub Actions. El workflow ejecuta pruebas y publica únicamente los cuatro archivos de la aplicación. Publicación confirmada en GitHub Actions para el commit 39d3e81: https://guiessu89.github.io/Nutricion/. El workflow comprueba datos, copias de seguridad y navegación móvil antes de desplegar nuevas versiones.

### Si el despliegue falla con «Get Pages site failed / Not Found»
1. Abre https://github.com/guiessu89/Nutricion/settings/pages con la cuenta propietaria.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**. Activar Actions en otra pantalla no activa Pages.
3. En **Actions → Publicar en GitHub Pages**, ejecuta **Run workflow** sobre **main**. Volver a ejecutar un run antiguo usa su versión antigua del workflow.
4. Comprueba que `deploy` termina en verde; entonces abre la URL indicada por GitHub en el resultado.

Si no aparece la opción Pages, revisa el mensaje de GitHub sobre visibilidad, plan o políticas de la organización. No hace falta crear ni compartir un token: la activación se hace desde Settings. `enablement: true` no sirve con el GITHUB_TOKEN habitual, según la documentación de configure-pages.

## Datos y límites
Los registros se guardan en localStorage del navegador y no se sincronizan entre dispositivos. Exportar copias desde Mi perfil. No borrar almacenamiento sin copia. No hay autenticación: cualquier persona con acceso al perfil del navegador puede acceder a los datos.

50 alimentos genéricos orientativos por 100 g; no son una biblioteca certificada USDA. Comprobar etiquetas y preparación. Se pueden crear alimentos propios y buscar productos de Open Food Facts con conexión (datos ODbL, https://world.openfoodfacts.org/data). Las llamadas pueden fallar por CORS, disponibilidad o límites del servicio. El catálogo local sigue funcionando. La integración online aún debe verificarse en un navegador con acceso a Internet.

Los objetivos iniciales son ejemplos, no estimaciones personalizadas ni consejo médico. El ejercicio se registra sin restar calorías. No hay escáner de códigos, recetas ni sincronización todavía.

## Estimación de objetivos
Mi perfil → Calcula tus objetivos estima gasto en reposo con Mifflin–St Jeor y mantenimiento con actividad. Previsualiza calorías y macros y aplícalos explícitamente. Las fuentes y reglas prácticas están enlazadas en el calculador. No es una predicción clínica ni garantiza pérdida de peso; el ejercicio ya está incluido en la actividad. El porcentaje de grasa de báscula se registra en Evolución y calcula masa libre de grasa, sin modificar objetivos automáticamente.

Fuentes de referencia: Mifflin et al. 1990 (PMID 2305711), revisión Frankenfield et al. 2005 (PMID 15883556), consenso ISSN proteína/ejercicio 2017 (PMC5477153). El acceso a los artículos fue bloqueado por la política de red durante esta implementación; no se realizó una revisión sistemática actualizada. Los factores de actividad, el ajuste energético y el reparto concreto de macros son decisiones explícitas de producto, no resultados directos de esos estudios.
