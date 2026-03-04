export interface StripeCustomer {
  source: string
  stripeCustomerId: string
  firstName: string
  lastName: string
  email: string
}

export interface StripeIntentInfo {
  amount: number
  currency: 'USD' | 'EUR'
  name: string
  customer: string
  paymentMethodId: string
  email: string
}

export type PaymentResponse =
  | { requiresAction: true; paymentIntentClientSecret: string }
  | { success: true }
  | { error: string }
