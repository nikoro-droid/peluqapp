# PeluqApp

Sistema multi-tenant de turnos para peluquerias con bot de WhatsApp, API Express, panel web React y gestion de suscripciones mensuales.

## Arquitectura

- **WhatsApp bot**: recibe webhooks de Evolution API, identifica el negocio por `evolution_instance`, conversa con clientes usando Gemini y permite comandos simples del dueno.
- **API Express**: expone autenticacion JWT, rutas del superadmin, rutas del negocio, turnos, bloqueos, servicios, pagos y suscripciones.
- **Panel React**: vive en `/panel`, usa Vite + TailwindCSS y se sirve como build estatico desde Express.

## Setup

```bash
npm install
cd panel
npm install
cd ..
copy .env.example .env
npm run dev
```

Variables:

```env
PORT=3000
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=
GEMINI_API_KEY=
SUPERADMIN_EMAIL=
SUPERADMIN_PASSWORD=
JWT_SECRET=
JWT_EXPIRES_IN=8h
```

## Primer uso

1. Abrir `/panel`.
2. Iniciar sesion con `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD`.
3. Crear un negocio desde **Negocios**.
4. Cargar telefono del dueno, `evolution_instance`, plan inicial y meses contratados.
5. Configurar servicios, duraciones, precios y horarios.

## Evolution API

Crear una instancia para cada negocio:

```http
POST http://localhost:8080/instance/create
Headers: { apikey: tu-api-key }
Body: { "instanceName": "peluqapp-local", "qrcode": true }
```

Configurar webhook:

```http
POST http://localhost:8080/webhook/set/peluqapp-local
Headers: { apikey: tu-api-key }
Body: {
  "url": "https://tu-dominio.com/webhook",
  "webhook_by_events": false,
  "events": ["MESSAGES_UPSERT"]
}
```

Guardar `peluqapp-local` como `evolution_instance` del negocio.

## Comandos WhatsApp del dueno

```text
turnos YYYY-MM-DD
bloquear YYYY-MM-DD HH:MM YYYY-MM-DD HH:MM motivo
servicios
agrega Servicio 45 minutos $3500
```

## Build produccion

```bash
npm run build
npm start
```

El build de React se genera en `/panel/dist` y Express lo sirve en `/panel`.
