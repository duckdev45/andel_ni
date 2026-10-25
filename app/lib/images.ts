/** 照片網址：開頭為 / 是站內靜態檔（種子資料），其餘是 R2 物件鍵 */
// ponytail: 先經 Worker 的 /img/ 讀 R2；接網域後改成 R2 自訂網域 img.<網域>（規格 5.2），只改這裡
export const imageUrl = (key: null | string) =>
  !key ? '' : key.startsWith('/') ? key : `/img/${key}`
