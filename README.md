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
Con la configuración de Supabase, los registros se guardan en PostgreSQL y requieren la cuenta autorizada. La sesión y el estado de trabajo se mantienen solo en memoria. Al recargar debes iniciar sesión de nuevo. Exporta copias desde Mi perfil. Los datos locales de la versión anterior se conservan para una migración explícita; no se importan ni eliminan automáticamente.

50 alimentos genéricos orientativos por 100 g; no son una biblioteca certificada USDA. Comprobar etiquetas y preparación. Se pueden crear alimentos propios y buscar productos de Open Food Facts con conexión (datos ODbL, https://world.openfoodfacts.org/data). Las llamadas pueden fallar por CORS, disponibilidad o límites del servicio. El catálogo local sigue funcionando. La integración online aún debe verificarse en un navegador con acceso a Internet.

Los objetivos iniciales son ejemplos, no estimaciones personalizadas ni consejo médico. El ejercicio se registra sin restar calorías. No hay escáner de códigos ni recetas todavía. Para ver cambios de otro dispositivo usa Actualizar; los conflictos de escritura exigen recargar.

## Estimación de objetivos
Mi perfil → Calcula tus objetivos estima gasto en reposo con Mifflin–St Jeor y mantenimiento con actividad. Previsualiza calorías y macros y aplícalos explícitamente. Las fuentes y reglas prácticas están enlazadas en el calculador. El plan por peso objetivo ofrece un plazo orientativo con un modelo simplificado, no una predicción clínica ni una garantía de pérdida de peso; el ejercicio ya está incluido en la actividad. El porcentaje de grasa de báscula se registra en Evolución y calcula masa libre de grasa, sin modificar objetivos automáticamente.

Fuentes de referencia: Mifflin et al. 1990 (PMID 2305711), revisión Frankenfield et al. 2005 (PMID 15883556), consenso ISSN proteína/ejercicio 2017 (PMC5477153). El acceso a los artículos fue bloqueado por la política de red durante esta implementación; no se realizó una revisión sistemática actualizada. Los factores de actividad, el ajuste energético y el reparto concreto de macros son decisiones explícitas de producto, no resultados directos de esos estudios.

## Base de datos privada
Integración Supabase configurada con URL del proyecto y clave pública. Sigue [database/README.md](database/README.md) y ejecuta el esquema SQL antes de conectar. En instalaciones sin URL y clave pública la app sigue en modo local, identificado explícitamente. Con Supabase configurado los registros y la sesión viven solo en memoria del navegador mientras la pestaña está abierta; los datos persistentes viven en PostgreSQL. No se borra ni migra automáticamente ningún dato local.

## Ajuste vinculado de objetivos
El déficit puede elegirse entre 5 y 25 % (máximo 500 kcal hasta 20 %, o 750 kcal por encima); el predictor mantiene los límites automáticos previos. Hay cinco niveles de actividad y un factor personalizado. Antes de aplicar o desde Datos y objetivos, editar calorías escala macros; editar un macro conserva calorías y reparte la energía restante entre los otros dos según sus proporciones, manteniendo al menos 1 g por macro. Se admiten décimas de gramo y una diferencia de redondeo de hasta 0,5 kcal. Los cambios solo se persisten al Aplicar o Guardar.

## Plan por peso objetivo
En pérdida de peso, el modo predeterminado pide un peso objetivo y ritmo moderado (0,25 % del peso inicial/semana), medio (0,5 %) o rápido (0,75 %). Calcula el déficit inicial con 7700 kcal/kg, limitado al 25 % del gasto y 750 kcal/día, manteniendo los límites automáticos de ingesta y reparto. El modo manual por porcentaje sigue disponible.

El plazo integra dW/dt = −(TDEE(W)−ingesta)/7700 con TDEE(W) de Mifflin y actividad constante. Se expresa en semanas aproximadas; contempla el menor gasto al bajar peso, pero no agua, composición corporal cambiante, adherencia ni adaptación metabólica adicional. No es el modelo validado de Hall/NIDDK. Si el objetivo queda por debajo del equilibrio previsto o el plazo supera dos años, se pide revisar por etapas. Editar calorías actualiza el plazo antes o después de aplicar. El plan guarda peso de partida, objetivo y ritmo: el plazo mostrado es desde ese punto de partida, no un contador de semanas restantes. Recalcular con los nuevos registros cada 2–4 semanas.
