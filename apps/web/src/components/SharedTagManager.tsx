import React, { useState } from 'react'
import { useVentureContext, SharedTag } from '../contexts/VentureContext'

interface SharedTagManagerProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  category?: SharedTag['category']
  placeholder?: string
  allowCreate?: boolean
  maxTags?: number
  size?: 'sm' | 'md' | 'lg'
}

const SharedTagManager: React.FC<SharedTagManagerProps> = ({
  selectedTags,
  onTagsChange,
  category,
  placeholder = "Add tags...",
  allowCreate = true,
  maxTags = 10,
  size = 'md'
}) => {
  const { 
    sharedTags, 
    addSharedTag, 
    useTag, 
    getPopularTags, 
    searchTags 
  } = useVentureContext()
  
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [newTagColor, setNewTagColor] = useState('#3B82F6')
  
  // Get suggestions based on input
  const suggestions = inputValue.trim()
    ? searchTags(inputValue).filter(tag => !selectedTags.includes(tag.id))
    : getPopularTags(8).filter(tag => !selectedTags.includes(tag.id))

  // Get selected tag objects
  const selectedTagObjects = selectedTags
    .map(tagId => sharedTags.find(tag => tag.id === tagId))
    .filter(Boolean) as SharedTag[]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setShowSuggestions(value.length > 0)
  }

  const handleTagSelect = (tag: SharedTag) => {
    if (selectedTags.length >= maxTags) {
      alert(`Maximum ${maxTags} tags allowed`)
      return
    }
    
    // Track tag usage
    useTag(tag.id, {
      feature: category === 'social' ? 'social_media' : 'content_studio',
      itemType: category === 'asset' ? 'asset' : category === 'social' ? 'post' : 'content',
      itemId: `selection-${Date.now()}`,
      itemTitle: 'Tag Selection',
      usedAt: new Date().toISOString()
    })
    
    onTagsChange([...selectedTags, tag.id])
    setInputValue('')
    setShowSuggestions(false)
  }

  const handleTagRemove = (tagId: string) => {
    onTagsChange(selectedTags.filter(id => id !== tagId))
  }

  const handleCreateNewTag = () => {
    const tagName = inputValue.trim()
    if (!tagName) return
    
    // Check if tag already exists
    const existingTag = sharedTags.find(tag => 
      tag.name.toLowerCase() === tagName.toLowerCase()
    )
    
    if (existingTag) {
      handleTagSelect(existingTag)
      return
    }
    
    if (selectedTags.length >= maxTags) {
      alert(`Maximum ${maxTags} tags allowed`)
      return
    }

    try {
      addSharedTag({
        name: tagName,
        color: newTagColor,
        category: category || 'general',
        createdBy: 'current-user',
        isSystem: false
      })
      
      // The new tag will be available after the next render
      setInputValue('')
      setShowSuggestions(false)
    } catch (error) {
      console.error('Failed to create tag:', error)
      alert('Failed to create tag. Please try again.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      if (suggestions.length > 0) {
        handleTagSelect(suggestions[0])
      } else if (allowCreate && inputValue.trim()) {
        handleCreateNewTag()
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      handleTagRemove(selectedTags[selectedTags.length - 1])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  }

  const tagSizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-2'
  }

  return (
    <div className="relative">
      {/* Selected Tags Display */}
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTagObjects.map(tag => (
            <span
              key={tag.id}
              className={`inline-flex items-center gap-1 rounded-full border ${tagSizeClasses[size]}`}
              style={{ 
                backgroundColor: tag.color ? `${tag.color}15` : '#f3f4f6',
                borderColor: tag.color || '#d1d5db',
                color: tag.color || '#374151'
              }}
            >
              {tag.name}
              <button
                onClick={() => handleTagRemove(tag.id)}
                className="hover:text-red-600 focus:outline-none"
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className={`w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${sizeClasses[size]}`}
        />
        
        {selectedTags.length > 0 && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
            {selectedTags.length}/{maxTags}
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.length > 0 ? (
            <>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                Existing Tags
              </div>
              {suggestions.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleTagSelect(tag)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: tag.color || '#gray' }}
                    />
                    <span>{tag.name}</span>
                    {tag.category !== 'general' && (
                      <span className="text-xs text-gray-500">({tag.category})</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    Used {tag.usageCount} times
                  </span>
                </button>
              ))}
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No existing tags found
            </div>
          )}
          
          {/* Create New Tag Option */}
          {allowCreate && inputValue.trim() && !suggestions.some(tag => 
            tag.name.toLowerCase() === inputValue.toLowerCase()
          ) && (
            <>
              <div className="border-t">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Create New Tag
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-6 h-6 rounded border"
                    />
                    <span className="text-sm">Choose color</span>
                  </div>
                  <button
                    onClick={handleCreateNewTag}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    type="button"
                  >
                    Create "{inputValue}"
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showSuggestions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  )
}

export default SharedTagManager