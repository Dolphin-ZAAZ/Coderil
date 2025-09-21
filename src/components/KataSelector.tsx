import { useState, useMemo } from 'react'
import { Kata, KataFilters, Language, KataType, Difficulty } from '@/types'
import './KataSelector.css'

interface KataSelectorProps {
  katas: Kata[]
  selectedKata: Kata | null
  onKataSelect: (kata: Kata) => void
  isLoading?: boolean
}

export function KataSelector({ katas, selectedKata, onKataSelect, isLoading = false }: KataSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<KataFilters>({})

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const languages = new Set<Language>()
    const types = new Set<KataType>()
    const difficulties = new Set<Difficulty>()
    const tags = new Set<string>()

    katas.forEach(kata => {
      languages.add(kata.language)
      types.add(kata.type)
      difficulties.add(kata.difficulty)
      kata.tags.forEach(tag => tags.add(tag))
    })

    return {
      languages: Array.from(languages).sort(),
      types: Array.from(types).sort(),
      difficulties: Array.from(difficulties).sort(),
      tags: Array.from(tags).sort()
    }
  }, [katas])

  // Filter katas based on search term and filters
  const filteredKatas = useMemo(() => {
    return katas.filter(kata => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          kata.title.toLowerCase().includes(searchLower) ||
          kata.slug.toLowerCase().includes(searchLower) ||
          kata.tags.some(tag => tag.toLowerCase().includes(searchLower))
        
        if (!matchesSearch) return false
      }

      // Language filter
      if (filters.language && filters.language.length > 0) {
        if (!filters.language.includes(kata.language)) return false
      }

      // Type filter
      if (filters.type && filters.type.length > 0) {
        if (!filters.type.includes(kata.type)) return false
      }

      // Difficulty filter
      if (filters.difficulty && filters.difficulty.length > 0) {
        if (!filters.difficulty.includes(kata.difficulty)) return false
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(filterTag => 
          kata.tags.includes(filterTag)
        )
        if (!hasMatchingTag) return false
      }

      return true
    })
  }, [katas, searchTerm, filters])

  const handleFilterChange = (filterType: keyof KataFilters, value: string, checked: boolean) => {
    setFilters(prev => {
      const currentValues = prev[filterType] || []
      
      if (checked) {
        // Add value if not already present
        if (!currentValues.includes(value as any)) {
          return {
            ...prev,
            [filterType]: [...currentValues, value]
          }
        }
      } else {
        // Remove value
        return {
          ...prev,
          [filterType]: currentValues.filter(v => v !== value)
        }
      }
      
      return prev
    })
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
  }

  const hasActiveFilters = searchTerm || Object.values(filters).some(filter => filter && filter.length > 0)

  if (isLoading) {
    return (
      <div className="kata-selector">
        <div className="kata-selector-header">
          <h2>Available Katas</h2>
        </div>
        <div className="loading-state">
          <p>Loading katas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="kata-selector">
      <div className="kata-selector-header">
        <h2>Available Katas</h2>
        <div className="kata-count">
          {filteredKatas.length} of {katas.length} katas
        </div>
      </div>

      <div className="search-section">
        <input
          type="text"
          placeholder="Search katas by title, slug, or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="filters-section">
        <div className="filters-header">
          <h3>Filters</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear All
            </button>
          )}
        </div>

        <div className="filter-groups">
          {/* Language Filter */}
          <div className="filter-group">
            <h4>Language</h4>
            <div className="filter-options">
              {filterOptions.languages.map(language => (
                <label key={language} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.language?.includes(language) || false}
                    onChange={(e) => handleFilterChange('language', language, e.target.checked)}
                  />
                  <span className="filter-label">{language.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div className="filter-group">
            <h4>Type</h4>
            <div className="filter-options">
              {filterOptions.types.map(type => (
                <label key={type} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.type?.includes(type) || false}
                    onChange={(e) => handleFilterChange('type', type, e.target.checked)}
                  />
                  <span className="filter-label">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div className="filter-group">
            <h4>Difficulty</h4>
            <div className="filter-options">
              {filterOptions.difficulties.map(difficulty => (
                <label key={difficulty} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.difficulty?.includes(difficulty) || false}
                    onChange={(e) => handleFilterChange('difficulty', difficulty, e.target.checked)}
                  />
                  <span className="filter-label">{difficulty}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          {filterOptions.tags.length > 0 && (
            <div className="filter-group">
              <h4>Tags</h4>
              <div className="filter-options tags-filter">
                {filterOptions.tags.map(tag => (
                  <label key={tag} className="filter-option">
                    <input
                      type="checkbox"
                      checked={filters.tags?.includes(tag) || false}
                      onChange={(e) => handleFilterChange('tags', tag, e.target.checked)}
                    />
                    <span className="filter-label">{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="kata-list-section">
        {filteredKatas.length === 0 ? (
          <div className="no-katas">
            {katas.length === 0 ? (
              <>
                <p>No katas found.</p>
                <p>Add kata folders to the /katas/ directory to get started.</p>
              </>
            ) : (
              <>
                <p>No katas match your current filters.</p>
                <button onClick={clearFilters} className="clear-filters-btn">
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="kata-list">
            {filteredKatas.map((kata) => (
              <div
                key={kata.slug}
                className={`kata-item ${selectedKata?.slug === kata.slug ? 'selected' : ''}`}
                onClick={() => onKataSelect(kata)}
              >
                <div className="kata-header">
                  <h3 className="kata-title">{kata.title}</h3>
                  <div className="kata-meta">
                    <span className={`difficulty ${kata.difficulty}`}>{kata.difficulty}</span>
                    <span className="language">{kata.language.toUpperCase()}</span>
                    <span className={`type ${kata.type}`}>{kata.type}</span>
                  </div>
                </div>
                
                {kata.tags.length > 0 && (
                  <div className="kata-tags">
                    {kata.tags.map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}