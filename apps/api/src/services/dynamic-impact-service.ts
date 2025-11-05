import { db } from '../database/connection'

export interface CustomImpactModule {
  id: string
  ventureId: string
  name: string
  slug: string
  icon?: string
  description?: string
  color?: string
  sortOrder: number
  isActive: boolean
  isSystemModule: boolean
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface CustomImpactMetric {
  id: string
  moduleId: string
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
  sortOrder: number
  isActive: boolean
}

export interface MetricValue {
  id: string
  metricId: string
  integrationId?: string
  valueNumeric?: number
  valueText?: string
  recordedAt: Date
  periodStart?: Date
  periodEnd?: Date
  dataSource: 'integration' | 'manual' | 'calculated'
  metadata?: Record<string, any>
}

export interface ImpactReport {
  id: string
  ventureId: string
  name: string
  description?: string
  reportType: 'dashboard' | 'export' | 'scheduled'
  scheduleFrequency?: string
  recipients?: string[]
  moduleIds: string[]
  dateRangeType: string
  customStartDate?: Date
  customEndDate?: Date
  format: 'pdf' | 'csv' | 'json' | 'dashboard'
  isActive: boolean
  lastGeneratedAt?: Date
}

export class DynamicImpactService {
  
  // Module Management
  async getVentureModules(ventureId: string): Promise<CustomImpactModule[]> {
    const result = await db.query(`
      SELECT 
        id,
        venture_id as "ventureId",
        name,
        slug,
        icon,
        description,
        color,
        sort_order as "sortOrder",
        is_active as "isActive",
        is_system_module as "isSystemModule",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM impact_modules 
      WHERE venture_id = $1 AND is_active = true
      ORDER BY sort_order, name
    `, [ventureId])
    
    return result.rows
  }

