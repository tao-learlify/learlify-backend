# AptisGo Plans API Service


## This docs are available for data fetching for plans.

``
  Language Plan
    properties {
      id: number
      name: string,
      currency: "EUR",
      price: number,
      writing: number,
      speaking: number,
      classes: number,
      available?: boolean,
      createdAt: Date,
      updatedAt: Date
    }
``


``
  endpoint: '/api/v1/plans'
``

``
  Headers {
    Authorization: TRUE
  }
``

``
  Method = GET
``

``
    interface as Response {
    statusCode?: number,
    response?: Array<Plan>,
    message?: string
  }
``