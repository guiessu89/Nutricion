# Apple Salud / Amazfit: sincronización con Nutrición

## Estado
Implementado en el repositorio: tablas privadas, Edge Function de ingestión y lectura de datos en la pantalla Actividad y el informe semanal. **No está desplegado todavía**: la base de datos y la función deben activarse en tu proyecto Supabase. El iPhone todavía no envía datos.

## 1. Preparar Supabase (una sola vez)
1. Abre Supabase > SQL Editor del proyecto que usa Nutrición.
2. Ejecuta `database/wearable.sql`. No modifica la tabla actual `private_state`.
3. En Edge Functions > Secrets, crea `WEARABLE_INGEST_TOKEN` con un valor aleatorio de al menos 32 caracteres. No lo publiques en GitHub ni en archivos del sitio.
4. Despliega `supabase/functions/wearable-ingest/index.ts` como función `wearable-ingest`, con verificación JWT **desactivada** para este endpoint: la función utiliza su propio secreto Bearer. Comprueba que `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` estén disponibles como variables de entorno.
5. URL del receptor: `https://zfcsbzeyeiukqexzxsdn.supabase.co/functions/v1/wearable-ingest`.

## 2. Enviar datos desde Atajos de iPhone
El receptor acepta POST JSON, con cabecera `Authorization: Bearer TU_TOKEN_PRIVADO` y `Content-Type: application/json`.

Ejemplo:
```json
{
  "days": [
    {
      "day": "2026-11-21",
      "steps": 12400,
      "distance_km": 9.2,
      "active_kcal": 620,
      "resting_kcal": null,
      "heart_rate_avg": null
    }
  ],
  "workouts": [
    {
      "external_id": "zepp-run-2026-11-21T09:00:00+01:00",
      "day": "2026-11-21",
      "kind": "Correr",
      "started_at": "2026-11-21T09:00:00+01:00",
      "duration_min": 32,
      "distance_km": 5.1,
      "active_kcal": 340,
      "heart_rate_avg": 151
    }
  ]
}
```
`external_id` debe ser estable entre sincronizaciones. Reenviar el mismo día y entrenamiento actualiza registros existentes (upsert).

### Atajo inicial: pasos y energía activa
En Atajos:
- Usa **Buscar muestras de Salud** para Pasos del día anterior. Agrupa por día o suma las muestras (no uses solo la primera muestra). Verifica que coincida con la cifra de Apple Salud.
- Repite para Distancia caminando/corriendo y Energía activa, si aparecen en Salud.
- Construye un Diccionario con la clave `days` que contenga una Lista de diccionarios con las claves del ejemplo. `workouts` puede ser una Lista vacía.
- Usa **Obtener contenido de URL**, método POST, cuerpo JSON, URL anterior y cabecera Authorization con el token. Prueba manualmente y comprueba que responde `{"ok":true,...}`.
- Configura una automatización personal diaria para ejecutar el atajo por la mañana con los datos del día anterior. Reenvía también días anteriores si Zepp se sincronizó tarde.

**Limitación importante:** las acciones nativas de Atajos no exponen de forma consistente los objetos completos de entrenamientos de HealthKit. Para importar automáticamente las carreras como sesiones, con fecha, duración, distancia y pulsaciones, podría ser necesaria una app puente compatible con HealthKit o una pequeña app iOS. No se debe inventar una carrera a partir de la energía activa del día.

## 3. Comportamiento
- Los datos automáticos se almacenan en `wearable_days` y `wearable_workouts`, **separados** de las comidas y de las actividades manuales.
- La web muestra los datos tras iniciar sesión y los incluye en el resumen semanal.
- No se suman las kcal de un entrenamiento con la energía activa diaria, porque esta última puede incluir el entrenamiento.
- La escalada se sigue registrando manualmente en Nutrición.
- Los pasos manuales anteriores se conservan.
- Solo se aceptan envíos autenticados con el token; la lectura requiere la cuenta autorizada de Nutrición.
- Evita sincronizar datos de rutas GPS o ubicación precisa: el receptor no los necesita.

## 4. Comprobación
Prueba primero con un día y compara pasos, distancia y energía activa con Salud. Luego verifica que una segunda ejecución no crea duplicados. Si la pantalla dice «La integración ... todavía no está configurada», verifica la ejecución del SQL y los permisos.
