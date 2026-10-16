import { Outlet } from 'react-router-dom'
import Header from './Header'
import SoftBar from './SoftBar'

export default function SoftLayout() {
  return (
    <>
      <Header />
      <SoftBar />
      <Outlet />
    </>
  )
}