import { Outlet } from 'react-router'

import { SiteFooter } from '~/components/store/site-footer'
import { SiteHeader } from '~/components/store/site-header'

export default function PlainLayout() {
  return (
    <div className='flex min-h-svh flex-col'>
      <SiteHeader variant='minimal' />
      <div className='flex-1'>
        <Outlet />
      </div>
      <SiteFooter variant='minimal' />
    </div>
  )
}
