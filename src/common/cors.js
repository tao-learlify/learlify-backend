/**
 * @module
 * @description
 * This is cors common folder configuration for both enviroment.
 * Origin property is available for allowed all browser requests.
 * Methods for all properties available for these clients.
 * AllowedHeaders same rule.
 */


export const CorsMiddleware = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3100',
    'https://aptisgo.b1b2.es',
    'https://b1b2.online'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Accept-Language', 'Authorization']
}