  async createModule(moduleData: Omit<CustomImpactModule, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomImpactModule> {
    const result = await db.query(`
      INSERT INTO impact_modules (
        venture_id, name, slug, icon, description, color, 
        sort_order, is_active, is_system_module, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id,
        venture_id as "ventureId",
        name,
        slug,
        icon,
        description,
        color,
        sort_order as "sortOrder",
        is_active as "isActive",
        is_system_module as "isSystemModule",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
      moduleData.ventureId,
      moduleData.name,
      moduleData.slug,
      moduleData.icon,
      moduleData.description,
      moduleData.color,
      moduleData.sortOrder,
      moduleData.isActive,
      moduleData.isSystemModule,
      moduleData.createdBy
    ])
    
    return result.rows[0]
  }

  async updateModule(id: string, updates: Partial<CustomImpactModule>): Promise<CustomImpactModule> {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'createdAt')
      .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
      .join(', ')
    
    const values = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'createdAt')
      .map(key => updates[key as keyof CustomImpactModule])
    
    const result = await db.query(`
      UPDATE impact_modules 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id,
        venture_id as "ventureId",
        name,
        slug,
        icon,
        description,
        color,
        sort_order as "sortOrder",
        is_active as "isActive",
        is_system_module as "isSystemModule",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [id, ...values])
    
    return result.rows[0]
  }

  // Metric Management
  async getModuleMetrics(moduleId: string): Promise<CustomImpactMetric[]> {
    const result = await db.query(`
      SELECT 
        id,
        module_id as "moduleId",
        name,
        slug,
        description,
        metric_type as "metricType",
        unit,
        icon,
        context,
        calculation_method as "calculationMethod",
        target_value as "targetValue",
        target_period as "targetPeriod",
        sort_order as "sortOrder",
        is_active as "isActive"
      FROM impact_metrics 
      WHERE module_id = $1 AND is_active = true
      ORDER BY sort_order, name
    `, [moduleId])
    
    return result.rows
  }

  async createMetric(metricData: Omit<CustomImpactMetric, 'id'>): Promise<CustomImpactMetric> {
    const result = await db.query(`
      INSERT INTO impact_metrics (
        module_id, name, slug, description, metric_type, unit,
        icon, context, calculation_method, target_value, target_period,
        sort_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING 
        id,
        module_id as "moduleId",
        name,
        slug,
        description,
        metric_type as "metricType",
        unit,
        icon,
        context,
        calculation_method as "calculationMethod",
        target_value as "targetValue",
        target_period as "targetPeriod",
        sort_order as "sortOrder",
        is_active as "isActive"
    `, [
      metricData.moduleId,
      metricData.name,
      metricData.slug,
      metricData.description,
      metricData.metricType,
      metricData.unit,
      metricData.icon,
      metricData.context,
      metricData.calculationMethod,
      metricData.targetValue,
      metricData.targetPeriod,
      metricData.sortOrder,
      metricData.isActive
    ])
    
    return result.rows[0]
  }

  // Metric Values
  async recordMetricValue(valueData: Omit<MetricValue, 'id'>): Promise<MetricValue> {
    const result = await db.query(`
      INSERT INTO impact_metric_values (
        metric_id, integration_id, value_numeric, value_text,
        recorded_at, period_start, period_end, data_source, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id,
        metric_id as "metricId",
        integration_id as "integrationId",
        value_numeric as "valueNumeric",
        value_text as "valueText",
        recorded_at as "recordedAt",
        period_start as "periodStart",
        period_end as "periodEnd",
        data_source as "dataSource",
        metadata
    `, [
      valueData.metricId,
      valueData.integrationId,
      valueData.valueNumeric,
      valueData.valueText,
      valueData.recordedAt,
      valueData.periodStart,
      valueData.periodEnd,
      valueData.dataSource,
      JSON.stringify(valueData.metadata)
    ])
    
    return result.rows[0]
  }

  async getMetricValues(
    metricId: string, 
    startDate?: Date, 
    endDate?: Date, 
    limit: number = 100
  ): Promise<MetricValue[]> {
    let query = `
      SELECT 
        id,
        metric_id as "metricId",
        integration_id as "integrationId",
        value_numeric as "valueNumeric",
        value_text as "valueText",
        recorded_at as "recordedAt",
        period_start as "periodStart",
        period_end as "periodEnd",
        data_source as "dataSource",
        metadata
      FROM impact_metric_values 
      WHERE metric_id = $1
    `
    
    const params: any[] = [metricId]
    let paramIndex = 2
    
    if (startDate) {
      query += ` AND recorded_at >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }
    
    if (endDate) {
      query += ` AND recorded_at <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }
    
    query += ` ORDER BY recorded_at DESC LIMIT $${paramIndex}`
    params.push(limit)
    
    const result = await db.query(query, params)
    return result.rows
  }

  // Reports
  async createReport(reportData: Omit<ImpactReport, 'id' | 'lastGeneratedAt'>): Promise<ImpactReport> {
    const result = await db.query(`
      INSERT INTO impact_reports (
        venture_id, name, description, report_type, schedule_frequency,
        recipients, module_ids, date_range_type, custom_start_date,
        custom_end_date, format, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      reportData.ventureId,
      reportData.name,
      reportData.description,
      reportData.reportType,
      reportData.scheduleFrequency,
      reportData.recipients,
      reportData.moduleIds,
      reportData.dateRangeType,
      reportData.customStartDate,
      reportData.customEndDate,
      reportData.format,
      reportData.isActive
    ])
    
    return result.rows[0]
  }

  async generateReport(reportId: string): Promise<any> {
    // Get report configuration
    const reportResult = await db.query(
      'SELECT * FROM impact_reports WHERE id = $1',
      [reportId]
    )
    
    if (reportResult.rows.length === 0) {
      throw new Error('Report not found')
    }
    
    const report = reportResult.rows[0]
    
    // Get modules and their metrics
    const modulesData = await this.getReportData(
      report.venture_id,
      report.module_ids,
      report.date_range_type,
      report.custom_start_date,
      report.custom_end_date
    )
    
    // Update last generated timestamp
    await db.query(
      'UPDATE impact_reports SET last_generated_at = NOW() WHERE id = $1',
      [reportId]
    )
    
    return {
      report: report,
      data: modulesData,
      generatedAt: new Date()
    }
  }

  private async getReportData(
    ventureId: string,
    moduleIds: string[],
    dateRangeType: string,
    customStartDate?: Date,
    customEndDate?: Date
  ) {
    // Calculate date range
    const { startDate, endDate } = this.calculateDateRange(dateRangeType, customStartDate, customEndDate)
    
    // Get modules with their metrics and values
    const result = await db.query(`
      SELECT 
        m.id as module_id,
        m.name as module_name,
        m.icon as module_icon,
        m.description as module_description,
        mt.id as metric_id,
        mt.name as metric_name,
        mt.metric_type,
        mt.unit,
        mt.icon as metric_icon,
        mt.context,
        mv.value_numeric,
        mv.value_text,
        mv.recorded_at,
        mv.data_source
      FROM impact_modules m
      LEFT JOIN impact_metrics mt ON m.id = mt.module_id AND mt.is_active = true
      LEFT JOIN impact_metric_values mv ON mt.id = mv.metric_id 
        AND mv.recorded_at BETWEEN $3 AND $4
      WHERE m.venture_id = $1 
        AND m.id = ANY($2)
        AND m.is_active = true
      ORDER BY m.sort_order, mt.sort_order, mv.recorded_at DESC
    `, [ventureId, moduleIds, startDate, endDate])
    
    // Group by modules
    const modulesMap = new Map()
    
    for (const row of result.rows) {
      if (!modulesMap.has(row.module_id)) {
        modulesMap.set(row.module_id, {
          id: row.module_id,
          name: row.module_name,
          icon: row.module_icon,
          description: row.module_description,
          metrics: new Map()
        })
      }
      
      const module = modulesMap.get(row.module_id)
      
      if (row.metric_id && !module.metrics.has(row.metric_id)) {
        module.metrics.set(row.metric_id, {
          id: row.metric_id,
          name: row.metric_name,
          type: row.metric_type,
          unit: row.unit,
          icon: row.metric_icon,
          context: row.context,
          values: []
        })
      }
      
      if (row.metric_id && (row.value_numeric !== null || row.value_text !== null)) {
        module.metrics.get(row.metric_id).values.push({
          value: row.value_numeric || row.value_text,
          recordedAt: row.recorded_at,
          dataSource: row.data_source
        })
      }
    }
    
    // Convert maps to arrays
    return Array.from(modulesMap.values()).map(module => ({
      ...module,
      metrics: Array.from(module.metrics.values())
    }))
  }

  private calculateDateRange(dateRangeType: string, customStartDate?: Date, customEndDate?: Date) {
    const now = new Date()
    let startDate: Date
    let endDate: Date = now
    
    switch (dateRangeType) {
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'last_quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3 - 3, 1)
        endDate = new Date(now.getFullYear(), quarter * 3, 0)
        break
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = now
        break
      case 'custom':
        startDate = customStartDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        endDate = customEndDate || now
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    
    return { startDate, endDate }
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  }
}

export const dynamicImpactService = new DynamicImpactService()