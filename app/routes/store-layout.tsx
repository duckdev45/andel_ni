import { Outlet } from 'react-router'

import { SiteFooter } from '~/components/store/site-footer'
import { SiteHeader, TopBar } from '~/components/store/site-header'

export default function StoreLayout() {
  return (
    <>
      <TopBar />
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </>
  )
}
