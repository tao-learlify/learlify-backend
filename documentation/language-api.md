# AptisGo Language API Service


## This docs are available for data fetching for languages.

``
  Language Interface
  ``
    properties {
      id?: number
      language?: string,
      code?: string,
      createdAt: Date,
      updatedAt: Date
    }
  ``
``


``
  endpoint: '/api/v1/languages'
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
    response?: Array<Language>,
    message?: string
  }
``