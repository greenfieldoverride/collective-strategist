import React, { useState } from 'react'
import { useVentureContext, SharedTemplate } from '../contexts/VentureContext'

interface TemplateSelectorProps {
  type?: SharedTemplate['type']
  onSelectTemplate: (template: SharedTemplate) => void
  onCreateTemplate: (template: Omit<SharedTemplate, 'id' | 'createdAt' | 'usageCount' | 'usedBy'>) => void
  selectedTemplateId?: string
  showCreateForm?: boolean
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  type,
  onSelectTemplate,
  onCreateTemplate,
  selectedTemplateId,
  showCreateForm = true
}) => {
  const { sharedTemplates, getTemplatesByType, useTemplate } = useVentureContext()
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    type: type || 'content' as SharedTemplate['type'],
    category: '',
    template: {
      title: '',
      content: '',
      tags: [] as string[],
      metadata: {}
    },
    createdBy: 'current-user',
    isPublic: false
  })

  // Get templates based on type filter
  const availableTemplates = type 
    ? getTemplatesByType(type)
    : sharedTemplates

  // Filter templates based on search and category
  const filteredTemplates = availableTemplates.filter(template => {
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.template.content.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = [...new Set(availableTemplates.map(t => t.category))]

  const handleSelectTemplate = (template: SharedTemplate) => {
    // Track usage and notify parent
    const usedTemplate = useTemplate(template.id, {
      feature: type === 'social_post' ? 'social_media' : 'content_studio',
      itemId: `usage-${Date.now()}`,
      itemTitle: 'Template Application',
      usedAt: new Date().toISOString()
    })
    onSelectTemplate(usedTemplate)
  }

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.template.content.trim()) {
      alert('Please provide a name and content for the template')
      return
    }

    onCreateTemplate(newTemplate)
    setNewTemplate({
      name: '',
      description: '',
      type: type || 'content',
      category: '',
      template: {
        title: '',
        content: '',
        tags: [],
        metadata: {}
      },
      createdBy: 'current-user',
      isPublic: false
    })
    setIsCreating(false)
  }

  return (
    <div className="template-selector">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Content Templates</h3>
        {showCreateForm && (
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {isCreating ? 'Cancel' : 'Create Template'}
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="mb-4 space-y-3">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {categories.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        )}
      </div>

      {/* Create Template Form */}
      {isCreating && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h4 className="text-md font-semibold mb-3">Create New Template</h4>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Template name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Blog Posts, Social Media"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the template"
              />
            </div>

            {!type && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newTemplate.type}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, type: e.target.value as SharedTemplate['type'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="content">Content</option>
                  <option value="social_post">Social Post</option>
                  <option value="email">Email</option>
                  <option value="marketing_copy">Marketing Copy</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
              <input
                type="text"
                value={newTemplate.template.title}
                onChange={(e) => setNewTemplate(prev => ({ 
                  ...prev, 
                  template: { ...prev.template, title: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Default title for content created from this template"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={newTemplate.template.content}
                onChange={(e) => setNewTemplate(prev => ({ 
                  ...prev, 
                  template: { ...prev.template, content: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Template content (use {{variables}} for placeholders)"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={newTemplate.isPublic}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, isPublic: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-700">
                Make template public (available to all team members)
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreateTemplate}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Create Template
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template List */}
      <div className="space-y-3">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No templates found.</p>
            {searchTerm && <p className="text-sm">Try adjusting your search terms.</p>}
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div
              key={template.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedTemplateId === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleSelectTemplate(template)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {template.type}
                    </span>
                    {template.category && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded">
                        {template.category}
                      </span>
                    )}
                  </div>
                  
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                  )}
                  
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {template.template.content.substring(0, 150)}
                    {template.template.content.length > 150 ? '...' : ''}
                  </p>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Used {template.usageCount} times</span>
                    {template.lastUsed && (
                      <span>Last used: {new Date(template.lastUsed).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TemplateSelector