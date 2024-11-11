// 获取中国上海的当前时间
function getShanghaiTime() {
  // 创建一个新的 Date 对象
  const now = new Date()

  // 获取 UTC 时间
  const utcTime = now.getTime() + now.getTimezoneOffset() * 6000

  // 计算上海时间（UTC+8）
  const shanghaiTime = new Date(utcTime + 8 * 60 * 60 * 1000)

  return shanghaiTime
}

// 根据上海时间设置主题
function autoSwitchTheme() {
  const shanghaiTime = getShanghaiTime()
  const currentHour = shanghaiTime.getHours()
  let themeStatus

  // 根据时间段设置主题（晚上 6 点到早上 6 点为深色主题）
  if (currentHour >= 18 || currentHour < 6) {
    themeStatus = 'dark'
  } else {
    themeStatus = 'light'
  }

  // 将主题状态存储在 localStorage 中
  localStorage.setItem(
    'REDEFINE-THEME-STATUS',
    JSON.stringify({ isDark: themeStatus === 'dark' })
  )
}

autoSwitchTheme()
