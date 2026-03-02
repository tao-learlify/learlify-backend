# Carpeta de inicialización de la base de datos

Coloca aquí tu archivo `backup.sql` (o cualquier `.sql`).

MySQL ejecuta automáticamente **todos los archivos `.sql` de esta carpeta**
en orden alfabético la primera vez que el volumen `db_data` se crea desde cero.

## Uso

```bash
# 1. Copia el backup al lugar correcto
cp /ruta/a/tu/backup.sql db/init/backup.sql

# 2. Levanta los servicios
docker compose up -d

# El log de MySQL mostrará:
# [Entrypoint]: /docker-entrypoint-initdb.d/backup.sql
```

## Notas

- Si `db_data` ya existe (contenedor previo), el init **no** se vuelve a ejecutar.
  Para forzarlo, destruye el volumen primero:
  ```bash
  docker compose down -v   # elimina el volumen db_data
  docker compose up -d     # vuelve a crearlo y aplica el sql
  ```
- Los archivos son montados como `:ro` (read-only) por seguridad.
- El archivo `.gitkeep` mantiene la carpeta rastreada por Git sin subir el sql.
