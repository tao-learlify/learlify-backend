# Configuración de Variables de Entorno para Railway

## ⚠️ IMPORTANTE: Configuración de Railway

Railway **NO usa archivos `.env`**. Las variables de entorno deben configurarse directamente en la plataforma.

## 🗄️ Paso 1: Crear Servicio MySQL en Railway

1. Ve a tu proyecto en Railway
2. Click en **"+ New"** → **"Database"** → **"Add MySQL"**
3. Railway creará automáticamente un servicio MySQL con estas variables:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`

## 🔗 Paso 2: Configurar Variables en tu Servicio de Aplicación

1. Ve a tu servicio de aplicación (learlify-backend)
2. Pestaña **"Variables"**
3. Click en **"+ New Variable"** o **"Raw Editor"**
4. Agrega las siguientes variables:

### Variables de Base de Datos (usando referencias de Railway)

```bash
# IMPORTANTE: Usa referencias a las variables del servicio MySQL
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_CLIENT=mysql2
```

> **Nota**: Reemplaza `MySQL` con el nombre exacto de tu servicio MySQL en Railway.

### Variables de Aplicación
NODE_ENV=production
HOST=0.0.0.0
PORT=3100

# Authentication (¡Usa un valor seguro en producción!)
JWT_SECRET=TH1S1STH3jwTSup3rS3cr3t1622dfas
JWT_EXPIRATION=30d

# AWS S3
AWS_ACCESS_KEY=tu_access_key
AWS_SECRET_KEY=tu_secret_key
AWS_BUCKET=aptisgo
AWS_REGION=us-east-1
CLOUDFRONT_NETWORK=https://tu-cloudfront.cloudfront.net/

# SendGrid
SENDGRID_API_KEY=tu_sendgrid_key

# Stripe
STRIPE_API_KEY=tu_stripe_key

# Twilio
TWILIO_API_ACCOUNT_SID=tu_account_sid
TWILIO_API_KEY_SID=tu_key_sid
TWILIO_API_KEY_SECRET=tu_key_secret

# Google
GOOGLE_API_KEY=tu_google_key

# Socket
SOCKET_HASH=tu_socket_hash
```

### Opción 2: Usar referencias de Railway

Railway proporciona variables automáticas para servicios como MySQL:

```bash
DB_HOST=${{MYSQLHOST}}           # Resuelve a: mysql.railway.internal
DB_PORT=${{MYSQLPORT}}           # Resuelve a: 3306
DB_USER=${{MYSQLUSER}}           # Resuelve a: root
DB_PASSWORD=${{MYSQLPASSWORD}}   # Resuelve a: tu_password_generado
DB_NAME=${{MYSQLDATABASE}}       # Resuelve a: railway
```

## 🐳 Desarrollo Local con Docker

### 1. Usando MySQL local (Docker Compose)

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales locales
# DB_HOST=localhost
# DB_PORT=3308
# DB_NAME=b1b2top
# ...

# Iniciar servicios
docker-compose up -d

# Ejecutar migraciones
npm run migrate

# Iniciar desarrollo
npm start
```

### 2. Usando MySQL de Railway (acceso externo)

```bash
# Copiar la configuración de desarrollo
cp .env.development .env

# Railway expone MySQL vía TCP proxy en:
# DB_HOST=maglev.proxy.rlwy.net
# DB_PORT=43930

# Ejecutar migraciones
npm run migrate

# Iniciar desarrollo
npm start
```

## 📝 Credenciales de Railway MySQL

Si estás usando el MySQL de Railway, estas son las credenciales actuales:

```bash
# Acceso Externo (desde tu máquina)
Host: maglev.proxy.rlwy.net
Port: 43930
User: root
Password: mwqJOfDPhAAmGUmcyvNQhngVlsFgmILP
Database: railway

# Acceso Interno (desde el contenedor en Railway)
Host: mysql.railway.internal
Port: 3306
User: root
Password: mwqJOfDPhAAmGUmcyvNQhngVlsFgmILP
Database: railway
```

## ⚙️ Ejecutar Migraciones en Railway

### Usando Railway CLI:

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Ejecutar migraciones
railway run npm run migrate
```

### Usando Variables de Referencia:

En Railway, configura un comando de inicio que ejecute migraciones:

```json
{
  "scripts": {
    "railway:start": "npm run migrate && npm start"
  }
}
```

## 🔒 Seguridad

⚠️ **IMPORTANTE:**

1. **Nunca** commits archivos `.env` con credenciales reales
2. Cambia el `JWT_SECRET` a un valor único y seguro en producción
3. Usa claves de Stripe de producción (`sk_live_*`) solo en producción
4. Rota las credenciales de base de datos periódicamente
5. Usa `AWS_BUCKET=aptispruebas` en desarrollo y `aptisgo` en producción

## 🧪 Testing

Para tests, configura variables de entorno separadas:

```bash
NODE_ENV=test
TEST_DB_HOST=localhost
TEST_DB_PORT=3306
TEST_DB_NAME=aptis_test
# ...
```

## 📚 Más Información

- [Railway Docs](https://docs.railway.app/)
- [Railway Variables](https://docs.railway.app/develop/variables)
- [Railway MySQL](https://docs.railway.app/databases/mysql)
