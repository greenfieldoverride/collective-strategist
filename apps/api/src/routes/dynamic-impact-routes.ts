import { FastifyInstance, FastifyReply } from 'fastify'
import { dynamicImpactService } from '../services/dynamic-impact-service'

export async function dynamicImpactRoutes(fastify: FastifyInstance) {
  // Authentication middleware
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  // Get venture modules
  fastify.get<{
    Params: { ventureId: string }
  }>('/ventures/:ventureId/modules', async (request, reply: FastifyReply) => {
    try {
      const { ventureId } = request.params
      const modules = await dynamicImpactService.getVentureModules(ventureId)
      
      return {
        success: true,
        data: modules
      }
    } catch (error) {
      console.error('Failed to get venture modules:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to load modules',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Create custom module
  fastify.post<{
    Params: { ventureId: string }
    Body: {
      name: string
      slug: string
      icon?: string
      description?: string
      color?: string
      sortOrder?: number
    }
  }>('/ventures/:ventureId/modules', async (request, reply: FastifyReply) => {
    try {
      const { ventureId } = request.params
      const user = (request as any).user
      
      const moduleData = {
        ventureId,
        name: request.body.name,
        slug: request.body.slug,
        icon: request.body.icon,
        description: request.body.description,
        color: request.body.color || '#3b82f6',
        sortOrder: request.body.sortOrder || 0,
        isActive: true,
        isSystemModule: false,
        createdBy: user.id
      }
      
      const module = await dynamicImpactService.createModule(moduleData)
      
      return reply.code(201).send({
        success: true,
        data: module
      })
    } catch (error) {
      console.error('Failed to create module:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to create module',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Update module
  fastify.put<{
    Params: { ventureId: string, moduleId: string }
    Body: {
      name?: string
      icon?: string
      description?: string
      color?: string
      sortOrder?: number
      isActive?: boolean
    }
  }>('/ventures/:ventureId/modules/:moduleId', async (request, reply: FastifyReply) => {
    try {
      const { moduleId } = request.params
      const updates = request.body
      
      const module = await dynamicImpactService.updateModule(moduleId, updates)
      
      return {
        success: true,
        data: module
      }
    } catch (error) {
      console.error('Failed to update module:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to update module',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Get module metrics
  fastify.get<{
    Params: { ventureId: string, moduleId: string }
  }>('/ventures/:ventureId/modules/:moduleId/metrics', async (request, reply: FastifyReply) => {
    try {
      const { moduleId } = request.params
      const metrics = await dynamicImpactService.getModuleMetrics(moduleId)
      
      return {
        success: true,
        data: metrics
      }
    } catch (error) {
      console.error('Failed to get module metrics:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to load metrics',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Create custom metric
  fastify.post<{
    Params: { ventureId: string, moduleId: string }
    Body: {
      name: string
      slug: string
      description?: string
      metricType: 'number' | 'currency' | 'percentage' | 'count' | 'text' | 'rating'
      unit?: string
      icon?: string
      context?: string
      calculationMethod?: string
      targetValue?: number
      targetPeriod?: string
      sortOrder?: number
    }
  }>('/ventures/:ventureId/modules/:moduleId/metrics', async (request, reply: FastifyReply) => {
    try {
      const { moduleId } = request.params
      
      const metricData = {
        moduleId,
        name: request.body.name,
        slug: request.body.slug,
        description: request.body.description,
        metricType: request.body.metricType,
        unit: request.body.unit,
        icon: request.body.icon,
        context: request.body.context,
        calculationMethod: request.body.calculationMethod,
        targetValue: request.body.targetValue,
        targetPeriod: request.body.targetPeriod,
        sortOrder: request.body.sortOrder || 0,
        isActive: true
      }
      
      const metric = await dynamicImpactService.createMetric(metricData)
      
      return reply.code(201).send({
        success: true,
        data: metric
      })
    } catch (error) {
      console.error('Failed to create metric:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to create metric',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Record metric value
  fastify.post<{
    Params: { ventureId: string, moduleId: string, metricId: string }
    Body: {
      valueNumeric?: number
      valueText?: string
      recordedAt?: string
      periodStart?: string
      periodEnd?: string
      dataSource?: 'integration' | 'manual' | 'calculated'
      metadata?: Record<string, any>
    }
  }>('/ventures/:ventureId/modules/:moduleId/metrics/:metricId/values', async (request, reply: FastifyReply) => {
    try {
      const { metricId } = request.params
      
      const valueData = {
        metricId,
        integrationId: undefined,
        valueNumeric: request.body.valueNumeric,
        valueText: request.body.valueText,
        recordedAt: request.body.recordedAt ? new Date(request.body.recordedAt) : new Date(),
        periodStart: request.body.periodStart ? new Date(request.body.periodStart) : undefined,
        periodEnd: request.body.periodEnd ? new Date(request.body.periodEnd) : undefined,
        dataSource: request.body.dataSource || 'manual' as const,
        metadata: request.body.metadata
      }
      
      const value = await dynamicImpactService.recordMetricValue(valueData)
      
      return reply.code(201).send({
        success: true,
        data: value
      })
    } catch (error) {
      console.error('Failed to record metric value:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to record metric value',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Get metric values
  fastify.get<{
    Params: { ventureId: string, moduleId: string, metricId: string }
    Querystring: {
      startDate?: string
      endDate?: string
      limit?: string
    }
  }>('/ventures/:ventureId/modules/:moduleId/metrics/:metricId/values', async (request, reply: FastifyReply) => {
    try {
      const { metricId } = request.params
      const { startDate, endDate, limit } = request.query
      
      const values = await dynamicImpactService.getMetricValues(
        metricId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        limit ? parseInt(limit) : 100
      )
      
      return {
        success: true,
        data: values
      }
    } catch (error) {
      console.error('Failed to get metric values:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to load metric values',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Create report
  fastify.post<{
    Params: { ventureId: string }
    Body: {
      name: string
      description?: string
      reportType: 'dashboard' | 'export' | 'scheduled'
      scheduleFrequency?: string
      recipients?: string[]
      moduleIds: string[]
      dateRangeType: string
      customStartDate?: string
      customEndDate?: string
      format: 'pdf' | 'csv' | 'json' | 'dashboard'
    }
  }>('/ventures/:ventureId/reports', async (request, reply: FastifyReply) => {
    try {
      const { ventureId } = request.params
      
      const reportData = {
        ventureId,
        name: request.body.name,
        description: request.body.description,
        reportType: request.body.reportType,
        scheduleFrequency: request.body.scheduleFrequency,
        recipients: request.body.recipients,
        moduleIds: request.body.moduleIds,
        dateRangeType: request.body.dateRangeType,
        customStartDate: request.body.customStartDate ? new Date(request.body.customStartDate) : undefined,
        customEndDate: request.body.customEndDate ? new Date(request.body.customEndDate) : undefined,
        format: request.body.format,
        isActive: true
      }
      
      const report = await dynamicImpactService.createReport(reportData)
      
      return reply.code(201).send({
        success: true,
        data: report
      })
    } catch (error) {
      console.error('Failed to create report:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to create report',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Generate report
  fastify.post<{
    Params: { ventureId: string, reportId: string }
  }>('/ventures/:ventureId/reports/:reportId/generate', async (request, reply: FastifyReply) => {
    try {
      const { reportId } = request.params
      
      const reportData = await dynamicImpactService.generateReport(reportId)
      
      return {
        success: true,
        data: reportData
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Failed to generate report',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Module templates (predefined module types)
  fastify.get('/module-templates', async () => {
    try {
      const templates = [
        {
          id: 'community',
          name: 'Community Resilience',
          icon: '🌿',
          description: 'Building strong, interdependent communities that support each other',
          color: '#10b981',
          suggestedMetrics: [
            { name: 'Community Members', type: 'count', unit: 'people', icon: '👥' },
            { name: 'Monthly Support', type: 'currency', unit: 'USD', icon: '💰' },
            { name: 'Engagement Rate', type: 'percentage', unit: '%', icon: '❤️' },
            { name: 'Local Events', type: 'count', unit: 'events', icon: '📅' }
          ]
        },
        {
          id: 'knowledge',
          name: 'Knowledge Liberation',
          icon: '🧠',
          description: 'Sharing knowledge freely and building collective intelligence',
          color: '#3b82f6',
          suggestedMetrics: [
            { name: 'Open Source Projects', type: 'count', unit: 'repos', icon: '📦' },
            { name: 'Community Stars', type: 'count', unit: 'stars', icon: '⭐' },
            { name: 'Knowledge Contributions', type: 'count', unit: 'commits', icon: '💻' },
            { name: 'Learning Resources', type: 'count', unit: 'resources', icon: '📚' }
          ]
        },
        {
          id: 'cultural',
          name: 'Cultural Impact',
          icon: '🎨',
          description: 'Creating and preserving culture that reflects our values',
          color: '#8b5cf6',
          suggestedMetrics: [
            { name: 'Creative Works', type: 'count', unit: 'pieces', icon: '🎨' },
            { name: 'Cultural Events', type: 'count', unit: 'events', icon: '🎭' },
            { name: 'Artist Support', type: 'currency', unit: 'USD', icon: '🎪' },
            { name: 'Community Reach', type: 'count', unit: 'people', icon: '📡' }
          ]
        },
        {
          id: 'movement',
          name: 'Movement Growth',
          icon: '🚀',
          description: 'Growing the liberation movement and inspiring others',
          color: '#f59e0b',
          suggestedMetrics: [
            { name: 'Movement Members', type: 'count', unit: 'activists', icon: '✊' },
            { name: 'Actions Organized', type: 'count', unit: 'actions', icon: '📢' },
            { name: 'Policy Changes', type: 'count', unit: 'changes', icon: '📜' },
            { name: 'Media Mentions', type: 'count', unit: 'mentions', icon: '📺' }
          ]
        },
        {
          id: 'sovereignty',
          name: 'Personal Sovereignty',
          icon: '✊',
          description: 'Achieving independence from oppressive systems',
          color: '#ef4444',
          suggestedMetrics: [
            { name: 'Financial Independence', type: 'percentage', unit: '%', icon: '💪' },
            { name: 'Skills Acquired', type: 'count', unit: 'skills', icon: '🛠️' },
            { name: 'Dependencies Reduced', type: 'count', unit: 'systems', icon: '🔗' },
            { name: 'Autonomy Score', type: 'rating', unit: '/10', icon: '🎯' }
          ]
        },
        {
          id: 'environmental',
          name: 'Environmental Impact',
          icon: '🌍',
          description: 'Regenerating ecosystems and building sustainable practices',
          color: '#059669',
          suggestedMetrics: [
            { name: 'Carbon Footprint', type: 'number', unit: 'tons CO2', icon: '🌱' },
            { name: 'Renewable Energy', type: 'percentage', unit: '%', icon: '⚡' },
            { name: 'Waste Reduction', type: 'percentage', unit: '%', icon: '♻️' },
            { name: 'Biodiversity Projects', type: 'count', unit: 'projects', icon: '🦋' }
          ]
        }
      ]
      
      return {
        success: true,
        data: templates
      }
    } catch (error) {
      console.error('Failed to get module templates:', error)
      return {
        success: false,
        error: {
          message: 'Failed to load module templates',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  })
}

export default dynamicImpactRoutes