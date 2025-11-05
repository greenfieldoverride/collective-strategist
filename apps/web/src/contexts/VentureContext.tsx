import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Types for shared context
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: string
  endDate?: string
  type: 'content_deadline' | 'content_review' | 'social_post' | 'meeting' | 'milestone'
  source: 'content_studio' | 'social_media' | 'calendar' | 'external'
  relatedId?: string // Content ID, Post ID, etc.
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  assignees?: string[]
  metadata?: Record<string, any>
}

export interface SharedAsset {
  id: string
  name: string
  type: 'image' | 'video' | 'document' | 'link'
  url: string
  description?: string
  tags: string[]
  createdAt: string
  createdBy: string
  usedIn: Array<{
    feature: 'content_studio' | 'social_media'
    itemId: string
    itemTitle: string
  }>
}

export interface SharedTemplate {
  id: string
  name: string
  description?: string
  type: 'content' | 'social_post' | 'email' | 'marketing_copy'
  category: string
  template: {
    title?: string
    content: string
    tags?: string[]
    metadata?: Record<string, any>
  }
  createdAt: string
  createdBy: string
  usageCount: number
  lastUsed?: string
  isPublic: boolean
  usedBy: Array<{
    feature: 'content_studio' | 'social_media'
    itemId: string
    itemTitle: string
    usedAt: string
  }>
}

export interface SharedTag {
  id: string
  name: string
  color?: string
  description?: string
  category: 'content' | 'asset' | 'social' | 'general'
  createdAt: string
  createdBy: string
  usageCount: number
  usedIn: Array<{
    feature: 'content_studio' | 'social_media'
    itemType: 'content' | 'asset' | 'template' | 'post'
    itemId: string
    itemTitle: string
    usedAt: string
  }>
  isSystem: boolean // For predefined system tags
}

export interface CrossFeatureNotification {
  id: string
  type: 'content_approved' | 'content_ready_for_social' | 'calendar_reminder' | 'asset_updated'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  relatedFeature: 'content_studio' | 'social_media' | 'calendar'
  relatedId?: string
}

interface VentureContextType {
  // Current venture state
  ventureId: string | null
  
  // Calendar events
  calendarEvents: CalendarEvent[]
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void
  removeCalendarEvent: (id: string) => void
  getEventsByType: (type: CalendarEvent['type']) => CalendarEvent[]
  getEventsByDateRange: (startDate: string, endDate: string) => CalendarEvent[]
  
  // Shared assets
  sharedAssets: SharedAsset[]
  addSharedAsset: (asset: Omit<SharedAsset, 'id' | 'createdAt'>) => void
  updateAssetUsage: (assetId: string, usage: SharedAsset['usedIn'][0]) => void
  getAssetsByTags: (tags: string[]) => SharedAsset[]
  
  // Shared templates
  sharedTemplates: SharedTemplate[]
  addSharedTemplate: (template: Omit<SharedTemplate, 'id' | 'createdAt' | 'usageCount' | 'usedBy'>) => void
  updateTemplate: (templateId: string, updates: Partial<SharedTemplate>) => void
  useTemplate: (templateId: string, usage: SharedTemplate['usedBy'][0]) => SharedTemplate
  getTemplatesByType: (type: SharedTemplate['type']) => SharedTemplate[]
  getTemplatesByCategory: (category: string) => SharedTemplate[]
  deleteTemplate: (templateId: string) => void
  
  // Shared tags
  sharedTags: SharedTag[]
  addSharedTag: (tag: Omit<SharedTag, 'id' | 'createdAt' | 'usageCount' | 'usedIn'>) => void
  updateTag: (tagId: string, updates: Partial<SharedTag>) => void
  deleteTag: (tagId: string) => void
  useTag: (tagId: string, usage: SharedTag['usedIn'][0]) => void
  getTagsByCategory: (category: SharedTag['category']) => SharedTag[]
  getPopularTags: (limit?: number) => SharedTag[]
  searchTags: (query: string) => SharedTag[]
  
