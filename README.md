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

## Perfil y cuenta
Los controles de acceso, actualización y cierre de sesión están al final de Mi perfil. Sin sesión, se abre ese apartado antes de acceder a registros. Nombre, altura y sexo se muestran de solo lectura cuando ya tienen un valor guardado; se recuperan también de cálculos antiguos. La edad, los registros, la actividad y los objetivos siguen editables. Este bloqueo se aplica a la edición habitual; importar una copia es una sustitución explícita de datos. Los textos de la interfaz describen funciones y datos, sin mensajes motivadores.

## Importación FatSecret
Mi perfil → Copias de seguridad → Importar diario de FatSecret admite el CSV detallado de alimentos en inglés. Hay vista previa y selección independiente de historial y biblioteca. Se añaden registros sin reemplazar los existentes ni el perfil. Los totales y resúmenes se ignoran; las entradas usan los nutrientes consumidos. El identificador de origen incluye fecha, comida, alimento, cantidad, nutrientes y número de repetición: reimportar los mismos registros evita duplicarlos, incluso en archivos solapados. Si se modifican cantidades o nutrientes en FatSecret, se considera un registro distinto; revisa esos cambios para no mantener la versión anterior y la nueva. No se deduplican contra entradas manuales.

Las cantidades con gramos explícitos se normalizan por 100 g (el peso de etiquetas compuestas se interpreta como total). Volúmenes y medidas sin gramos conservan la ración completa; no se inventa densidad ni peso. La biblioteca toma la primera ficha por nombre/tipo de ración, por lo que puede haber dos fichas del mismo nombre si la unidad cambia. Faltas de micronutrientes se conservan como null. Los tests utilizan solo informes sintéticos: no añadas exportaciones personales al repositorio. El archivo se procesa en memoria y solo se suben registros a la BD privada tras confirmación.

## Recetas
Recetas permite buscar ingredientes del catálogo local, alimentos propios/FatSecret y Open Food Facts. Cada ingrediente conserva una copia de sus nutrientes y su cantidad en gramos o raciones. La receta muestra calorías y macros totales y por ración. Para obtener valores por 100 g se requiere el peso final preparado, sin inferirlo del peso en crudo. Editar o eliminar recetas no modifica lo registrado en el diario. El borrador vive en memoria hasta Guardar receta; las recetas guardadas se incluyen en el documento privado y en las copias JSON.

## Calendario semanal
Planifica alimentos y recetas de lunes a domingo, cambia cantidades y copia una semana a la siguiente sin duplicar copias existentes. Cada planificación conserva su ficha nutricional. En el diario de la fecha aparece como pendiente; se contabiliza una sola vez al pulsar Registrar, con opción de ajustar la cantidad. Copiar semanas no equivale a configurar una repetición indefinida. Eliminar una planificación registrada no borra su entrada del diario. Las recetas y planes son campos opcionales compatibles con las copias anteriores; no requieren cambiar el esquema SQL existente.

## Selector múltiple y frecuentes
El selector permite acumular alimentos, seguir buscando, corregir cantidades y confirmar la selección en un solo guardado. Se aplica al diario, calendario e ingredientes. Cambiar la comida seleccionada aplica esa comida a toda la selección y se indica antes de confirmar. Se sugieren hasta diez alimentos por frecuencia de registros consumidos de esa comida (incluido el historial importado); los empates se ordenan por recencia y nombre. Se propone la última cantidad utilizada. Las entradas planificadas sin confirmar no aumentan la frecuencia. Cuando no hay historial se muestra el catálogo. Las recetas no se anidan como ingredientes, para evitar dependencias circulares; se pueden usar como comidas en diario y calendario.

## Comidas guardadas (presets)
Desde cada comida del diario con alimentos registrados, Guardar preset conserva una copia de sus alimentos y cantidades, sin las fechas ni identificadores originales. También se puede guardar la selección del buscador sin registrar consumo. Al abrir el selector aparece Comidas guardadas: cargar un preset añade todos sus alimentos por separado a la selección actual. Se pueden modificar cantidades, quitar o añadir alimentos y confirmar después. Funciona con el diario, la planificación y los ingredientes del borrador de recetas. No crea un alimento combinado ni modifica el historial original. Los presets mantienen fichas nutricionales de la versión guardada; no siguen referencias vivas a recetas u otros registros. Se guardan en la base privada y en las copias JSON como un campo opcional compatible con copias anteriores. Un nombre repetido en la misma comida requiere confirmar su sustitución. Eliminar un preset conserva la selección y los registros existentes.

