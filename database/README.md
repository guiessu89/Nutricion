# Activar la base de datos privada (Supabase)

1. Crea un proyecto en https://supabase.com/dashboard (elige región UE si prefieres). La contraseña de PostgreSQL no se necesita en la aplicación.
2. En SQL Editor ejecuta `database/schema.sql` una vez. Crea tablas privadas y reglas RLS. El esquema debe instalarse antes de publicar la conexión.
3. En Authentication → Users crea tu usuario con email confirmado y contraseña. Desactiva nuevos registros públicos en la configuración de Auth. No compartas la contraseña aquí ni la añadas al repositorio.
4. Copia su UUID y ejecuta en SQL Editor: `insert into public.app_owner(singleton,user_id) values(true,'TU-UUID');`. Solo cabe un propietario. Los demás usuarios, incluso autenticados, no pueden leer/escribir los datos.
5. En `cloud-config.js` configura la URL del proyecto y su clave **publishable** o **anon**. Son públicas; la seguridad reside en Auth y RLS. Nunca uses `service_role`, `sb_secret_…`, contraseña de BD ni JWT de usuario. No hay conexión directa de GitHub Pages a PostgreSQL: usa HTTPS con PostgREST.
6. Con el proyecto real, verifica: anónimo no lee; otro usuario no lee/escribe; propietario guarda y recarga; dos dispositivos con la misma revisión producen conflicto en el segundo guardado. Verifica políticas antes de importar datos reales. Las pruebas locales usan un servicio simulado; no sustituyen estos controles reales.
7. Publica el cambio. Inicia sesión desde la app. La sesión se mantiene solo en memoria; al recargar tendrás que iniciar sesión de nuevo. Los registros no se guardan en localStorage ni sessionStorage cuando Supabase está configurado. No hay modo sin conexión ni guardado silencioso local: un fallo bloquea edición, permite exportar los pendientes y recargar desde la BD.
8. Desde Mi perfil exporta primero el registro antiguo si existe. Luego usa **Migrar datos antiguos del navegador** o importa el JSON. La migración solo se permite si la BD está vacía. El original local no se elimina; tras comprobar la BD desde otro dispositivo puedes borrarlo manualmente en el navegador.

## Modelo inicial
Una fila privada por propietario almacena el documento versionado con perfil, diario, peso, medidas, actividad y alimentos propios. PostgreSQL es la fuente de verdad. La actualización compara revisión y se ejecuta de forma atómica; un conflicto exige recargar, no sobrescribe automáticamente. Es un modelo simple para un diario personal; migraciones futuras pueden separar tablas sin cambiar el contenido de las copias JSON.

El catálogo genérico y las consultas a Open Food Facts siguen separados de los datos privados. No se ha creado una copia compartida de OFF en Supabase. El diario conserva los nutrientes originales de cada comida.

## Copias
La exportación JSON sigue disponible. La base de datos remota no sustituye una copia de seguridad: comprueba retención/backups de tu plan Supabase y exporta periódicamente. En modo local (sin configurar) se conserva el comportamiento anterior y la app avisa de que todavía no usa la BD; no se presenta como persistencia remota.
