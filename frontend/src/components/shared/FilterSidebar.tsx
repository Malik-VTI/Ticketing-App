import React from 'react'
import './Shared.css'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterGroup {
  id: string
  title: string
  type: 'checkbox' | 'radio' | 'price'
  options?: FilterOption[]
}

interface FilterSidebarProps {
  groups: FilterGroup[]
  filters: Record<string, string[]>
  onFilterChange: (groupId: string, value: string, checked: boolean) => void
  onReset: () => void
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ groups, filters, onFilterChange, onReset }) => {
  return (
    <aside className="filters-sidebar">
      <div className="filter-header">
        <h3>Filter</h3>
        <button className="btn-reset-filters" type="button" onClick={onReset}>Reset</button>
      </div>

      {groups.map(group => (
        <div className="filter-group" key={group.id}>
          <h4>{group.title} <span className="chevron">⌄</span></h4>
          {group.type === 'price' && (
            <div className="price-inputs">
              <input type="text" placeholder="Min Price" readOnly />
              <input type="text" placeholder="Max Price" readOnly />
            </div>
          )}
          
          {(group.type === 'checkbox' || group.type === 'radio') && group.options && group.options.map(opt => {
            const isChecked = (filters[group.id] || []).includes(opt.value)
            return (
              <label className="checkbox-label" key={opt.value}>
                <span>{opt.label}</span>
                <input 
                  type={group.type}
                  checked={isChecked}
                  onChange={(e) => onFilterChange(group.id, opt.value, e.target.checked)}
                />
              </label>
            )
          })}
        </div>
      ))}
    </aside>
  )
}

export default FilterSidebar