  // Cross-feature notifications
  notifications: CrossFeatureNotification[]
  addNotification: (notification: Omit<CrossFeatureNotification, 'id' | 'timestamp' | 'read'>) => void
  markNotificationRead: (id: string) => void
  getUnreadNotifications: () => CrossFeatureNotification[]
  
  // Calendar integration
  calendarConnections: {
    google?: { connected: boolean; email?: string; lastSync?: string }
    outlook?: { connected: boolean; email?: string; lastSync?: string }
  }
  connectCalendar: (provider: 'google' | 'outlook') => Promise<void>
  disconnectCalendar: (provider: 'google' | 'outlook') => Promise<void>
  syncExternalCalendar: (provider: 'google' | 'outlook') => Promise<void>
}

const VentureContext = createContext<VentureContextType | undefined>(undefined)

interface VentureProviderProps {
  children: ReactNode
  ventureId: string | null
}

export function VentureProvider({ children, ventureId }: VentureProviderProps) {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [sharedAssets, setSharedAssets] = useState<SharedAsset[]>([])
  const [sharedTemplates, setSharedTemplates] = useState<SharedTemplate[]>([])
  const [sharedTags, setSharedTags] = useState<SharedTag[]>([])
  const [notifications, setNotifications] = useState<CrossFeatureNotification[]>([])
  const [calendarConnections, setCalendarConnections] = useState({
    google: { connected: false },
    outlook: { connected: false }
  })

  // Load data when venture changes
  useEffect(() => {
    if (ventureId) {
      loadVentureData(ventureId)
    }
  }, [ventureId])

  const loadVentureData = async (ventureId: string) => {
    try {
      // Load calendar events
      const eventsResponse = await fetch(`http://localhost:8007/api/v1/calendar/events?ventureId=${ventureId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        setCalendarEvents(eventsData.data || [])
      }

      // Load shared assets
      const assetsResponse = await fetch(`http://localhost:8007/api/v1/assets/shared?ventureId=${ventureId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      
      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json()
        setSharedAssets(assetsData.data || [])
      }

      // Load shared templates
      const templatesResponse = await fetch(`http://localhost:8007/api/v1/templates/shared?ventureId=${ventureId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        setSharedTemplates(templatesData.data || [])
      }

      // Load shared tags
      const tagsResponse = await fetch(`http://localhost:8007/api/v1/tags/shared?ventureId=${ventureId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      
      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json()
        setSharedTags(tagsData.data || [])
      }

      // Load calendar connections
      const connectionsResponse = await fetch(`http://localhost:8007/api/v1/calendar/connections?ventureId=${ventureId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      
      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json()
        setCalendarConnections(connectionsData.data || { google: { connected: false }, outlook: { connected: false } })
      }
    } catch (error) {
      console.error('Failed to load venture data:', error)
    }
  }

  // Calendar event management
  const addCalendarEvent = (event: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    setCalendarEvents(prev => [...prev, newEvent])
    
    // Sync to backend
    syncCalendarEvent(newEvent)
    
    // Create notification if it's a deadline or important event
    if (event.type === 'content_deadline' || event.priority === 'high' || event.priority === 'urgent') {
      addNotification({
        type: 'calendar_reminder',
        title: `Upcoming: ${event.title}`,
        message: `${event.type.replace('_', ' ')} scheduled for ${new Date(event.startDate).toLocaleDateString()}`,
        relatedFeature: 'calendar',
        relatedId: newEvent.id
      })
    }
  }

  const updateCalendarEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setCalendarEvents(prev => prev.map(event => 
      event.id === id ? { ...event, ...updates } : event
    ))
    
    // Sync to backend
    const updatedEvent = calendarEvents.find(e => e.id === id)
    if (updatedEvent) {
      syncCalendarEvent({ ...updatedEvent, ...updates })
    }
  }

  const removeCalendarEvent = (id: string) => {
    setCalendarEvents(prev => prev.filter(event => event.id !== id))
    
    // Remove from backend
    fetch(`http://localhost:8007/api/v1/calendar/events/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
  }

  const syncCalendarEvent = async (event: CalendarEvent) => {
    try {
      await fetch(`http://localhost:8007/api/v1/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...event, ventureId })
      })
    } catch (error) {
      console.error('Failed to sync calendar event:', error)
    }
  }

  const getEventsByType = (type: CalendarEvent['type']) => {
    return calendarEvents.filter(event => event.type === type)
  }

  const getEventsByDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    return calendarEvents.filter(event => {
      const eventDate = new Date(event.startDate)
      return eventDate >= start && eventDate <= end
    })
  }

  // Shared asset management
  const addSharedAsset = (asset: Omit<SharedAsset, 'id' | 'createdAt'>) => {
    const newAsset: SharedAsset = {
      ...asset,
      id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    }
    
    setSharedAssets(prev => [...prev, newAsset])
    
    // Sync to backend
    fetch(`http://localhost:8007/api/v1/assets/shared`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ ...newAsset, ventureId })
    })
  }

  const updateAssetUsage = (assetId: string, usage: SharedAsset['usedIn'][0]) => {
    setSharedAssets(prev => prev.map(asset => 
      asset.id === assetId 
        ? { ...asset, usedIn: [...asset.usedIn.filter(u => u.itemId !== usage.itemId), usage] }
        : asset
    ))
  }

  const getAssetsByTags = (tags: string[]) => {
    return sharedAssets.filter(asset => 
      tags.some(tag => asset.tags.includes(tag))
    )
  }

  // Notification management
  const addNotification = (notification: Omit<CrossFeatureNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: CrossFeatureNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false
    }
    
    setNotifications(prev => [newNotification, ...prev])
  }

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ))
  }

  const getUnreadNotifications = () => {
    return notifications.filter(notif => !notif.read)
  }

  // Template management
  const addSharedTemplate = (template: Omit<SharedTemplate, 'id' | 'createdAt' | 'usageCount' | 'usedBy'>) => {
    const newTemplate: SharedTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      usageCount: 0,
      usedBy: []
    }
    
    setSharedTemplates(prev => [...prev, newTemplate])
    
    addNotification({
      type: 'asset_updated',
      title: 'Template Created',
      message: `New ${template.type} template "${template.name}" has been created`,
      relatedFeature: 'content_studio'
    })
  }

  const updateTemplate = (templateId: string, updates: Partial<SharedTemplate>) => {
    setSharedTemplates(prev => prev.map(template =>
      template.id === templateId ? { ...template, ...updates } : template
    ))
  }

  const useTemplate = (templateId: string, usage: SharedTemplate['usedBy'][0]): SharedTemplate => {
    const template = sharedTemplates.find(t => t.id === templateId)
    if (!template) throw new Error('Template not found')

    setSharedTemplates(prev => prev.map(t => 
      t.id === templateId 
        ? { 
            ...t, 
            usageCount: t.usageCount + 1,
            lastUsed: new Date().toISOString(),
            usedBy: [...t.usedBy, { ...usage, usedAt: new Date().toISOString() }]
          }
        : t
    ))

    return template
  }

  const getTemplatesByType = (type: SharedTemplate['type']) => {
    return sharedTemplates.filter(template => template.type === type)
  }

  const getTemplatesByCategory = (category: string) => {
    return sharedTemplates.filter(template => template.category === category)
  }

  const deleteTemplate = (templateId: string) => {
    setSharedTemplates(prev => prev.filter(template => template.id !== templateId))
    
    addNotification({
      type: 'asset_updated',
      title: 'Template Deleted',
      message: 'A shared template has been removed',
      relatedFeature: 'content_studio'
    })
  }

  // Tag management
  const addSharedTag = (tag: Omit<SharedTag, 'id' | 'createdAt' | 'usageCount' | 'usedIn'>) => {
    const newTag: SharedTag = {
      ...tag,
      id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      usageCount: 0,
      usedIn: []
    }
    
    setSharedTags(prev => [...prev, newTag])
    
    addNotification({
      type: 'asset_updated',
      title: 'Tag Created',
      message: `New tag "${tag.name}" has been created`,
      relatedFeature: 'content_studio'
    })
  }

  const updateTag = (tagId: string, updates: Partial<SharedTag>) => {
    setSharedTags(prev => prev.map(tag =>
      tag.id === tagId ? { ...tag, ...updates } : tag
    ))
  }

  const deleteTag = (tagId: string) => {
    const tag = sharedTags.find(t => t.id === tagId)
    if (tag?.isSystem) {
      throw new Error('Cannot delete system tags')
    }
    
    setSharedTags(prev => prev.filter(tag => tag.id !== tagId))
    
    addNotification({
      type: 'asset_updated',
      title: 'Tag Deleted',
      message: 'A shared tag has been removed',
      relatedFeature: 'content_studio'
    })
  }

  const useTag = (tagId: string, usage: SharedTag['usedIn'][0]) => {
    setSharedTags(prev => prev.map(tag => 
      tag.id === tagId 
        ? { 
            ...tag, 
            usageCount: tag.usageCount + 1,
            usedIn: [...tag.usedIn, { ...usage, usedAt: new Date().toISOString() }]
          }
        : tag
    ))
  }

  const getTagsByCategory = (category: SharedTag['category']) => {
    return sharedTags.filter(tag => tag.category === category)
  }

  const getPopularTags = (limit: number = 10) => {
    return sharedTags
      .filter(tag => tag.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
  }

  const searchTags = (query: string) => {
    const lowercaseQuery = query.toLowerCase()
    return sharedTags.filter(tag => 
      tag.name.toLowerCase().includes(lowercaseQuery) ||
      tag.description?.toLowerCase().includes(lowercaseQuery)
    )
  }

  // Calendar integration
  const connectCalendar = async (provider: 'google' | 'outlook') => {
    try {
      const response = await fetch(`http://localhost:8007/api/v1/calendar/connect/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ventureId })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Redirect to OAuth flow
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error(`Failed to connect ${provider} calendar:`, error)
    }
  }

  const disconnectCalendar = async (provider: 'google' | 'outlook') => {
    try {
      await fetch(`http://localhost:8007/api/v1/calendar/disconnect/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ventureId })
      })
      
      setCalendarConnections(prev => ({
        ...prev,
        [provider]: { connected: false }
      }))
    } catch (error) {
      console.error(`Failed to disconnect ${provider} calendar:`, error)
    }
  }

  const syncExternalCalendar = async (provider: 'google' | 'outlook') => {
    try {
      const response = await fetch(`http://localhost:8007/api/v1/calendar/sync/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ventureId })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Add synced events to local state
        setCalendarEvents(prev => [...prev, ...data.events])
        
        addNotification({
          type: 'calendar_reminder',
          title: `${provider} Calendar Synced`,
          message: `Imported ${data.events.length} events from your ${provider} calendar`,
          relatedFeature: 'calendar'
        })
      }
    } catch (error) {
      console.error(`Failed to sync ${provider} calendar:`, error)
    }
  }

  const contextValue: VentureContextType = {
    ventureId,
    calendarEvents,
    addCalendarEvent,
    updateCalendarEvent,
    removeCalendarEvent,
    getEventsByType,
    getEventsByDateRange,
    sharedAssets,
    addSharedAsset,
    updateAssetUsage,
    getAssetsByTags,
    sharedTemplates,
    addSharedTemplate,
    updateTemplate,
    useTemplate,
    getTemplatesByType,
    getTemplatesByCategory,
    deleteTemplate,
    sharedTags,
    addSharedTag,
    updateTag,
    deleteTag,
    useTag,
    getTagsByCategory,
    getPopularTags,
    searchTags,
    notifications,
    addNotification,
    markNotificationRead,
    getUnreadNotifications,
    calendarConnections,
    connectCalendar,
    disconnectCalendar,
    syncExternalCalendar
  }

  return (
    <VentureContext.Provider value={contextValue}>
      {children}
    </VentureContext.Provider>
  )
}

export function useVentureContext() {
  const context = useContext(VentureContext)
  if (context === undefined) {
    throw new Error('useVentureContext must be used within a VentureProvider')
  }
  return context
}

// Hook for cross-feature communication
export function useCrossFeatureIntegration() {
  const context = useVentureContext()
  
  return {
    // Content Studio → Social Media Hub
    publishContentToSocial: async (contentId: string, contentTitle: string, contentData?: {
      content: string
      type: 'blog_article' | 'marketing_copy' | 'email' | 'social_post'
      tags?: string[]
      assets?: string[]
    }) => {
      // Create notification for immediate user feedback
      context.addNotification({
        type: 'content_ready_for_social',
        title: 'Content Ready for Social Media',
        message: `"${contentTitle}" has been approved and is ready for social media publishing`,
        relatedFeature: 'social_media',
        relatedId: contentId,
        actionUrl: '/social'
      })
      
      // If content data is provided, pre-populate social media form
      if (contentData) {
        try {
          // Store the content in localStorage for Social Media Hub to pick up
          const socialContentDraft = {
            id: `content_transfer_${Date.now()}`,
            sourceId: contentId,
            title: contentTitle,
            content: contentData.content,
            sourceType: contentData.type,
            tags: contentData.tags || [],
            assets: contentData.assets || [],
            createdAt: new Date().toISOString(),
            transferredFrom: 'content_studio'
          }
          
          const existingDrafts = JSON.parse(localStorage.getItem('socialMediaDrafts') || '[]')
          existingDrafts.push(socialContentDraft)
          localStorage.setItem('socialMediaDrafts', JSON.stringify(existingDrafts))
          
          // Also create a notification with more specific action
          context.addNotification({
            type: 'content_ready_for_social',
            title: 'Content Pre-loaded for Social Publishing',
            message: `"${contentTitle}" is now available in Social Media Hub with pre-filled content`,
            relatedFeature: 'social_media',
            relatedId: socialContentDraft.id,
            actionUrl: '/social'
          })
        } catch (error) {
          console.error('Failed to transfer content to social media:', error)
        }
      }
    },
    
    // Calendar → Content Studio
    scheduleContentDeadline: (contentId: string, contentTitle: string, deadline: string) => {
      context.addCalendarEvent({
        title: `Content Deadline: ${contentTitle}`,
        description: `Deadline for completing "${contentTitle}"`,
        startDate: deadline,
        type: 'content_deadline',
        source: 'content_studio',
        relatedId: contentId,
        priority: 'high',
        status: 'pending'
      })
    },
    
    // Calendar → Social Media Hub
    scheduleSocialPost: (postId: string, postContent: string, publishDate: string, platforms: string[]) => {
      context.addCalendarEvent({
        title: `Social Media Post: ${platforms.join(', ')}`,
        description: `Publish "${postContent.substring(0, 50)}..." to ${platforms.join(', ')}`,
        startDate: publishDate,
        type: 'social_post',
        source: 'social_media',
        relatedId: postId,
        priority: 'medium',
        status: 'pending',
        metadata: { platforms, postContent }
      })
    },
    
    // Asset sharing
    shareAssetBetweenFeatures: (assetId: string, fromFeature: 'content_studio' | 'social_media', toFeature: 'content_studio' | 'social_media', itemId: string, itemTitle: string) => {
      context.updateAssetUsage(assetId, {
        feature: toFeature,
        itemId,
        itemTitle
      })
      
      context.addNotification({
        type: 'asset_updated',
        title: 'Asset Shared',
        message: `Asset shared from ${fromFeature.replace('_', ' ')} to ${toFeature.replace('_', ' ')}`,
        relatedFeature: toFeature,
        relatedId: assetId
      })
    }
  }
}