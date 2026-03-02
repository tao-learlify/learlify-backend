# AptisGo Report API Service


## This docs is for send reports through Sendgrid service.

``
  Report Interface
    request-body {
      device: string
      message: string
      context: string
      from: string
    }
``


``
  endpoint: '/api/v1/report'
``

``
  Headers {
    Authorization: 'xxxxxxxx'
  }
``

``
  Method = POST
``

``
  Content-Type = application/json
``


#### Error:

######
 ``statusCode (400)``: Bad Request Error, All properties within interface are required.
 #
 ``statusCode (200)``: Sucessfull, the mail has been sended.
######



``
    interface as Response {
    statusCode?: number,
    message?: string
  }
``