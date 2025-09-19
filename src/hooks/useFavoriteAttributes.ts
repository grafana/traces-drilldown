import { useState, useEffect, useCallback } from 'react';
import { defaultFavoriteResourceAttributes, defaultFavoriteSpanAttributes } from 'utils/shared';
import { SceneObject } from '@grafana/scenes';
import { getTraceByServiceScene } from 'utils/utils';

const FAVORITES_ATTRIBUTES_STORAGE_KEY = 'grafana.traces-drilldown.favorites.attributes';

// Default favorites attributes from defaultFavoriteResourceAttributes and defaultFavoriteSpanAttributes
const getDefaultFavoritesAttributes = (): string[] => {
  return [...defaultFavoriteResourceAttributes, ...defaultFavoriteSpanAttributes];
};

interface UseFavoriteAttributesProps {
  scene: SceneObject;
}

interface UseFavoriteAttributesReturn {
  favoriteAttributes: string[];
  toggleFavorite: (attributeValue: string) => void;
  reorderFavorites: (draggedIndex: number, dropIndex: number) => void;
}

export function useFavoriteAttributes({ scene }: UseFavoriteAttributesProps): UseFavoriteAttributesReturn {
  const [favoriteAttributes, setFavoriteAttributes] = useState<string[]>([]);
  const { attributes } = getTraceByServiceScene(scene).useState();

  // Load favorites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_ATTRIBUTES_STORAGE_KEY);
    if (stored) {
      try {
        setFavoriteAttributes(JSON.parse(stored));
      } catch {
        // If parsing fails, use defaults
        const defaults = getDefaultFavoritesAttributes();
        const filteredDefaults = defaults.filter((attr) => attributes?.some((option) => option === attr));
        setFavoriteAttributes(filteredDefaults);
      }
    } else {
      // Initialize with defaults
      const defaults = getDefaultFavoritesAttributes();
      const filteredDefaults = defaults.filter((attr) => attributes?.some((option) => option === attr));
      setFavoriteAttributes(filteredDefaults);
      localStorage.setItem(FAVORITES_ATTRIBUTES_STORAGE_KEY, JSON.stringify(defaults));
    }
  }, [attributes]);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (favoriteAttributes.length > 0) {
      localStorage.setItem(FAVORITES_ATTRIBUTES_STORAGE_KEY, JSON.stringify(favoriteAttributes));
    }
  }, [favoriteAttributes]);

  const toggleFavorite = useCallback((attributeValue: string) => {
    setFavoriteAttributes((prev) => {
      const isFavorite = prev.includes(attributeValue);
      if (isFavorite) {
        return prev.filter((attr) => attr !== attributeValue);
      } else {
        return [...prev, attributeValue];
      }
    });
  }, []);

  const reorderFavorites = useCallback((draggedIndex: number, dropIndex: number) => {
    setFavoriteAttributes((prev) => {
      const newOrder = [...prev];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(dropIndex, 0, prev[draggedIndex]);
      return newOrder;
    });
  }, []);

  return {
    favoriteAttributes,
    toggleFavorite,
    reorderFavorites,
  };
}
