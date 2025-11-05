import React, { useState, useEffect } from 'react'
import { 
  SocialMediaIcon,
  TwitterIcon,
  LinkedInIcon,
  InstagramIcon,
  FacebookIcon,
  TikTokIcon
} from './Icons'
import { useVentureContext, SharedTemplate } from '../contexts/VentureContext'
import TemplateSelector from './TemplateSelector'
import '../styles/social-media-hub.css'

interface SocialMediaHubProps {
  ventureId: string
}

interface SocialMediaAccount {
  id: string
  platform: 'twitter' | 'linkedin' | 'instagram' | 'tiktok' | 'facebook'
  username: string
  displayName: string
  avatar?: string
  isConnected: boolean
  followerCount?: number
  lastPostDate?: string
}

interface SocialMediaPost {
  id: string
  content: string
  platform: string
  accountId: string
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  scheduledFor?: string
  publishedAt?: string
  engagement: {
    likes: number
    shares: number
    comments: number
    views: number
  }
}

interface AnalyticsData {
  overview: {
    totalPosts: number
    totalEngagement: number
    totalReach: number
    averageEngagementRate: number
  }
  platformMetrics: {
    platform: string
    posts: number
    followers: number
    engagement: number
    growthRate: number
  }[]
  topContent: {
    id: string
    content: string
    platform: string
    engagement: number
    publishedAt: string
  }[]
  timeSeriesData: {
    date: string
    posts: number
    engagement: number
    reach: number
  }[]
}

