/**
 * Iconify 图标注册表
 * 禁止使用 emoji，所有图标在此注册后引用
 * 浏览图标: https://icon-sets.iconify.design/mdi/
 */

import {
  mdiWeatherSunny,
  mdiWeatherNight,
  mdiCog,
  mdiCheck,
  mdiClose,
  mdiContentCopy,
  mdiCheckBold,
  mdiLoading,
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
  mdiPencilOutline,
  mdiContentSaveOutline,
  mdiEarth,
  mdiCloseCircle,
  mdiVariable,
  mdiFunctionVariant,
  mdiFormatText,
  mdiCubeOutline,
  mdiSwapHorizontal,
} from '@mdi/js';

/** 将 SVG path d 属性转为 Iconify icon data */
const icon = (d: string) => ({ body: `<path d="${d}"/>`, width: 24, height: 24 });

/** 跨 Feature 通用图标 */
export const COMMON_ICONS = {
  sun: icon(mdiWeatherSunny),
  moon: icon(mdiWeatherNight),
  cog: icon(mdiCog),
  check: icon(mdiCheck),
  close: icon(mdiClose),
  copy: icon(mdiContentCopy),
  copied: icon(mdiCheckBold),
  swap: icon(mdiSwapHorizontal),
} as const;

/** 各 Feature 专属图标 */
export const FEATURE_ICONS = {
  translator: {
    loading: icon(mdiLoading),
    warning: icon(mdiAlertCircleOutline),
    ready: icon(mdiCheckCircleOutline),
    edit: icon(mdiPencilOutline),
    cache: icon(mdiContentSaveOutline),
    api: icon(mdiEarth),
    error: icon(mdiCloseCircle),
    // 命名类型
    variable: icon(mdiVariable),
    method: icon(mdiFunctionVariant),
    constant: icon(mdiFormatText),
    class: icon(mdiCubeOutline),
  },
} as const;
