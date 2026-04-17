import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Vehiculos from './pages/Vehiculos'
import VehiculoDetalle from './pages/VehiculoDetalle'
import Clientes from './pages/Clientes'
import Contratos from './pages/Contratos'
import Recibos from './pages/Recibos'
import Solicitudes from './pages/Solicitudes'
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'
import Publico from './pages/Publico'
import PublicoVehiculo from './pages/PublicoVehiculo'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas (sin auth) */}
          <Route path="/publico" element={<Publico />} />
          <Route path="/publico/vehiculo/:id" element={<PublicoVehiculo />} />

          {/* Login */}
          <Route path="/login" element={<Login />} />

          {/* Onboarding — protegido pero sin Layout */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          {/* Panel admin (protegido) */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="solicitudes" element={<Solicitudes />} />
            <Route path="vehiculos" element={<Vehiculos />} />
            <Route path="vehiculos/:id" element={<VehiculoDetalle />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="contratos" element={<Contratos />} />
            <Route path="recibos" element={<Recibos />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
