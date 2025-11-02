'use client';
import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => {
  return (
    <div className="animate-pulse">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="flex-1 h-12 bg-gray-200 rounded"></div>
            <div className="w-24 h-12 bg-gray-200 rounded"></div>
            <div className="w-32 h-12 bg-gray-200 rounded"></div>
            <div className="w-24 h-12 bg-gray-200 rounded"></div>
            <div className="w-32 h-12 bg-gray-200 rounded"></div>
            <div className="w-24 h-12 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => {
  return (
    <div className="animate-pulse">
      <div className="space-y-4">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
          <div className="h-8 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  );
};

