import 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>
    jwt: {
      sign: (payload: any, options?: any) => string
      verify: (token: string, options?: any) => any
    }
  }
  
  interface FastifyRequest {
    user?: {
      id: string
      email: string
    }
    file?: any
  }
  
  interface FastifySchema {
    description?: string
    tags?: string[]
    security?: any[]
    consumes?: string[]
    produces?: string[]
  }
}