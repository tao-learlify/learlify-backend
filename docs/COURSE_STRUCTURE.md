# Estructura de Cursos y Progreso del Usuario

**Documento:** Documentación técnica de la arquitectura de cursos, avances y progreso.

**Última actualización:** 2026-04-23

**Versión:** 2.0 (Post-refactor con units planos)

---

## 📋 Tabla de Contenidos

1. [Modelos de Datos](#modelos-de-datos)
2. [Relaciones](#relaciones)
3. [Campo `content` (Progreso)](#campo-content-progreso)
4. [Flujo de Datos](#flujo-de-datos)
5. [Ejemplos](#ejemplos)
6. [API Endpoints](#api-endpoints)

---

## 🗂️ Modelos de Datos

### 1. **Course** (`courses` table)

Representa un curso dentro de una asignatura/modelo de examen.

#### Campos:

```
┌─────────────┬─────────┬──────────────────────────────────┐
│ Campo       │ Tipo    │ Descripción                      │
├─────────────┼─────────┼──────────────────────────────────┤
│ id          │ Integer │ PK - Identificador único         │
│ order       │ Integer │ Orden del curso en el modelo     │
│ modelId     │ Integer │ FK → exam_models.id              │
│ createdAt   │ String  │ Timestamp de creación            │
│ updatedAt   │ String  │ Timestamp de última actualización│
└─────────────┴─────────┴──────────────────────────────────┘
```

#### Ejemplo:

```json
{
  "id": 1,
  "order": 1,
  "modelId": 1,
  "createdAt": "2020-02-17T15:40:44.000Z",
  "updatedAt": "2020-02-17T15:40:44.000Z"
}
```

#### Relaciones:
- **1:1** con `View` → Metadatos del curso (URL del CDN)
- **1:1** con `Models` → Modelo de examen (ej: "Aptis")
- **1:N** con `Advance` → Progresos de múltiples usuarios

---

### 2. **Advance** (`advance` table)

Representa el progreso de un usuario en un curso específico.

#### Campos:

```
┌──────────────┬─────────┬──────────────────────────────────────────┐
│ Campo        │ Tipo    │ Descripción                              │
├──────────────┼─────────┼──────────────────────────────────────────┤
│ id           │ Integer │ PK - Identificador único                 │
│ userId       │ Integer │ FK → users.id                            │
│ courseId     │ Integer │ FK → courses.id                          │
│ content      │ Object  │ Progreso JSON (ver sección "content")    │
│ createdAt    │ String  │ Cuando el usuario se inscribió           │
│ updatedAt    │ String  │ Última vez que se actualizó progreso     │
└──────────────┴─────────┴──────────────────────────────────────────┘
```

#### Ejemplo:

```json
{
  "id": 61,
  "userId": 4,
  "courseId": 1,
  "content": {
    "1": { "general": 0, "completed": false, "last": false },
    "2": { "general": 30, "completed": false, "last": true },
    "3": { "general": 31, "completed": false, "last": false }
  },
  "createdAt": "2020-04-26T14:37:35.000Z",
  "updatedAt": "2026-04-23T14:37:35.000Z"
}
```

#### Relaciones:
- **N:1** con `User` → Usuario propietario del progreso
- **N:1** con `Course` → Curso al que pertenece el progreso

---

### 3. **View** (`views` table)

Metadatos del curso (URL del JSON de configuración alojado en CDN).

#### Campos:

```
┌──────────────┬─────────┬──────────────────────────────────┐
│ Campo        │ Tipo    │ Descripción                      │
├──────────────┼─────────┼──────────────────────────────────┤
│ id           │ Integer │ PK - Identificador único         │
│ courseId     │ Integer │ FK → courses.id                  │
│ url          │ String  │ URL CDN del JSON del curso       │
│ createdAt    │ String  │ Timestamp de creación            │
│ updatedAt    │ String  │ Timestamp de última actualización│
└──────────────┴─────────┴──────────────────────────────────┘
```

#### Ejemplo:

```json
{
  "id": 1,
  "courseId": 1,
  "url": "https://dkmwdxc6g4lk7.cloudfront.net/courses/aptis.json",
  "createdAt": "2020-02-17T15:40:44.000Z",
  "updatedAt": "2020-02-17T15:40:44.000Z"
}
```

---

## 🔗 Relaciones

```
┌──────────────────────────────────────────────────────────┐
│                      Models (exam_models)                │
│  (id, name: "Aptis", color: "#EBB02C")                  │
└────────────────────┬─────────────────────────────────────┘
                     │ 1:N
                     │ (modelId)
                     ▼
        ┌────────────────────────┐
        │      Course            │
        │ (id, order, modelId)   │ ◄─────────┐
        └────────────────────────┘           │
         ▲          │                        │
         │ 1:1      │ 1:N                   │ 1:1 (View)
         │          │ (courseId)            │
    (View)      (courseId)             (views table)
         │          │
         │          ▼
         │    ┌──────────────────────┐
         └────│     Advance          │
              │ (id, userId,         │
              │  courseId, content)  │
              └──────────────────────┘
                     ▲
                     │ N:1 (userId)
                     │
                  User
              (id, email, name)
```

---

## 📦 Campo `content` (Progreso)

El campo `content` en la tabla `Advance` es un **JSON Object** que almacena el progreso del usuario en cada sección del curso.

### Estructura del `content`:

```json
{
  "1": {
    "general": 0,
    "completed": false,
    "last": false
  },
  "2": {
    "general": 30,
    "completed": false,
    "last": true
  },
  "3": {
    "general": 31,
    "completed": true,
    "last": false
  }
}
```

### Campos por sección:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| **general** | Number | Puntos de experiencia (XP) ganados en esa sección |
| **completed** | Boolean | Si el usuario completó la sección (pasó todos los ejercicios) |
| **last** | Boolean | Marca la sección actual que el usuario está viendo (SOLO UNA debe ser `true`) |

### Restricciones:

- ✅ **Exactamente UNA sección** debe tener `"last": true` en cada momento
- ✅ **Las claves son strings numéricos** (índices de secciones: "1", "2", "3", etc.)
- ✅ **Las secciones se pueden omitir** si el usuario nunca las ha tocado
- ✅ **No se borran**, se guardan todas las que el usuario ha visto

---

## 🔄 Flujo de Datos

### 1. Usuario se inscribe en un curso

```
POST /api/v1/courses/inscription
├─ Body: { courseId: 1 }
├─ Acción: Crear nuevo Advance
│           {
│             userId: 4,
│             courseId: 1,
│             content: {}
│           }
└─ Respuesta:
   {
     "units": [],
     "advanceId": 61
   }
```

### 2. Usuario accede al curso y ve secciones

```
GET /api/v1/courses?model=Aptis&demo=false
├─ Query: Fetch Course + Advance del usuario
├─ Acción: getAllSectionsWithProgress()
│           → Transforma content → array plano de units
└─ Respuesta:
   {
     "units": [
       { "sectionIndex": 1, "xp": 0, "completed": false, "lastAccessed": false },
       { "sectionIndex": 2, "xp": 30, "completed": false, "lastAccessed": true },
       { "sectionIndex": 3, "xp": 31, "completed": true, "lastAccessed": false }
     ],
     "courses": [...]
   }
```

### 3. Usuario completa ejercicios en sección 2

```
PATCH /api/v1/advance/update
├─ Body: { courseId: 1, unit: 2, general: 50, completed: true, last: true }
├─ Acción: 
│   1. Buscar Advance con userId + courseId
│   2. Actualizar content[2] = { general: 50, completed: true, last: true }
│   3. Marcar content[1].last = false, content[3].last = false
│   4. Guardar Advance
└─ Respuesta: Advance actualizado
```

### 4. Frontend obtiene nuevamente el estado

```
GET /api/v1/courses?model=Aptis&demo=false
└─ Respuesta:
   {
     "units": [
       { "sectionIndex": 1, "xp": 0, "completed": false, "lastAccessed": false },
       { "sectionIndex": 2, "xp": 50, "completed": true, "lastAccessed": true },  ◄─ Actualizado
       { "sectionIndex": 3, "xp": 31, "completed": true, "lastAccessed": false }
     ]
   }
```

---

## 💾 Ejemplos

### Ejemplo 1: Usuario nuevo (sin progreso)

**Base de datos:**

```sql
-- courses
id | order | modelId | createdAt
1  | 1     | 1       | 2020-02-17

-- advance
id | userId | courseId | content
61 | 4      | 1        | {} (vacío)
```

**Respuesta API:**

```json
{
  "units": [],
  "courses": [
    {
      "id": 1,
      "totalSections": 0,
      "model": { "id": 1, "name": "Aptis" },
      "views": { "url": "https://..." }
    }
  ]
}
```

---

### Ejemplo 2: Usuario con progreso parcial

**Base de datos:**

```sql
-- advance.content
{
  "1": { "general": 0, "completed": true, "last": false },
  "2": { "general": 30, "completed": false, "last": true },
  "3": { "general": 31, "completed": false, "last": false },
  "4": { "general": 0, "completed": false, "last": false },
  "5": { "general": 0, "completed": false, "last": false },
  "6": { "general": 0, "completed": false, "last": false }
}
```

**Respuesta API:**

```json
{
  "units": [
    {
      "sectionIndex": 1,
      "xp": 0,
      "completed": true,
      "completedAt": "2026-03-15T10:00:00.000Z",
      "lastAccessed": false
    },
    {
      "sectionIndex": 2,
      "xp": 30,
      "completed": false,
      "lastAccessed": true,
      "lastAccessedAt": "2026-04-23T14:37:35.000Z"
    },
    {
      "sectionIndex": 3,
      "xp": 31,
      "completed": false,
      "lastAccessed": false
    },
    {
      "sectionIndex": 4,
      "xp": 0,
      "completed": false,
      "lastAccessed": false
    },
    {
      "sectionIndex": 5,
      "xp": 0,
      "completed": false,
      "lastAccessed": false
    },
    {
      "sectionIndex": 6,
      "xp": 0,
      "completed": false,
      "lastAccessed": false
    }
  ],
  "courses": [
    {
      "id": 1,
      "totalSections": 6,
      "model": { "id": 1, "name": "Aptis", "color": "#EBB02C" },
      "views": {
        "url": "https://dkmwdxc6g4lk7.cloudfront.net/courses/aptis.json",
        "createdAt": "2020-02-17T15:40:44.000Z"
      }
    }
  ],
  "statusCode": 200
}
```

---

### Ejemplo 3: Usuario completa todo

**Base de datos:**

```sql
-- advance.content
{
  "1": { "general": 100, "completed": true, "last": false },
  "2": { "general": 95, "completed": true, "last": false },
  "3": { "general": 87, "completed": true, "last": false },
  "4": { "general": 92, "completed": true, "last": true },
  "5": { "general": 88, "completed": true, "last": false },
  "6": { "general": 90, "completed": true, "last": false }
}
```

**Cálculos del Frontend:**

- **Total XP:** 100 + 95 + 87 + 92 + 88 + 90 = **552 XP**
- **Progreso:** 6/6 secciones completadas = **100%**
- **Estado:** Completado
- **Última sección accedida:** Sección 4

---

## 🔌 API Endpoints

### 1. Obtener todos los cursos con progreso

```
GET /api/v1/courses?model=Aptis&demo=false
Authorization: Bearer <token>
Accept-Language: es

Response: 200
{
  "message": "Courses Obtained Successfully",
  "response": {
    "units": [ /* array plano de secciones */ ],
    "courses": [ /* cursos con metadata */ ]
  },
  "statusCode": 200
}
```

### 2. Inscribirse en un curso

```
POST /api/v1/courses/inscription
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": 1
}

Response: 201
{
  "message": "Inscription successfully created",
  "response": {
    "units": [],
    "advanceId": 61
  },
  "statusCode": 201
}
```

### 3. Actualizar progreso en una sección

```
PATCH /api/v1/advance/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": 1,
  "unit": 2,
  "general": 50,
  "completed": true,
  "last": true
}

Response: 201
{
  "response": { /* Advance actualizado */ },
  "statusCode": 201
}
```

---

## 📊 Diagrama de Transformación

```
Database (Advance.content):
┌─────────────────────────────────────────┐
│ {                                       │
│   "1": { general: 0, completed: true,  │
│          last: false },                 │
│   "2": { general: 30, completed: false,│
│          last: true },                  │
│   "3": { general: 31, completed: false,│
│          last: false }                  │
│ }                                       │
└──────────────────┬──────────────────────┘
                   │ getAllSectionsWithProgress()
                   ▼
API Response (units array):
┌─────────────────────────────────────────┐
│ [                                       │
│   { sectionIndex: 1, xp: 0, completed: │
│     true, completedAt: "...",           │
│     lastAccessed: false },              │
│   { sectionIndex: 2, xp: 30, completed:│
│     false, lastAccessed: true,          │
│     lastAccessedAt: "..." },            │
│   { sectionIndex: 3, xp: 31, completed:│
│     false, lastAccessed: false }        │
│ ]                                       │
└─────────────────────────────────────────┘
```

---

## 🛠️ Notas Técnicas

### ¿Por qué guardar `content` como JSON?

- **Flexibilidad:** Permite agregar nuevos campos sin migración BD
- **Escalabilidad:** No necesita tabla separada por sección
- **Rendimiento:** Una query por usuario + curso
- **Historial:** Se pueden guardar snapshots del progreso

### ¿Por qué `last: true` en lugar de `currentSectionIndex`?

En la **base de datos** se usa `last: true` por compatibilidad con datos históricos.

En la **API** se retorna transformado:
- `units[]` — array plano (más fácil iterar en frontend)
- `lastAccessed: boolean` — indica si es la sección actual
- `sectionIndex` — índice explícito para mapeo

### Transiciones de progreso

```
Usuario abre sección 2:
  advance.content["2"].last = true   ✓
  advance.content["1"].last = false  ✓
  advance.content["3"].last = false  ✓
  
Usuario completa sección 2:
  advance.content["2"].general = 50     ✓
  advance.content["2"].completed = true ✓
  advance.updatedAt = now()             ✓
```

---

## 📝 Cambios Recientes (v2.0)

### Antes (v1.0)

```json
{
  "response": {
    "advance": [{ id, currentSectionIndex, sections: {...} }],
    "courses": [...]
  }
}
```

### Después (v2.0 - Actual)

```json
{
  "response": {
    "units": [{ sectionIndex, xp, completed, lastAccessed, ... }],
    "courses": [...]
  }
}
```

**Beneficios:**
- ✅ Array plano → más fácil iterar
- ✅ Campos explícitos → sin búsquedas
- ✅ Ordenado por `sectionIndex`
- ✅ Timestamps claros (`completedAt`, `lastAccessedAt`)

---

## 🔮 Futuras Mejoras

- [ ] Agregar campos de duración estimada por sección
- [ ] Almacenar ejercicios completados dentro de cada sección
- [ ] Historial de intentos por sección
- [ ] Badges/achievements desbloqueados
- [ ] Sincronización en tiempo real con WebSocket

---

**Fin del documento**
