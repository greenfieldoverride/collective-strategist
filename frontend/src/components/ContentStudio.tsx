import { useState, useEffect } from 'react'
import '../styles/content-studio.css'

interface ContentDraft {
  id: string
  title: string
  content: string
  contentType: 'social_post' | 'blog_article' | 'marketing_copy' | 'email'
  platform?: string
  tone: 'professional' | 'casual' | 'enthusiastic' | 'authoritative'
  length: 'short' | 'medium' | 'long'
  status: 'draft' | 'generating' | 'review' | 'approved' | 'scheduled' | 'published'
  createdAt: string
  scheduledFor?: string
  assets: ContentAsset[]
  suggestions: string[]
  aiProvider?: string
}

interface ContentAsset {
  id: string
  type: 'image' | 'video' | 'document' | 'link'
  url: string
  name: string
  description?: string
  altText?: string
}

interface ContentGenerationRequest {
  contentType: 'social_post' | 'blog_article' | 'marketing_copy' | 'email'
  platform?: string
  prompt?: string
  tone: 'professional' | 'casual' | 'enthusiastic' | 'authoritative'
  length: 'short' | 'medium' | 'long'
  aiProvider?: string
}

interface ContentStudioProps {
  ventureId: string
}

export default function ContentStudio({ ventureId }: ContentStudioProps) {
  const [contentDrafts, setContentDrafts] = useState<ContentDraft[]>([])
  const [selectedDraft, setSelectedDraft] = useState<ContentDraft | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showGenerationModal, setShowGenerationModal] = useState(false)
  const [showAssetModal, setShowAssetModal] = useState(false)
  const [assets, setAssets] = useState<ContentAsset[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'pipeline'>('grid')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    loadContentDrafts()
    loadAssets()
  }, [ventureId])

  const loadContentDrafts = async () => {
    try {
      // Mock data for now - will connect to backend API
      const mockDrafts: ContentDraft[] = [
        {
          id: '1',
          title: 'Liberation Tech Trends 2024',
          content: 'The future of decentralized technology is...',
          contentType: 'blog_article',
          tone: 'professional',
          length: 'long',
          status: 'draft',
          createdAt: new Date().toISOString(),
          assets: [],
          suggestions: [
            'Add relevant data and statistics to support key points',
            'Include case studies or examples',
            'Create visual elements like infographics'
          ]
        },
        {
          id: '2',
          title: 'Weekly Community Update',
          content: 'This week in our liberation journey... 🌱',
          contentType: 'social_post',
          platform: 'twitter',
          tone: 'enthusiastic',
          length: 'short',
          status: 'approved',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          scheduledFor: new Date(Date.now() + 3600000).toISOString(),
          assets: [],
          suggestions: [
            'Add a compelling question to increase engagement',
            'Include relevant hashtags for better discoverability'
          ]
        }
      ]
      setContentDrafts(mockDrafts)
    } catch (error) {
      console.error('Failed to load content drafts:', error)
    }
  }

  const loadAssets = async () => {
    try {
      // Connect to real asset management API
      const response = await fetch(`http://localhost:8007/api/v1/ventures/${ventureId}/assets?limit=50`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load assets')
      }

      const data = await response.json()
      
      // Convert API response to ContentAsset format
      const contentAssets: ContentAsset[] = data.assets.map((asset: any) => ({
        id: asset.id,
        type: asset.file_type, // 'image', 'video', 'document', etc.
        url: `http://localhost:8007/${asset.file_path}`, // Construct full URL
        name: asset.name,
        description: asset.description,
        altText: asset.alt_text
      }))

      setAssets(contentAssets)
    } catch (error) {
      console.error('Failed to load assets:', error)
      // Fall back to empty assets if API fails
      setAssets([])
    }
  }

  const generateContent = async (request: ContentGenerationRequest) => {
    setIsGenerating(true)
    try {
      // Call content generation API
      const response = await fetch(`http://localhost:8007/api/content-drafter/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          contextualCoreId: ventureId,
          ...request
        })
      })

      if (!response.ok) {
        throw new Error('Content generation failed')
      }

      const data = await response.json()
      
      const newDraft: ContentDraft = {
        id: Date.now().toString(),
        title: data.title || `New ${request.contentType.replace('_', ' ')}`,
        content: data.content,
        contentType: request.contentType,
        platform: request.platform,
        tone: request.tone,
        length: request.length,
        status: 'draft',
        createdAt: new Date().toISOString(),
        assets: [],
        suggestions: data.suggestions || [],
        aiProvider: request.aiProvider
      }

      setContentDrafts(prev => [newDraft, ...prev])
      setSelectedDraft(newDraft)
      setShowGenerationModal(false)
    } catch (error) {
      console.error('Content generation failed:', error)
      alert('Failed to generate content. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const updateDraft = (draftId: string, updates: Partial<ContentDraft>) => {
    setContentDrafts(prev => 
      prev.map(draft => 
        draft.id === draftId ? { ...draft, ...updates } : draft
      )
    )
    if (selectedDraft?.id === draftId) {
      setSelectedDraft(prev => prev ? { ...prev, ...updates } : null)
    }
  }

  const approveDraft = (draftId: string) => {
    updateDraft(draftId, { status: 'approved' })
    // Here we could integrate with calendar to schedule or with social media hub
  }



  const filteredDrafts = contentDrafts.filter(draft => 
    filterStatus === 'all' || draft.status === filterStatus
  )

  return (
    <div className="content-studio">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">✍️ Content Studio</h2>
            <p className="page-subtitle">AI-powered content creation for your liberation journey</p>
          </div>
          <button
            onClick={() => setShowGenerationModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span>🤖</span>
            Generate Content
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg border">
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'pipeline' ? 'bg-white shadow' : ''}`}
            >
              Pipeline
            </button>
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div className="text-sm text-gray-600">
          {filteredDrafts.length} content pieces
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-12 gap-6">
        {/* Content List/Grid */}
        <div className={selectedDraft ? 'col-span-8' : 'col-span-12'}>
          {viewMode === 'grid' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDrafts.map(draft => (
                <ContentCard 
                  key={draft.id} 
                  draft={draft} 
                  onSelect={setSelectedDraft}
                  onApprove={approveDraft}
                />
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-2">
              {filteredDrafts.map(draft => (
                <ContentListItem 
                  key={draft.id} 
                  draft={draft} 
                  onSelect={setSelectedDraft}
                  onApprove={approveDraft}
                />
              ))}
            </div>
          )}

          {viewMode === 'pipeline' && (
            <ContentPipeline 
              drafts={filteredDrafts}
              onSelect={setSelectedDraft}
            />
          )}
        </div>

        {/* Content Editor */}
        {selectedDraft && (
          <div className="col-span-4">
            <ContentEditor 
              draft={selectedDraft}
              assets={assets}
              onUpdate={(updates) => updateDraft(selectedDraft.id, updates)}
              onApprove={() => approveDraft(selectedDraft.id)}
            />
          </div>
        )}
      </div>

      {/* Content Generation Modal */}
      {showGenerationModal && (
        <ContentGenerationModal
          isOpen={showGenerationModal}
          onClose={() => setShowGenerationModal(false)}
          onGenerate={generateContent}
          isGenerating={isGenerating}
        />
      )}

      {/* Asset Management Modal */}
      {showAssetModal && (
        <AssetManagementModal
          isOpen={showAssetModal}
          onClose={() => setShowAssetModal(false)}
          ventureId={ventureId}
          onAssetUploaded={loadAssets}
        />
      )}
    </div>
  )
}

// Supporting Components
function ContentCard({ draft, onSelect, onApprove }: {
  draft: ContentDraft
  onSelect: (draft: ContentDraft) => void
  onApprove: (id: string) => void
}) {
  return (
    <div 
      onClick={() => onSelect(draft)}
      className="p-4 bg-white rounded-lg border hover:border-blue-300 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 line-clamp-2">{draft.title}</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(draft.status)}`}>
          {draft.status}
        </span>
      </div>
      
      <p className="text-gray-600 text-sm mb-3 line-clamp-3">{draft.content}</p>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-gray-100 rounded">{draft.contentType}</span>
          {draft.platform && (
            <span className="px-2 py-1 bg-blue-100 rounded">{draft.platform}</span>
          )}
        </div>
        <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
      </div>
      
      {draft.status === 'review' && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onApprove(draft.id)
          }}
          className="w-full mt-3 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          Approve
        </button>
      )}
    </div>
  )
}

function ContentListItem({ draft, onSelect, onApprove }: {
  draft: ContentDraft
  onSelect: (draft: ContentDraft) => void
  onApprove: (id: string) => void
}) {
  return (
    <div 
      onClick={() => onSelect(draft)}
      className="flex items-center justify-between p-4 bg-white rounded-lg border hover:border-blue-300 cursor-pointer"
    >
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">{draft.title}</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(draft.status)}`}>
            {draft.status}
          </span>
        </div>
        <p className="text-gray-600 text-sm mt-1">{draft.content.substring(0, 100)}...</p>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>{draft.contentType}</span>
        <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
        {draft.status === 'review' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onApprove(draft.id)
            }}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Approve
          </button>
        )}
      </div>
    </div>
  )
}

