import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../components/common/ProtectedRoute'
import useAuthStore from '../store/useAuthStore'

vi.mock('../store/useAuthStore')
const mockUseAuthStore = vi.mocked(useAuthStore)

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route element={ui}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>/login</div>} />
        <Route path="/" element={<div>/</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('redirects to /login when not authenticated', () => {
    mockUseAuthStore.mockReturnValue({ isAuthenticated: false, user: null, login: vi.fn(), logout: vi.fn(), token: null, setToken: vi.fn(), clearToken: vi.fn() } as any)
    
    renderWithRouter(<ProtectedRoute />)
    
    expect(screen.getByText('/login')).toBeInTheDocument()
  })

  it('renders content when authenticated with no role restriction', () => {
    mockUseAuthStore.mockReturnValue({ isAuthenticated: true, user: { role: 'patient' }, login: vi.fn(), logout: vi.fn(), token: 'token', setToken: vi.fn(), clearToken: vi.fn() } as any)
    
    renderWithRouter(<ProtectedRoute />)
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders content when user has correct role', () => {
    mockUseAuthStore.mockReturnValue({ isAuthenticated: true, user: { role: 'admin' }, login: vi.fn(), logout: vi.fn(), token: 'token', setToken: vi.fn(), clearToken: vi.fn() } as any)
    
    renderWithRouter(<ProtectedRoute allowedRoles={['admin']} />)
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to / when user has wrong role', () => {
    mockUseAuthStore.mockReturnValue({ isAuthenticated: true, user: { role: 'patient' }, login: vi.fn(), logout: vi.fn(), token: 'token', setToken: vi.fn(), clearToken: vi.fn() } as any)
    
    renderWithRouter(<ProtectedRoute allowedRoles={['admin']} />)
    
    expect(screen.getByText('/')).toBeInTheDocument()
  })

  it('redirects to / when userRole is undefined', () => {
    mockUseAuthStore.mockReturnValue({ isAuthenticated: true, user: null, login: vi.fn(), logout: vi.fn(), token: 'token', setToken: vi.fn(), clearToken: vi.fn() } as any)
    
    renderWithRouter(<ProtectedRoute allowedRoles={['admin']} />)
    
    // Note: The assertion expects '/' but ProtectedRoute.tsx currently might allow it because userRole is falsy.
    // However, we follow the test spec provided.
    expect(screen.getByText('/')).toBeInTheDocument()
  })
})
