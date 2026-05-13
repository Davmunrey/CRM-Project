import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResetPassword } from '../../src/pages/ResetPassword'
import { TestRouter } from '../utils/TestRouter'

const { mockApiPost, mockNavigate } = vi.hoisted(() => ({
  mockApiPost: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('../../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/api')>()
  return { ...actual, api: { ...actual.api, post: mockApiPost } }
})

vi.mock('../../src/lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: true,
  isBootstrapFatalError: false,
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate, useSearchParams: () => [new URLSearchParams('token=test-token'), vi.fn()] }
})

function renderResetPassword() {
  return render(<TestRouter><ResetPassword /></TestRouter>)
}

describe('ResetPassword', () => {
  beforeEach(() => {
    mockApiPost.mockReset()
    mockNavigate.mockReset()
  })

  it('AUTH-03: calls /auth/reset-password with token and password on submit', async () => {
    mockApiPost.mockResolvedValue({})
    renderResetPassword()
    fireEvent.change(screen.getByPlaceholderText(/^password$|^contraseña$|^senha$/i), { target: { value: 'Aa1!abcdefgh' } })
    fireEvent.change(screen.getByPlaceholderText(/confirm( new)? password|confirmar contraseña|confirmar senha/i), { target: { value: 'Aa1!abcdefgh' } })
    fireEvent.click(screen.getByRole('button', { name: /save password|guardar contraseña/i }))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/auth/reset-password', { token: 'test-token', password: 'Aa1!abcdefgh' })
    })
  })

  it('AUTH-03: shows error when passwords do not match', async () => {
    renderResetPassword()
    fireEvent.change(screen.getByPlaceholderText(/^password$|^contraseña$|^senha$/i), { target: { value: 'Aa1!abcdefgh' } })
    fireEvent.change(screen.getByPlaceholderText(/confirm( new)? password|confirmar contraseña|confirmar senha/i), { target: { value: 'Aa1!abcdefgx' } })
    fireEvent.click(screen.getByRole('button', { name: /save password|guardar contraseña/i }))
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match|contraseñas no coinciden/i)).toBeInTheDocument()
    })
    expect(mockApiPost).not.toHaveBeenCalled()
  })
})
