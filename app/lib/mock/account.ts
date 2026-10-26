// ponytail: 收件資訊還沒接後端，先用假資料；之後換成 addresses 表（規格 8）。

export type MockAddress = {
  id: string
  type: '宅配地址' | '超商取貨'
  title: string
}

export const MOCK_ADDRESSES: MockAddress[] = [
  { id: 'cvs-family', type: '超商取貨', title: '全家 民生店' },
  { id: 'cvs-711', type: '超商取貨', title: '7-ELEVEN 民生門市' },
  {
    id: 'home',
    type: '宅配地址',
    title: '台北市松山區民生東路三段 51 號 3 樓',
  },
]
