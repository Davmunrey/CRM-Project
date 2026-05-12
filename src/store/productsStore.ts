import { create } from 'zustand'
import type { Product } from '../types'
import { api } from '../lib/api'

interface ProductsStore {
  products: Product[]
  isLoading: boolean
  error: string | null
  fetchProducts: () => Promise<void>
  addProduct: (p: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateProduct: (id: string, updates: Partial<Product>) => void
  deleteProduct: (id: string) => void
  getActive: () => Product[]
}

type ApiProduct = Record<string, unknown>

function rowToProduct(r: ApiProduct): Product {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? undefined,
    sku: (r.sku as string) ?? undefined,
    price: r.price as number,
    currency: ((r.currency as import('../types').DealCurrency) ?? 'EUR'),
    category: ((r.category as import('../types').ProductCategory) ?? undefined),
    isActive: ((r.isActive ?? r.is_active) as boolean) ?? true,
    createdAt: ((r.createdAt ?? r.created_at) as string),
    updatedAt: ((r.updatedAt ?? r.updated_at) as string),
  }
}

export const useProductsStore = create<ProductsStore>()((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.get<ApiProduct[]>('/products')
      set({ products: (data ?? []).map(rowToProduct), isLoading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  addProduct: (data) => {
    const now = new Date().toISOString()
    const optimistic: Product = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
    set((s) => ({ products: [...s.products, optimistic] }))
    api.post<ApiProduct>('/products', {
      name: data.name,
      description: data.description,
      sku: data.sku,
      price: data.price,
      currency: data.currency,
      category: data.category,
      isActive: data.isActive,
    }).then((created) => {
      set((s) => ({ products: s.products.map((p) => p.id === optimistic.id ? rowToProduct(created) : p) }))
    }).catch((err: Error) => {
      set((s) => ({ products: s.products.filter((p) => p.id !== optimistic.id), error: err.message }))
    })
  },

  updateProduct: (id, updates) => {
    set((s) => ({
      products: s.products.map((p) => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p),
    }))
    api.patch(`/products/${id}`, updates).catch(() => {})
  },

  deleteProduct: (id) => {
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
    api.delete(`/products/${id}`).catch(() => {})
  },

  getActive: () => get().products.filter((p) => p.isActive),
}))
