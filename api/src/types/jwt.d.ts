import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      org: string | null
      role: string
      jti?: string
      impersonated_by?: string
    }
    user: {
      sub: string
      org: string
      role: string
      jti?: string
      iat: number
      exp: number
    }
  }
}
