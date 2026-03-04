declare module 'exchange-rates-api' {
  export function convert(amount: number, from: string, to: string): Promise<number>
}
