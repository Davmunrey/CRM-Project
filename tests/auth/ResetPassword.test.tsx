import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResetPassword } from '../../src/pages/ResetPassword'
import { TestRouter } from '../utils/TestRouter'

const { mockUpdateUser, mockNavigate } = vi.hoisted(() => ({
  mockUpdateUser: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('../../src/lib/supabase', () => ({
  supabase: { auth: { updateUser: mockUpdateUser } },
  isSupabaseConfigured: true,
  isBootstrapFatalError: false,
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderResetPassword() {
  return render(<TestRouter><ResetPassword /></TestRouter>)
}

describe('ResetPassword', () => {
  beforeEach(() => {
    mockUpdateUser.mockReset()
    mockNavigate.mockReset()
  })

  it('AUTH-03: calls updateUser with new password on submit', async () => {
    mockUpdateUser.mockResolvedValue({ error: null })
    renderResetPassword()
    fireEvent.change(screen.getByPlaceholderText(/^password$|^contraseña$|^senha$/i), { target: { value: 'Aa1!abcdefgh' } })
    fireEvent.change(screen.getByPlaceholderText(/confirm( new)? password|confirmar contraseña|confirmar senha/i), { target: { value: 'Aa1!abcdefgh' } })
    fireEvent.click(screen.getByRole('button', { name: /save password|guardar contraseña/i }))
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'Aa1!abcdefgh' })
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
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })
})
