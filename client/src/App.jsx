import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import SoftLayout from './components/SoftLayout'
import RequireAuth from './components/RequireAuth'
import RequirePerm from './components/RequirePerm'
import Login from './pages/Login'
import FieldHome from './pages/FieldHome'
import Home from './pages/Home'
import AdminPage from './pages/AdminPage'
import AddCall from './pages/AddCall'
import CallHistory from './pages/CallHistory'
import ViewCall from './pages/ViewCall'
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
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth role="engineer" />}>
        <Route path="/field" element={<FieldHome />} />
      </Route>

      <Route element={<RequireAuth role="admin" />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />

          <Route element={<RequirePerm perm="administrator" />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route element={<RequirePerm perm="add_call" />}>
            <Route path="/add-call" element={<AddCall />} />
          </Route>
          <Route element={<RequirePerm perm="call_history" />}>
            <Route path="/calls" element={<CallHistory />} />
          </Route>
          <Route element={<RequirePerm perm="call_view" />}>
            <Route path="/calls/:id" element={<ViewCall />} />
          </Route>
          <Route element={<RequirePerm perm="company_list" />}>
            <Route path="/customers" element={<Customers />} />
          </Route>
          <Route element={<RequirePerm perm="create_uqn" />}>
            <Route path="/customers/add" element={<AddCustomer />} />
          </Route>
          <Route element={<RequirePerm perm={['company_list', 'create_uqn']} />}>
            <Route path="/customers/:id" element={<CustomerView />} />
          </Route>
          <Route element={<RequirePerm perm="technician_list" />}>
            <Route path="/technicians" element={<Technicians />} />
          </Route>
          <Route element={<RequirePerm perm="masters" />}>
            <Route path="/models" element={<Models />} />
          </Route>
          <Route path="*" element={<ComingSoon />} />
        </Route>

        <Route element={<SoftLayout />}>
          <Route element={<RequirePerm perm={['accounts', 'commission', 'masters', 'technician_list']} />}>
            <Route path="/software" element={<SoftHome />} />
          </Route>
          <Route element={<RequirePerm perm="accounts" />}>
            <Route path="/software/accounts" element={<AccountList />} />
            <Route path="/software/accounts/add" element={<AccountForm />} />
            <Route path="/software/accounts/:id/edit" element={<AccountForm />} />
          </Route>
          <Route element={<RequirePerm perm="commission" />}>
            <Route path="/software/commission" element={<CommissionList />} />
            <Route path="/software/commission/add" element={<CommissionForm />} />
            <Route path="/software/commission/:id/edit" element={<CommissionForm />} />
          </Route>
          <Route element={<RequirePerm perm="masters" />}>
            <Route path="/software/cities" element={<MasterPage key="city" kind="city" />} />
            <Route path="/software/areas" element={<MasterPage key="area" kind="area" />} />
            <Route path="/software/segments" element={<MasterPage key="segment" kind="segment" />} />
            <Route path="/software/equipment-types" element={<MasterPage key="equipment" kind="equipment" />} />
            <Route path="/software/models" element={<Models />} />
          </Route>
          <Route element={<RequirePerm perm="technician_list" />}>
            <Route path="/software/technicians" element={<Technicians />} />
          </Route>
          <Route path="/software/*" element={<ComingSoon />} />
        </Route>
      </Route>
    </Routes>
  )
}