## Vista semanal unificada
El calendario utiliza una tabla única con los siete días en columnas y las cuatro comidas en filas. Muestra el total de calorías de cada día y comida, identifica la fecha seleccionada y mantiene navegación y copia de semanas en una barra común. Las cantidades y el estado pendiente/registrado permanecen junto a cada alimento. En móvil el desplazamiento horizontal se limita a la tabla y la columna de comidas permanece fija. Seleccionar una cabecera cambia la fecha activa del diario, conservando el desplazamiento de la tabla.

## Navegación del diario
La vista principal y su enlace se llaman Diario, conservando #hoy para enlaces existentes. La cabecera muestra la fecha consultada, permite avanzar o retroceder un día y tiene un botón Hoy para volver a la fecha local actual. Flechas, selector y texto de fecha se actualizan juntos, incluidos cambios de mes/año. Navegar no modifica registros. Los controles diarios solo aparecen en Diario; el selector de fecha sigue disponible en las otras vistas.

## Historial RENPHO
Evolución → Importar historial RENPHO admite el CSV con peso en kg. Hay vista previa y confirmación antes del guardado privado. Se conservan fecha y hora local tal como aparecen en el archivo, todas las mediciones de un mismo día y los valores adicionales de composición corporal. No se infiere una zona horaria. Los campos `--` se mantienen como desconocidos, no como cero. La deduplicación compara fecha, hora y medidas originales; una corrección de valores cuenta como otro registro. Los datos y estimaciones del dispositivo no modifican automáticamente los objetivos.

El gráfico utiliza una referencia por día (manual si existe, en su defecto la última medición importada), mostrando todo el periodo con distancias temporales proporcionales. El historial conserva todas las medidas. Añadir un peso manual no borra el historial RENPHO; eliminar una medida importada solo elimina esa medida. Los CSV personales permanecen fuera del repositorio y los tests usan datos sintéticos.

## Gráfica de tendencia
La gráfica se dimensiona con ResizeObserver al ancho real del contenedor, con ejes de fecha y peso, etiqueta del último punto visible, línea del peso objetivo guardado en el cálculo de perfil y regresión lineal de los puntos diarios visibles. La regresión usa días transcurridos, no índices de muestras; no es una predicción. Se conserva la referencia diaria manual o última medida del día. La escala vertical incluye objetivo y tendencia para no ocultarlos.

Rangos rápidos de 30/90/180/365 días hasta la última medición, todo el historial o fechas personalizadas. Los controles son de visualización y no cambian registros ni la fecha activa del diario. Los rangos vacíos o invertidos muestran un mensaje; una sola medida muestra su punto sin regresión. Si no hay peso objetivo guardado se indica cómo configurarlo. El rango de la gráfica se conserva en memoria durante la sesión de la página.

## Comparación y seguimiento de objetivos
Calorías y macros muestran porcentaje, diferencia y texto además del color: ámbar por debajo del 90 %, verde entre 90–110 % inclusive y rojo por encima del 110 %. Es un margen de comparación de producto, no un criterio clínico. Sin alimentos se muestra «Sin registros». Durante el día la comparación indica progreso.

Seguimiento de 7 o 28 días hasta la fecha consultada (limitada a hoy). Solo cuentan días con alimentos marcados completos manualmente; los incompletos o vacíos no se contabilizan como incumplimientos. Completar guarda los cuatro objetivos de referencia en `dayReviews`; cambiar el perfil no cambia retroactivamente ese día. Editar alimentos sí recalcula sus resultados. Reabrir elimina la referencia y usa los objetivos actuales. Las copias antiguas siguen siendo compatibles; no se requiere SQL adicional.

## Actividad y calorías extra
Diario permite registrar actividad directamente, además de la pestaña Actividad. Correr ofrece cinco ritmos y escalada tres modalidades (vía baja/moderada, alta y búlder). Las estimaciones usan MET del [Compendio de Actividades Físicas 2024, correr](https://pacompendium.com/running/) y [deportes](https://pacompendium.com/sports/): gasto **neto extra sobre reposo** ≈ `(MET − 1) × 3,5 × kg / 200 × minutos activos`. En escalada se excluyen descansos y aseguramiento. Son aproximaciones poblacionales, no mediciones individuales.

Se propone el último peso diario anterior o igual a la fecha consultada, con alternativa al último cálculo de perfil; el usuario puede corregirlo. Cada registro guarda método, MET, código de referencia, minutos, peso y gasto estimado para conservar su referencia histórica. El total aparece junto a las calorías del día sin cambiar ingesta, objetivos ni comparación de cumplimiento; el factor de actividad del predictor ya puede incluir ejercicio. Actividades antiguas u otros deportes siguen registrándose sin inventar su gasto. Los datos se guardan en el documento privado de Supabase y se incluyen en la exportación JSON. Las pruebas de persistencia remota utilizan Supabase simulado, sin acceder a datos personales.
