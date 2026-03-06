# Migraciones en Railway

Este script te permite ejecutar migraciones de base de datos en Railway desde tu máquina local usando las credenciales de conexión.

## 📋 Requisitos Previos

1. **Archivo `.env.railway` configurado**:
   ```bash
   cp .env.example .env.railway
   ```
   
2. **Configurar credenciales de Railway en `.env.railway`**:
   ```bash
   # Obtén estos valores desde Railway > Tu Servicio MySQL > Variables
   DB_HOST=maglev.proxy.rlwy.net  # o la URL del proxy TCP de Railway
   DB_PORT=43930                   # puerto del proxy
   DB_USER=root
   DB_PASSWORD=tu_password_de_railway
   DB_NAME=railway
   DB_CLIENT=mysql2
   
   # Resto de variables...
   NODE_ENV=production
   ```

## 🚀 Uso

### Opción 1: Usando npm script (Recomendado)
```bash
npm run migrate:railway
```

### Opción 2: Ejecutando el script directamente
```bash
./migrate-railway.sh
```

## 🔍 ¿Qué hace el script?

1. ✅ Verifica que el archivo `.env.railway` exista
2. 🔄 Carga las variables de entorno desde `.env.railway`
3. 🔄 Ejecuta las migraciones localmente conectándose a Railway
4. ✅ Muestra confirmación de éxito

## 📝 Notas Importantes

- Las migraciones se ejecutan **desde tu máquina local** conectándose a la base de datos de Railway
- Usa el **TCP Proxy** de Railway para conectarse desde fuera de la red interna
- Asegúrate de usar las credenciales correctas en `.env.railway`
- El archivo `.env.railway` está en `.gitignore` por seguridad

## 🔗 Cómo obtener las credenciales de Railway

1. Ve a Railway > Tu Proyecto > Servicio MySQL
2. Pestaña **"Variables"**
3. Copia los valores de:
   - `MYSQLHOST` → `DB_HOST`
   - `MYSQLPORT` → `DB_PORT`
   - `MYSQLUSER` → `DB_USER`
   - `MYSQLPASSWORD` → `DB_PASSWORD`
   - `MYSQLDATABASE` → `DB_NAME`

Para conexión externa (desde local), usa el **TCP Proxy**:
1. Railway > MySQL Service > **"Settings"**
2. Sección **"Networking"** > **"TCP Proxy"**
3. Usa esa URL y puerto en `.env.railway`

## 🐛 Troubleshooting

### Error: El archivo .env.railway no existe
```bash
cp .env.example .env.railway
# Edita .env.railway con las credenciales de Railway
```

### Error: Connection refused / ECONNREFUSED
- Verifica que el **TCP Proxy** de Railway esté habilitado
- Usa la URL y puerto del TCP Proxy, no la conexión interna
- Verifica que tu IP no esté bloqueada por Railway

### Error: Access denied for user
- Verifica que el usuario y contraseña sean correctos
- Copia los valores exactos desde Railway > MySQL > Variables

### Error: Unknown database
- Verifica que el nombre de la base de datos sea correcto
- Por defecto Railway usa `railway` como nombre de base de datos

### Error: Cannot find module
- Ejecuta `npm install` para asegurar que todas las dependencias estén instaladas
- Verifica que `ts-node` esté instalado

## ⚙️ Desarrollo Local vs Railway

Para ejecutar migraciones en **desarrollo local** (Docker):
```bash
npm run migrate
```
Usa las credenciales de `.env` (localhost:3308)

Para ejecutar migraciones en **Railway**:
```bash
npm run migrate:railway
```
Usa las credenciales de `.env.railway` (Railway TCP Proxy)
