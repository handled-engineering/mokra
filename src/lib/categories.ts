import categoriesData from "../../config/categories.json"

export interface Category {
  id: string
  name: string
  description?: string
}

/**
 * Get all available categories
 */
export function getCategories(): Category[] {
  return categoriesData.categories
}

/**
 * Get a category by its ID
 */
export function getCategoryById(id: string): Category | undefined {
  return categoriesData.categories.find((c) => c.id === id)
}

/**
 * Get category name by ID (returns ID if not found)
 */
export function getCategoryName(id: string): string {
  const category = getCategoryById(id)
  return category?.name ?? id
}

/**
 * Validate if a category ID exists
 */
export function isValidCategory(id: string): boolean {
  return categoriesData.categories.some((c) => c.id === id)
}