const SocialMediaHub: React.FC<SocialMediaHubProps> = ({ ventureId }) => {
  const { sharedAssets, updateAssetUsage, addSharedTemplate } = useVentureContext()
  const [viewMode, setViewMode] = useState<'dashboard' | 'publish' | 'analytics' | 'calendar'>('dashboard')
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([])
  const [posts, setPosts] = useState<SocialMediaPost[]>([])
  const [loading, setLoading] = useState(false)
  
  // Publishing form state
  const [publishForm, setPublishForm] = useState({
    content: '',
    platforms: [] as string[],
    scheduledFor: '',
    attachments: [] as File[],
    selectedAssets: [] as string[] // IDs of selected shared assets
  })
  const [isPublishing, setIsPublishing] = useState(false)
  const [showAssetPicker, setShowAssetPicker] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<SharedTemplate | null>(null)
  
  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  
  // Calendar state
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [scheduledPosts, setScheduledPosts] = useState<SocialMediaPost[]>([])
  
  // Content transfer state
  const [transferredContent, setTransferredContent] = useState<any[]>([])
  const [showTransferredContent, setShowTransferredContent] = useState(false)

  const getAccountIcon = (platform: string) => {
    const iconComponents = {
      twitter: TwitterIcon,
      linkedin: LinkedInIcon, 
      instagram: InstagramIcon,
      tiktok: TikTokIcon,
      facebook: FacebookIcon
    }
    const IconComponent = iconComponents[platform as keyof typeof iconComponents] || SocialMediaIcon
    return <IconComponent size="md" />
  }

  useEffect(() => {
    if (ventureId) {
      loadAccounts()
      loadPosts()
      if (viewMode === 'analytics') {
        loadAnalytics()
      }
      if (viewMode === 'calendar') {
        loadScheduledPosts()
      }
    }
  }, [ventureId, viewMode])

  // Load transferred content from Content Studio
  useEffect(() => {
    loadTransferredContent()
  }, [])

  const loadTransferredContent = () => {
    try {
      const drafts = JSON.parse(localStorage.getItem('socialMediaDrafts') || '[]')
      setTransferredContent(drafts)
      if (drafts.length > 0) {
        setShowTransferredContent(true)
      }
    } catch (error) {
      console.error('Failed to load transferred content:', error)
    }
  }

  const useTransferredContent = (draft: any) => {
    setPublishForm(prev => ({
      ...prev,
      content: draft.content
    }))
    
    // Remove the used draft from storage
    const remainingDrafts = transferredContent.filter(d => d.id !== draft.id)
    setTransferredContent(remainingDrafts)
    localStorage.setItem('socialMediaDrafts', JSON.stringify(remainingDrafts))
    
    setShowTransferredContent(false)
  }

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/v1/social-media/accounts?ventureId=${ventureId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPosts = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/v1/social-media/posts?ventureId=${ventureId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPosts(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
    }
  }

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/v1/social-media/analytics?ventureId=${ventureId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.data || null)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handlePublishFormChange = (field: string, value: any) => {
    setPublishForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePlatformToggle = (platform: string) => {
    setPublishForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }))
  }

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      setPublishForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...Array.from(files)]
      }))
    }
  }

  const publishPost = async () => {
    if (!publishForm.content.trim() || publishForm.platforms.length === 0) {
      alert('Please enter content and select at least one platform')
      return
    }

    setIsPublishing(true)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      
      formData.append('content', publishForm.content)
      formData.append('platforms', JSON.stringify(publishForm.platforms))
      formData.append('ventureId', ventureId)
      
      if (publishForm.scheduledFor) {
        formData.append('scheduledFor', publishForm.scheduledFor)
      }
      
      publishForm.attachments.forEach((file, index) => {
        formData.append(`attachment${index}`, file)
      })
      
      // Include selected shared assets
      if (publishForm.selectedAssets.length > 0) {
        formData.append('sharedAssets', JSON.stringify(publishForm.selectedAssets))
      }

      const response = await fetch('/api/v1/social-media/publish', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        alert('Post published successfully!')
        
        // Track usage of shared assets
        publishForm.selectedAssets.forEach(assetId => {
          updateAssetUsage(assetId, {
            feature: 'social_media',
            itemId: `post-${Date.now()}`,
            itemTitle: publishForm.content.substring(0, 50) + (publishForm.content.length > 50 ? '...' : '')
          })
        })
        
        setPublishForm({
          content: '',
          platforms: [],
          scheduledFor: '',
          attachments: [],
          selectedAssets: []
        })
        loadPosts() // Refresh posts list
      } else {
        const errorData = await response.json()
        alert(`Failed to publish: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Publishing error:', error)
      alert('Failed to publish post. Please try again.')
    } finally {
      setIsPublishing(false)
    }
  }

  // Template functionality
  const handleSelectTemplate = (template: SharedTemplate) => {
    setSelectedTemplate(template)
    
    // Apply template to publishing form
    setPublishForm(prev => ({
      ...prev,
      content: template.template.content
    }))
    
    setShowTemplates(false)
  }

  const handleCreateTemplate = (template: Omit<SharedTemplate, 'id' | 'createdAt' | 'usageCount' | 'usedBy'>) => {
    addSharedTemplate(template)
  }

  // Calendar functionality
  const loadScheduledPosts = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/v1/social-media/scheduled?ventureId=${ventureId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setScheduledPosts(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load scheduled posts:', error)
    }
  }

  const generateCalendarGrid = () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - firstDay.getDay()) // Start from Sunday
    
    const calendar = []
    let currentDate = new Date(startDate)
    
    // Generate 6 weeks
    for (let week = 0; week < 6; week++) {
      const weekRow = []
      for (let day = 0; day < 7; day++) {
        const dayPosts = scheduledPosts.filter(post => {
          if (!post.scheduledFor) return false
          const postDate = new Date(post.scheduledFor)
          return (
            postDate.getDate() === currentDate.getDate() &&
            postDate.getMonth() === currentDate.getMonth() &&
            postDate.getFullYear() === currentDate.getFullYear()
          )
        })
        
        weekRow.push({
          date: new Date(currentDate),
          posts: dayPosts,
          isCurrentMonth: currentDate.getMonth() === month
        })
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      calendar.push(weekRow)
    }
    
    return calendar
  }

  const schedulePostForDate = (date: Date) => {
    setSelectedDate(date)
    // TODO: Open scheduling modal for this date
  }

  return (
    <div className="social-media-hub">
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">
          <SocialMediaIcon size="lg" className="feature-icon" /> Social Media Hub
        </h2>
        <p className="page-subtitle">
          Manage your social media presence across all platforms
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="social-nav-tabs">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
          { id: 'publish', label: 'Publishing', icon: 'publish' },
          { id: 'calendar', label: 'Calendar', icon: 'calendar' },
          { id: 'analytics', label: 'Analytics', icon: 'analytics' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as any)}
            className={`social-nav-tab ${
              viewMode === tab.id ? 'active' : ''
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <div className="social-dashboard">
          {/* Connected Accounts */}
          <div className="social-accounts">
            <h3>Connected Accounts</h3>
            {accounts.length > 0 ? (
              <div className="accounts-grid">
                {accounts.map((account) => (
                  <div key={account.id} className="account-card">
                    <div className="account-header">
                      <div className="account-icon">
                        {getAccountIcon(account.platform)}
                      </div>
                      <div className="account-info">
                        <h4>{account.displayName}</h4>
                        <p>@{account.username}</p>
                      </div>
                    </div>
                    <div className="account-stats">
                      <span>{account.followerCount || 0} followers</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No social media accounts connected yet.</p>
                <button 
                  onClick={() => setViewMode('publish')}
                  className="btn-primary"
                >
                  Connect Account
                </button>
              </div>
            )}
          </div>

          {/* Recent Posts */}
          <div className="recent-posts">
            <h3>Recent Posts</h3>
            {posts.length > 0 ? (
              <div className="posts-list">
                {posts.slice(0, 5).map((post) => (
                  <div key={post.id} className="post-item">
                    <div className="post-platform">
                      {getAccountIcon(post.platform)}
                    </div>
                    <div className="post-content">
                      <p>{post.content.substring(0, 100)}...</p>
                      <div className="post-meta">
                        <span className={`status ${post.status}`}>{post.status}</span>
                        {post.publishedAt && (
                          <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No posts yet. Create your first post!</p>
                <button 
                  onClick={() => setViewMode('publish')}
                  className="btn-primary"
                >
                  Create Post
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Publishing View */}
      {viewMode === 'publish' && (
        <div className="social-publish">
          <div className="publish-form">
            <h3>Create New Post</h3>
            
            {/* Template Section */}
            <div className="form-group">
              <div className="flex items-center justify-between mb-3">
                <label className="form-label">Use Template (Optional)</label>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  {showTemplates ? 'Hide Templates' : 'Browse Templates'}
                </button>
              </div>
              
              {selectedTemplate && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-blue-900">{selectedTemplate.name}</p>
                      <p className="text-sm text-blue-700">{selectedTemplate.description}</p>
                    </div>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              
              {showTemplates && (
                <div className="border rounded-lg p-4 bg-gray-50 mb-4">
                  <TemplateSelector
                    type="social_post"
                    onSelectTemplate={handleSelectTemplate}
                    onCreateTemplate={handleCreateTemplate}
                    selectedTemplateId={selectedTemplate?.id}
                    showCreateForm={true}
                  />
                </div>
              )}
            </div>
            
            {/* Transferred Content from Content Studio */}
            {transferredContent.length > 0 && (
              <div className="form-group">
                <div className="flex items-center justify-between mb-3">
                  <label className="form-label">Content from Content Studio</label>
                  <button
                    onClick={() => setShowTransferredContent(!showTransferredContent)}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    {showTransferredContent ? 'Hide' : 'Show'} ({transferredContent.length} available)
                  </button>
                </div>
                
                {showTransferredContent && (
                  <div className="space-y-2 mb-4">
                    {transferredContent.map(draft => (
                      <div
                        key={draft.id}
                        className="p-3 bg-green-50 rounded-lg border border-green-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-green-900">{draft.title}</h4>
                            <p className="text-sm text-green-700 mb-2">
                              From Content Studio • {draft.sourceType}
                            </p>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {draft.content.substring(0, 120)}
                              {draft.content.length > 120 ? '...' : ''}
                            </p>
                            <div className="mt-2">
                              <button
                                onClick={() => useTransferredContent(draft)}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                Use This Content
                              </button>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(draft.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Content Input */}
            <div className="form-group">
              <label htmlFor="post-content" className="form-label">
                Post Content
              </label>
              <textarea
                id="post-content"
                value={publishForm.content}
                onChange={(e) => handlePublishFormChange('content', e.target.value)}
                className="form-textarea"
                placeholder="What's on your mind?"
                rows={4}
                maxLength={280}
              />
              <div className="character-count">
                {publishForm.content.length}/280
              </div>
            </div>

            {/* Platform Selection */}
            <div className="form-group">
              <label className="form-label">Select Platforms</label>
              <div className="platform-selector">
                {[
                  { id: 'twitter', name: 'Twitter', icon: TwitterIcon },
                  { id: 'linkedin', name: 'LinkedIn', icon: LinkedInIcon },
                  { id: 'instagram', name: 'Instagram', icon: InstagramIcon },
                  { id: 'facebook', name: 'Facebook', icon: FacebookIcon },
                  { id: 'tiktok', name: 'TikTok', icon: TikTokIcon }
                ].map((platform) => {
                  const IconComponent = platform.icon
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => handlePlatformToggle(platform.id)}
                      className={`platform-btn ${
                        publishForm.platforms.includes(platform.id) ? 'selected' : ''
                      }`}
                    >
                      <IconComponent size="md" />
                      <span>{platform.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Scheduling */}
            <div className="form-group">
              <label htmlFor="schedule-date" className="form-label">
                Schedule for Later (Optional)
              </label>
              <input
                type="datetime-local"
                id="schedule-date"
                value={publishForm.scheduledFor}
                onChange={(e) => handlePublishFormChange('scheduledFor', e.target.value)}
                className="form-input"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            {/* File Upload */}
            <div className="form-group">
              <label htmlFor="file-upload" className="form-label">
                Attach Media (Optional)
              </label>
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="form-input"
              />
              {publishForm.attachments.length > 0 && (
                <div className="attachment-list">
                  {publishForm.attachments.map((file, index) => (
                    <div key={index} className="attachment-item">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPublishForm(prev => ({
                            ...prev,
                            attachments: prev.attachments.filter((_, i) => i !== index)
                          }))
                        }}
                        className="remove-attachment"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shared Assets */}
            <div className="form-group">
              <label className="form-label">Shared Assets</label>
              <button
                type="button"
                onClick={() => setShowAssetPicker(!showAssetPicker)}
                className="w-full p-3 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
              >
                {showAssetPicker ? 'Hide Assets' : 'Choose from Asset Library'}
              </button>
              
              {showAssetPicker && (
                <div className="mt-3 bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {sharedAssets.map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => {
                          const isSelected = publishForm.selectedAssets.includes(asset.id)
                          setPublishForm(prev => ({
                            ...prev,
                            selectedAssets: isSelected
                              ? prev.selectedAssets.filter(id => id !== asset.id)
                              : [...prev.selectedAssets, asset.id]
                          }))
                          
                          // Update asset usage tracking
                          if (!isSelected) {
                            updateAssetUsage(asset.id, {
                              feature: 'social_media',
                              itemId: 'publishing-form',
                              itemTitle: 'Social Media Post'
                            })
                          }
                        }}
                        className={`relative cursor-pointer rounded-lg border-2 p-2 hover:border-blue-300 ${
                          publishForm.selectedAssets.includes(asset.id) 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        {asset.type === 'image' ? (
                          <img
                            src={asset.url}
                            alt={asset.name}
                            className="w-full h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-16 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-600">{asset.type}</span>
                          </div>
                        )}
                        <p className="text-xs mt-1 truncate" title={asset.name}>
                          {asset.name}
                        </p>
                        {publishForm.selectedAssets.includes(asset.id) && (
                          <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {sharedAssets.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No shared assets available. Create some in Content Studio first!
                    </p>
                  )}
                </div>
              )}
              
              {publishForm.selectedAssets.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">
                    Selected: {publishForm.selectedAssets.length} asset(s)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {publishForm.selectedAssets.map((assetId) => {
                      const asset = sharedAssets.find(a => a.id === assetId)
                      if (!asset) return null
                      return (
                        <span
                          key={assetId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                        >
                          {asset.name}
                          <button
                            type="button"
                            onClick={() => {
                              setPublishForm(prev => ({
                                ...prev,
                                selectedAssets: prev.selectedAssets.filter(id => id !== assetId)
                              }))
                            }}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="publish-actions">
              <button
                type="button"
                onClick={publishPost}
                disabled={isPublishing || !publishForm.content.trim() || publishForm.platforms.length === 0}
                className="btn btn-primary"
              >
                {isPublishing ? 'Publishing...' : 
                 publishForm.scheduledFor ? 'Schedule Post' : 'Publish Now'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setPublishForm({
                    content: '',
                    platforms: [],
                    scheduledFor: '',
                    attachments: [],
                    selectedAssets: []
                  })
                }}
                className="btn btn-secondary"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="social-calendar">
          <div className="calendar-header">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Social Media Calendar</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}
                  className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
                >
                  ←
                </button>
                <span className="font-medium">
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}
                  className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          <div className="calendar-grid">
            {/* Calendar Header */}
            <div className="calendar-header-row">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="calendar-header-cell">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Body */}
            <div className="calendar-body">
              {generateCalendarGrid().map((week, weekIndex) => (
                <div key={weekIndex} className="calendar-week">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${
                        day.date.toDateString() === new Date().toDateString() ? 'today' : ''
                      }`}
                      onClick={() => schedulePostForDate(day.date)}
                    >
                      <div className="day-number">{day.date.getDate()}</div>
                      
                      {day.posts.length > 0 && (
                        <div className="day-posts">
                          {day.posts.slice(0, 3).map((post) => (
                            <div
                              key={post.id}
                              className={`post-indicator ${post.platform}`}
                              title={`${post.platform}: ${post.content.substring(0, 50)}...`}
                            >
                              {(() => {
                                const iconComponents = {
                                  twitter: TwitterIcon,
                                  linkedin: LinkedInIcon,
                                  instagram: InstagramIcon,
                                  tiktok: TikTokIcon,
                                  facebook: FacebookIcon
                                }
                                const IconComponent = iconComponents[post.platform as keyof typeof iconComponents] || SocialMediaIcon
                                return <IconComponent size="sm" />
                              })()}
                            </div>
                          ))}
                          {day.posts.length > 3 && (
                            <div className="more-posts">+{day.posts.length - 3}</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="calendar-legend">
            <h4 className="font-medium mb-3">Platform Colors</h4>
            <div className="flex flex-wrap gap-3">
              {[
                { platform: 'twitter', name: 'Twitter', color: 'bg-blue-500' },
                { platform: 'linkedin', name: 'LinkedIn', color: 'bg-blue-700' },
                { platform: 'instagram', name: 'Instagram', color: 'bg-pink-500' },
                { platform: 'facebook', name: 'Facebook', color: 'bg-blue-600' },
                { platform: 'tiktok', name: 'TikTok', color: 'bg-black' }
              ].map((item) => (
                <div key={item.platform} className="flex items-center gap-2 text-sm">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics View */}
      {viewMode === 'analytics' && (
        <div className="social-analytics">
          {analyticsLoading ? (
            <div className="loading-state">
              <div className="loading-spinner">Loading analytics...</div>
            </div>
          ) : analytics ? (
            <div className="analytics-dashboard">
              <h3>Social Media Analytics</h3>
              
              {/* Overview Metrics */}
              <div className="analytics-overview">
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-icon">📊</div>
                    <div className="metric-value">{analytics.overview.totalPosts}</div>
                    <div className="metric-label">Total Posts</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">❤️</div>
                    <div className="metric-value">{analytics.overview.totalEngagement.toLocaleString()}</div>
                    <div className="metric-label">Total Engagement</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">👁️</div>
                    <div className="metric-value">{analytics.overview.totalReach.toLocaleString()}</div>
                    <div className="metric-label">Total Reach</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">📈</div>
                    <div className="metric-value">{(analytics.overview.averageEngagementRate * 100).toFixed(1)}%</div>
                    <div className="metric-label">Avg Engagement Rate</div>
                  </div>
                </div>
              </div>

              {/* Platform Performance */}
              <div className="platform-performance">
                <h4>Platform Performance</h4>
                <div className="platform-metrics">
                  {analytics.platformMetrics.map((platform) => (
                    <div key={platform.platform} className="platform-metric-card">
                      <div className="platform-header">
                        <div className="platform-icon">
                          {getAccountIcon(platform.platform)}
                        </div>
                        <div className="platform-name">{platform.platform}</div>
                      </div>
                      <div className="platform-stats">
                        <div className="stat">
                          <span className="stat-value">{platform.posts}</span>
                          <span className="stat-label">Posts</span>
                        </div>
                        <div className="stat">
                          <span className="stat-value">{platform.followers.toLocaleString()}</span>
                          <span className="stat-label">Followers</span>
                        </div>
                        <div className="stat">
                          <span className="stat-value">{platform.engagement.toLocaleString()}</span>
                          <span className="stat-label">Engagement</span>
                        </div>
                        <div className="stat">
                          <span className={`stat-value ${platform.growthRate >= 0 ? 'positive' : 'negative'}`}>
                            {platform.growthRate >= 0 ? '+' : ''}{platform.growthRate.toFixed(1)}%
                          </span>
                          <span className="stat-label">Growth</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Content */}
              <div className="top-content">
                <h4>Top Performing Content</h4>
                <div className="content-list">
                  {analytics.topContent.map((content) => (
                    <div key={content.id} className="content-item">
                      <div className="content-platform">
                        {getAccountIcon(content.platform)}
                      </div>
                      <div className="content-details">
                        <p className="content-text">{content.content.substring(0, 100)}...</p>
                        <div className="content-meta">
                          <span className="engagement">{content.engagement.toLocaleString()} engagements</span>
                          <span className="date">{new Date(content.publishedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No analytics data available yet.</p>
              <p>Publish some content to see your analytics!</p>
              <button 
                onClick={() => setViewMode('publish')}
                className="btn-primary"
              >
                Create First Post
              </button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}
    </div>
  )
}

export default SocialMediaHub