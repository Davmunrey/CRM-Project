import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ForgotPassword } from '../../src/pages/ForgotPassword'
import { TestRouter } from '../utils/TestRouter'

const { mockApiPost } = vi.hoisted(() => ({
  mockApiPost: vi.fn(),
}))

vi.mock('../../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/api')>()
  return { ...actual, api: { ...actual.api, post: mockApiPost } }
})


function renderForgotPassword() {
  return render(<TestRouter><ForgotPassword /></TestRouter>)
}

describe('ForgotPassword', () => {
  beforeEach(() => {
    mockApiPost.mockReset()
  })

  it('AUTH-03: calls /auth/forgot-password with email on submit', async () => {
    mockApiPost.mockResolvedValue({})
    renderForgotPassword()
    fireEvent.change(screen.getByPlaceholderText(/you@company\.com|tu@empresa\.com/i), {
      target: { value: 'user@test.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send link|enviar enlace/i }))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/auth/forgot-password', { email: 'user@test.com' })
    })
  })

  it('AUTH-03: shows confirmation message after successful submission', async () => {
    mockApiPost.mockResolvedValue({})
    renderForgotPassword()
    fireEvent.change(screen.getByPlaceholderText(/you@company\.com|tu@empresa\.com/i), {
      target: { value: 'user@test.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send link|enviar enlace/i }))
    await waitFor(() => {
      expect(screen.getByText(/check your email|revisa tu correo/i)).toBeInTheDocument()
    })
  })
})
