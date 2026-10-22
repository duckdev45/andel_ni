import { X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { LoginForm } from '~/components/account/login-form'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '~/components/ui/dialog'
import { useUser } from '~/lib/auth'

const REGISTER_URL = '/register?redirect=/checkout'
const VERIFY_URL = '/register?step=verify'

/** 註冊導引：規格 D8 不提供訪客結帳 */
export function RegisterHint() {
  return (
    <p className='m-0 border-t border-border pt-4 text-sm'>
      還沒有帳號？
      <Link className='ml-1 border-b border-line font-medium' to={REGISTER_URL}>
        註冊
      </Link>
      <span className='text-muted-foreground'>，完成後會回到結帳。</span>
    </p>
  )
}

/** 規格 3.2：未驗證 Email 不能結帳 */
export function VerifyNotice() {
  return (
    <div className='flex flex-col items-start gap-4'>
      <p className='m-0 text-[15px] leading-[1.8]'>
        你的 Email 尚未驗證。為了寄送訂單與付款通知，請先完成 Email 驗證再結帳。
      </p>
      <Button className='justify-between gap-6' asChild size='lg'>
        <Link to={VERIFY_URL}>
          前往驗證 Email <span aria-hidden='true'>→</span>
        </Link>
      </Button>
    </div>
  )
}

/**
 * 「前往結帳」按鈕：未登入 → 登入視窗；未驗證 → 驗證提示；否則前往 /checkout。
 * 取代設計稿的「會員登入」步驟（LINE / Google / 免密碼不做，規格 D7）。
 */
export function CheckoutButton() {
  const user = useUser()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type='button'
        className='min-h-14 justify-between px-5 text-base'
        size='lg'
        onClick={() =>
          user?.emailVerified ? navigate('/checkout') : setOpen(true)
        }
      >
        前往結帳 <span aria-hidden='true'>→</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className='gap-5 border-line p-6 sm:max-w-md sm:p-8'
          showCloseButton={false}
        >
          <div className='flex items-start justify-between gap-4 border-b border-line pb-4'>
            <div className='flex flex-col gap-2'>
              <span className='font-mono text-xs text-brand'>STEP 02</span>
              <DialogTitle className='text-xl font-black'>
                {user ? '請先驗證 Email' : '登入後結帳'}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <Button
                type='button'
                variant='ghost'
                className='-mt-2 -mr-3'
                aria-label='關閉'
                size='icon'
              >
                <X aria-hidden strokeWidth={1.6} />
              </Button>
            </DialogClose>
          </div>
          {user ? (
            <>
              <DialogDescription className='sr-only'>
                未驗證 Email 的會員不能結帳
              </DialogDescription>
              <VerifyNotice />
            </>
          ) : (
            <>
              <DialogDescription className='m-0 text-sm leading-[1.7]'>
                本店不提供訪客結帳。登入後會回到結帳頁，並帶入你的收件資料。
              </DialogDescription>
              <LoginForm onSuccess={() => navigate('/checkout')} />
              <RegisterHint />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
