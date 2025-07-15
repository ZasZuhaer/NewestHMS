import React, { useState } from 'react';
import { RoomCategory, RoomFilter } from '../../types';
import { Search, Filter } from 'lucide-react';

interface RoomFiltersProps {
  onFilterChange: (filter: RoomFilter) => void;
}

const RoomFilters: React.FC<RoomFiltersProps> = ({ onFilterChange }) => {
  const [category, setCategory] = useState<RoomCategory | ''>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [hasAC, setHasAC] = useState<boolean>(false);
  
  const categories: RoomCategory[] = ['Double', 'Couple', 'Connecting'];
  
  // Apply filters immediately when AC checkbox changes
  const handleACChange = (checked: boolean) => {
    setHasAC(checked);
    
    // Apply filter immediately
    let effectiveEndDate = endDate;
    if (startDate && !endDate) {
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      effectiveEndDate = nextDay.toISOString().split('T')[0];
    }
    
    onFilterChange({
      category: category ? category as RoomCategory : undefined,
      startDate: startDate || undefined,
      endDate: effectiveEndDate || undefined,
      hasAC: checked || undefined,
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If end date is not set, use start date + 1 day
    let effectiveEndDate = endDate;
    if (startDate && !endDate) {
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      effectiveEndDate = nextDay.toISOString().split('T')[0];
    }
    
    onFilterChange({
      category: category ? category as RoomCategory : undefined,
      startDate: startDate || undefined,
      endDate: effectiveEndDate || undefined,
      hasAC: hasAC ? true : undefined,
    });
  };
  
  const handleClearFilters = () => {
    setCategory('');
    setStartDate('');
    setEndDate('');
    setHasAC(false);
    // Apply cleared filters immediately
    onFilterChange({});
  };
  
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Room Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as RoomCategory | '')}
            className="w-full h-[38px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            Check-In Date
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-[38px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            Check-Out Date
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full h-[38px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
            disabled={!startDate}
          />
        </div>
        
        
        <div className="flex items-end space-x-2">

          
          
          <button
            type="submit"
            className="flex-1 inline-flex items-center justify-center px-2 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </button>
          
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            Clear
          </button>
        </div>
      </div>
    </form>
  );
};

export default RoomFilters;