function ContentPipeline({ drafts, onSelect }: {
  drafts: ContentDraft[]
  onSelect: (draft: ContentDraft) => void
}) {
  const stages = ['draft', 'review', 'approved', 'scheduled', 'published']
  
  return (
    <div className="grid grid-cols-5 gap-4">
      {stages.map(stage => (
        <div key={stage} className="space-y-2">
          <h3 className="font-semibold text-gray-900 capitalize text-center">
            {stage} ({drafts.filter(d => d.status === stage).length})
          </h3>
          <div className="space-y-2 min-h-[200px] p-2 bg-gray-50 rounded-lg">
            {drafts
              .filter(draft => draft.status === stage)
              .map(draft => (
                <div
                  key={draft.id}
                  onClick={() => onSelect(draft)}
                  className="p-3 bg-white rounded border cursor-pointer hover:border-blue-300"
                >
                  <h4 className="font-medium text-sm">{draft.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {draft.contentType} • {new Date(draft.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ContentEditor({ draft, assets, onUpdate, onApprove }: {
  draft: ContentDraft
  assets: ContentAsset[]
  onUpdate: (updates: Partial<ContentDraft>) => void
  onApprove: () => void
}) {
  const [content, setContent] = useState(draft.content)
  const [title, setTitle] = useState(draft.title)

  const handleSave = () => {
    onUpdate({ content, title })
  }

  return (
    <div className="p-4 bg-white rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Edit Content</h3>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Save
          </button>
          {draft.status === 'draft' && (
            <button
              onClick={() => onUpdate({ status: 'review' })}
              className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
            >
              Submit for Review
            </button>
          )}
          {draft.status === 'review' && (
            <button
              onClick={onApprove}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Approve
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        {draft.suggestions.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">AI Suggestions</h4>
            <div className="space-y-2">
              {draft.suggestions.map((suggestion, index) => (
                <div key={index} className="p-2 bg-blue-50 rounded text-sm">
                  💡 {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">Assets</h4>
            <button
              onClick={() => setShowAssetModal(true)}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              📁 Manage
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {assets.slice(0, 6).map(asset => (
              <div key={asset.id} className="p-2 border rounded cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <span>{asset.type === 'image' ? '🖼️' : asset.type === 'video' ? '🎥' : '📄'}</span>
                  <span className="text-sm truncate">{asset.name}</span>
                </div>
              </div>
            ))}
            {assets.length === 0 && (
              <div className="col-span-2 text-center py-4 text-gray-500 text-sm">
                No assets found. Click "Manage" to upload.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ContentGenerationModal({ isOpen, onClose, onGenerate, isGenerating }: {
  isOpen: boolean
  onClose: () => void
  onGenerate: (request: ContentGenerationRequest) => void
  isGenerating: boolean
}) {
  const [request, setRequest] = useState<ContentGenerationRequest>({
    contentType: 'social_post',
    tone: 'professional',
    length: 'medium'
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="font-semibold text-lg mb-4">Generate Content</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
            <select
              value={request.contentType}
              onChange={(e) => setRequest(prev => ({ 
                ...prev, 
                contentType: e.target.value as ContentGenerationRequest['contentType']
              }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="social_post">Social Post</option>
              <option value="blog_article">Blog Article</option>
              <option value="marketing_copy">Marketing Copy</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
            <select
              value={request.tone}
              onChange={(e) => setRequest(prev => ({ 
                ...prev, 
                tone: e.target.value as ContentGenerationRequest['tone']
              }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="enthusiastic">Enthusiastic</option>
              <option value="authoritative">Authoritative</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Length</label>
            <select
              value={request.length}
              onChange={(e) => setRequest(prev => ({ 
                ...prev, 
                length: e.target.value as ContentGenerationRequest['length']
              }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prompt (Optional)</label>
            <textarea
              value={request.prompt || ''}
              onChange={(e) => setRequest(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="Describe what you want to write about..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onGenerate(request)}
            disabled={isGenerating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AssetManagementModal({ isOpen, onClose, ventureId, onAssetUploaded }: {
  isOpen: boolean
  onClose: () => void
  ventureId: string
  onAssetUploaded: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [assets, setAssets] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadAssets()
      loadTags()
    }
  }, [isOpen, ventureId])

  const loadAssets = async () => {
    try {
      const response = await fetch(`http://localhost:8007/api/v1/ventures/${ventureId}/assets?search=${searchTerm}&tagIds=${selectedTags.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAssets(data.assets)
      }
    } catch (error) {
      console.error('Failed to load assets:', error)
    }
  }

  const loadTags = async () => {
    try {
      const response = await fetch(`http://localhost:8007/api/v1/ventures/${ventureId}/asset-tags`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setTags(data.tags)
      }
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name)
      formData.append('description', `Uploaded asset: ${file.name}`)
      if (selectedTags.length > 0) {
        formData.append('tagIds', JSON.stringify(selectedTags))
      }

      const response = await fetch(`http://localhost:8007/api/v1/ventures/${ventureId}/assets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      if (response.ok) {
        await loadAssets()
        onAssetUploaded()
        event.target.value = '' // Reset input
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload asset. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Asset Management</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Upload Section */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload New Asset
          </label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              disabled={uploading}
              className="text-sm"
            />
            {uploading && <span className="text-sm text-blue-600">Uploading...</span>}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 space-y-2">
          <input
            type="text"
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => {
                    if (selectedTags.includes(tag.id)) {
                      setSelectedTags(selectedTags.filter(id => id !== tag.id))
                    } else {
                      setSelectedTags([...selectedTags, tag.id])
                    }
                  }}
                  className={`px-2 py-1 text-xs rounded ${
                    selectedTags.includes(tag.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  style={tag.color ? { backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined } : {}}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Assets Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {assets.map(asset => (
              <div key={asset.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {asset.file_type === 'image' ? (
                  <img
                    src={`http://localhost:8007/${asset.file_path}`}
                    alt={asset.alt_text || asset.name}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                    <span className="text-2xl">
                      {asset.file_type === 'video' ? '🎥' : 
                       asset.file_type === 'document' ? '📄' : '📁'}
                    </span>
                  </div>
                )}
                <div className="p-2">
                  <h4 className="font-medium text-sm truncate">{asset.name}</h4>
                  <p className="text-xs text-gray-600 truncate">{asset.description}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {asset.tags?.map((tag: any) => (
                      <span
                        key={tag.id}
                        className="px-1 py-0.5 text-xs rounded"
                        style={{ backgroundColor: tag.color || '#e5e7eb', color: tag.color ? 'white' : 'black' }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {assets.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No assets found. Upload some files to get started!
            </div>
          )}
        </div>

        {/* Search Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={loadAssets}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  )
}

function getStatusColor(status: string) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    generating: 'bg-blue-100 text-blue-800',
    review: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    scheduled: 'bg-purple-100 text-purple-800',
    published: 'bg-indigo-100 text-indigo-800'
  }
  return colors[status as keyof typeof colors] || colors.draft
}