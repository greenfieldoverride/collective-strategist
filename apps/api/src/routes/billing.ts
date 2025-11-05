import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { BillingService } from '../services/billing-service'
import { UserService } from '../services/user-service'

interface CreateSubscriptionBody {
  planName: string
  amount: number
  currency?: string
  interval?: 'month' | 'year'
}

interface WebhookBody {
  meta: {
    event_name: string
    test_mode: boolean
  }
  data: any
}

export default async function billingRoutes(fastify: FastifyInstance) {
  // We'll get these from app context when integrated
  const db = (fastify as any).pg || {} // Mock for now
  const userService = new UserService(db as any)
  const billingService = new BillingService(db as any, userService)

  // Middleware to authenticate user  
  fastify.addHook('preHandler', async (request: any, reply) => {
    // Skip auth for webhooks
    if (request.url.includes('/webhook')) {
      return
    }

    try {
      await fastify.authenticate(request, reply)
    } catch (error) {
      reply.code(401).send({ error: 'Authentication required' })
    }
  })

  // Get user's billing information
  fastify.get('/api/billing/customer', async (request: any, reply: FastifyReply) => {
    try {
      if (!request.user?.id) {
        return reply.code(401).send({ error: 'User not authenticated' })
      }

      const customer = await billingService.getBillingCustomer(request.user.id)
      const subscription = await billingService.getSubscription(request.user.id)
      const status = await billingService.getUserSubscriptionStatus(request.user.id)

      reply.send({
        customer,
        subscription,
        status,
        hasActiveSubscription: status === 'active'
      })
    } catch (error) {
      console.error('Error fetching billing info:', error)
      reply.code(500).send({ error: 'Failed to fetch billing information' })
    }
  })

  // Create a new subscription
  fastify.post<{ Body: CreateSubscriptionBody }>('/api/billing/subscription', async (request: any, reply: FastifyReply) => {
    try {
      if (!request.user?.id) {
        return reply.code(401).send({ error: 'User not authenticated' })
      }

      const { planName, amount, currency, interval } = request.body

      if (!planName || !amount) {
        return reply.code(400).send({ error: 'Plan name and amount are required' })
      }

      const subscription = await billingService.createSubscription({
        userId: request.user.id,
        planName,
        amount,
        currency,
        interval
      })

      reply.send({ subscription })
    } catch (error) {
      console.error('Error creating subscription:', error)
      reply.code(500).send({ error: 'Failed to create subscription' })
    }
  })

  // Cancel user's subscription
  fastify.delete('/api/billing/subscription', async (request: any, reply: FastifyReply) => {
    try {
      if (!request.user?.id) {
        return reply.code(401).send({ error: 'User not authenticated' })
      }

      const subscription = await billingService.cancelSubscription(request.user.id)

      reply.send({ subscription })
    } catch (error) {
      console.error('Error canceling subscription:', error)
      reply.code(500).send({ error: 'Failed to cancel subscription' })
    }
  })

  // Create checkout URL for a plan
  fastify.post<{ Body: { planName: string; amount: number; currency?: string } }>('/api/billing/checkout', async (request: any, reply: FastifyReply) => {
    try {
      const { planName, amount, currency = 'USD' } = request.body

      if (!planName || !amount) {
        return reply.code(400).send({ error: 'Plan name and amount are required' })
      }

      const checkoutUrl = await billingService.createCheckoutUrl(
        planName,
        amount,
        request.user?.id
      )

      reply.send({ checkoutUrl })
    } catch (error) {
      console.error('Error creating checkout URL:', error)
      reply.code(500).send({ error: 'Failed to create checkout URL' })
    }
  })

  // Webhook endpoint for LemonSqueezy
  fastify.post<{ Body: WebhookBody }>('/api/billing/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const signature = request.headers['x-signature'] as string
      
      // In production, validate webhook signature
      // For now, we'll just process the event
      const { meta, data } = request.body as any

      console.log('Received webhook:', meta.event_name, meta.test_mode)

      await billingService.processWebhook(meta.event_name, data)

      reply.send({ success: true })
    } catch (error) {
      console.error('Error processing webhook:', error)
      reply.code(500).send({ error: 'Failed to process webhook' })
    }
  })

  // Get mock account info (development only)
  fastify.get('/api/billing/mock/info', async (request: FastifyRequest, reply: FastifyReply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.code(404).send({ error: 'Not found' })
    }

    try {
      const info = await billingService.getMockAccountInfo()
      reply.send(info)
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get mock info' })
    }
  })

  // Reset mock data (development only)
  fastify.post('/api/billing/mock/reset', async (request: FastifyRequest, reply: FastifyReply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.code(404).send({ error: 'Not found' })
    }

    try {
      await billingService.resetMockData()
      reply.send({ success: true, message: 'Mock data reset' })
    } catch (error) {
      reply.code(500).send({ error: 'Failed to reset mock data' })
    }
  })
}