declare module 'geoip-lite' {
  export interface GeoLookup {
    country: string
    region?: string
    timezone?: string
    city?: string
  }

  export function lookup(ip: string): GeoLookup | null

  const geoip: {
    lookup: typeof lookup
  }

  export default geoip
}
