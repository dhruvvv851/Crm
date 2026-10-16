import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import SoftLayout from './components/SoftLayout'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import AddCustomer from './pages/AddCustomer'
import CustomerView from './pages/CustomerView'
import Technicians from './pages/Technicians'
import Models from './pages/Models'
import MasterPage from './pages/MasterPage'
import AccountList from './pages/AccountList'
import AccountForm from './pages/AccountForm'
import CommissionList from './pages/CommissionList'
import CommissionForm from './pages/CommissionForm'
import SoftHome from './pages/SoftHome'
import ComingSoon from './pages/ComingSoon'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/add" element={<AddCustomer />} />
        <Route path="/customers/:id" element={<CustomerView />} />
        <Route path="/technicians" element={<Technicians />} />
        <Route path="/models" element={<Models />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>

      <Route element={<SoftLayout />}>
        <Route path="/software" element={<SoftHome />} />
        <Route path="/software/accounts" element={<AccountList />} />
        <Route path="/software/accounts/add" element={<AccountForm />} />
        <Route path="/software/accounts/:id/edit" element={<AccountForm />} />
        <Route path="/software/commission" element={<CommissionList />} />
        <Route path="/software/commission/add" element={<CommissionForm />} />
        <Route path="/software/commission/:id/edit" element={<CommissionForm />} />
        <Route path="/software/cities" element={<MasterPage key="city" kind="city" />} />
        <Route path="/software/areas" element={<MasterPage key="area" kind="area" />} />
        <Route path="/software/segments" element={<MasterPage key="segment" kind="segment" />} />
        <Route path="/software/equipment-types" element={<MasterPage key="equipment" kind="equipment" />} />
        <Route path="/software/technicians" element={<Technicians />} />
        <Route path="/software/models" element={<Models />} />
        <Route path="/software/*" element={<ComingSoon />} />
      </Route>
    </Routes>
  )
}