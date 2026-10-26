// R2 自訂網域（img.andelni.com／img-staging.andelni.com），見 vite.config.ts；本機是空字串
const IMG_ORIGIN = import.meta.env.VITE_IMG_ORIGIN as string

/** 照片網址：開頭為 / 是站內靜態檔（種子資料），其餘是 R2 物件鍵 */
export const imageUrl = (key: null | string) =>
  !key
    ? ''
    : key.startsWith('/')
      ? key
      : IMG_ORIGIN
        ? `${IMG_ORIGIN}/${key}`
        : `/img/${key}`
