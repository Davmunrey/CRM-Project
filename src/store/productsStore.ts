import { create } from 'zustand'
import type { Product } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { devConsole } from '../lib/devConsole'
import { getOrgId, sbDelete } from '../lib/supabaseHelpers'

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

export const useProductsStore = create<ProductsStore>()((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ products: [] })
      return
    }
    set({ isLoading: true, error: null })
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
      const { data, error } = await (supabase as any).from('products').select('*').order('created_at', { ascending: false })
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Supabase row shape not typed
      const products: Product[] = (data ?? []).map((r: any) => ({
        id: r.id, name: r.name, description: r.description, sku: r.sku,
        price: r.price, currency: r.currency, category: r.category,
        isActive: r.is_active, createdAt: r.created_at, updatedAt: r.updated_at,
      }))
      set({ products, isLoading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  addProduct: (data) => {
    const now = new Date().toISOString()
    const product: Product = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
    set((s) => ({ products: [...s.products, product] }))
    if (isSupabaseConfigured && supabase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
      ;(supabase as any).from('products').insert({
        id: product.id, name: product.name, description: product.description,
        sku: product.sku, price: product.price, currency: product.currency,
        category: product.category, is_active: product.isActive,
        organization_id: getOrgId(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase .then response shape
      }).then(({ error }: any) => { if (error) devConsole.error('[productsStore] insert error', error) })
    }
  },

  updateProduct: (id, updates) => {
    set((s) => ({
      products: s.products.map((p) => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p),
    }))
    if (isSupabaseConfigured && supabase) {
      const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (updates.name !== undefined) row.name = updates.name
      if (updates.description !== undefined) row.description = updates.description
      if (updates.sku !== undefined) row.sku = updates.sku
      if (updates.price !== undefined) row.price = updates.price
      if (updates.currency !== undefined) row.currency = updates.currency
      if (updates.category !== undefined) row.category = updates.category
      if (updates.isActive !== undefined) row.is_active = updates.isActive
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
      ;(supabase as any).from('products').update(row).eq('id', id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase .then response shape
        .then(({ error }: any) => { if (error) devConsole.error('[productsStore] update error', error) })
    }
  },

  deleteProduct: (id) => {
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
    if (isSupabaseConfigured && supabase) {
      sbDelete('products', id).catch((e) => devConsole.error('[productsStore] delete error', e))
    }
  },

  getActive: () => get().products.filter((p) => p.isActive),
}))
