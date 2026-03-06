# Configuración de Variables de Entorno para Railway

Este proyecto incluye diferentes archivos de configuración de entorno para facilitar el desarrollo y despliegue.

## 📁 Archivos de Entorno

- **`.env`** - Configuración local (no incluido en git)
- **`.env.development`** - Configuración para desarrollo con Railway MySQL (no incluido en git)
- **`.env.railway`** - Configuración para producción en Railway (no incluido en git)
- **`.env.example`** - Plantilla con todas las variables necesarias (incluido en git)

## 🚀 Configuración para Railway

### Opción 1: Variables de Entorno en Railway UI

1. Ve a tu proyecto en Railway
2. Selecciona tu servicio
3. Ve a la pestaña **Variables**
4. Agrega las siguientes variables:

```bash
# Database (Railway automáticamente configura estas si usas su MySQL)
DB_HOST=${{MYSQLHOST}}
DB_PORT=${{MYSQLPORT}}
DB_USER=${{MYSQLUSER}}
DB_PASSWORD=${{MYSQLPASSWORD}}
DB_NAME=${{MYSQLDATABASE}}
DB_CLIENT=mysql2

# Application
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
