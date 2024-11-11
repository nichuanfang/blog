import { main } from '../main.js'

const elementCode = '.mermaid'

const saveOriginalData = function () {
  return new Promise((resolve, reject) => {
    try {
      var els = document.querySelectorAll(elementCode),
        count = els.length
      els.forEach((element) => {
        element.setAttribute('data-original-code', element.innerHTML)
        count--
        if (count == 0) {
          resolve()
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}

const resetProcessed = function () {
  return new Promise((resolve, reject) => {
    try {
      var els = document.querySelectorAll(elementCode),
        count = els.length
      els.forEach((element) => {
        if (element.getAttribute('data-original-code') != null) {
          element.removeAttribute('data-processed')
          element.innerHTML = element.getAttribute('data-original-code')
        }
        count--
        if (count == 0) {
          resolve()
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}
export const ModeToggle = {
  modeToggleButton_dom: null,
  iconDom: null,
  mermaidLightTheme: null,
  mermaidDarkTheme: null,

  async mermaidInit(theme) {
    if (window.mermaid) {
      await resetProcessed()
      mermaid.initialize({ theme })
      mermaid.init({ theme }, document.querySelectorAll(elementCode))
    }
  },

  enableLightMode() {
    document.body.classList.remove('dark-mode')
    document.documentElement.classList.remove('dark')
    document.body.classList.add('light-mode')
    document.documentElement.classList.add('light')
    this.iconDom.className = 'fa-regular fa-moon'
    main.styleStatus.isDark = false
    main.setStyleStatus()
    this.mermaidInit(this.mermaidLightTheme)
    this.setGiscusTheme()
  },

  enableDarkMode() {
    document.body.classList.remove('light-mode')
    document.documentElement.classList.remove('light')
    document.body.classList.add('dark-mode')
    document.documentElement.classList.add('dark')
    this.iconDom.className = 'fa-regular fa-brightness'
    main.styleStatus.isDark = true
    main.setStyleStatus()
    this.mermaidInit(this.mermaidDarkTheme)
    this.setGiscusTheme()
  },
  //自适应模式
  autoMode() {
    const currentHour = new Date().getHours() // 获取当前小时 (0-23)

    // 定义白天和夜间的时间段
    const nightStart = 18 // 晚上 6 点
    const nightEnd = 6 // 早上 6 点

    // 判断当前时间是否在夜间时间段
    if (currentHour >= nightStart || currentHour < nightEnd) {
      // 夜间模式
      document.body.classList.remove('light-mode')
      document.documentElement.classList.remove('light')
      document.body.classList.add('dark-mode')
      document.documentElement.classList.add('dark')
      this.iconDom.className = 'fa-regular fa-brightness'
      main.styleStatus.isDark = true
      this.mermaidInit(this.mermaidDarkTheme)
    } else {
      // 白天模式
      document.body.classList.remove('dark-mode')
      document.documentElement.classList.remove('dark')
      document.body.classList.add('light-mode')
      document.documentElement.classList.add('light')
      this.iconDom.className = 'fa-regular fa-moon'
      main.styleStatus.isDark = false
      this.mermaidInit(this.mermaidLightTheme)
    }

    // 更新样式状态
    main.setStyleStatus()
    this.setGiscusTheme()
  },

  async setGiscusTheme(theme) {
    if (document.querySelector('#giscus-container')) {
      let giscusFrame = document.querySelector('iframe.giscus-frame')
      while (!giscusFrame) {
        await new Promise((r) => setTimeout(r, 1000))
        giscusFrame = document.querySelector('iframe.giscus-frame')
      }
      while (giscusFrame.classList.contains('giscus-frame--loading'))
        await new Promise((r) => setTimeout(r, 1000))
      theme ??= main.styleStatus.isDark ? 'dark' : 'light'
      giscusFrame.contentWindow.postMessage(
        {
          giscus: {
            setConfig: {
              theme: theme,
            },
          },
        },
        'https://giscus.app'
      )
    }
  },

  isDarkPrefersColorScheme() {
    return (
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
    )
  },

  initModeStatus() {
    const styleStatus = main.getStyleStatus()
    const authTheme = main.styleStatus.autoTheme
    //如果打开了自动切换主题 根据系统时间自动切换 优先级最高
    if (authTheme == undefined || authTheme) {
      this.autoMode()
    } else {
      if (styleStatus) {
        // todo 如果是支持自动切换主题(用autoTheme标识) 则根据当前时间来切换
        styleStatus.isDark ? this.enableDarkMode() : this.enableLightMode()
      } else {
        //使用系统的主题模式
        this.isDarkPrefersColorScheme().matches
          ? this.enableDarkMode()
          : this.enableLightMode()
      }
    }
  },

  initModeToggleButton() {
    this.modeToggleButton_dom.addEventListener('click', () => {
      const isDark = document.body.classList.contains('dark-mode')
      //取消主题自动切换
      main.styleStatus.autoTheme = false
      isDark ? this.enableLightMode() : this.enableDarkMode()
    })
  },

  initModeAutoTrigger() {
    const isDarkMode = this.isDarkPrefersColorScheme()
    isDarkMode.addEventListener('change', (e) => {
      e.matches ? this.enableDarkMode() : this.enableLightMode()
    })
  },

  async init() {
    this.modeToggleButton_dom = document.querySelector(
      '.tool-dark-light-toggle'
    )
    this.iconDom = document.querySelector('.tool-dark-light-toggle i')
    this.mermaidLightTheme =
      typeof theme.mermaid !== 'undefined' &&
      typeof theme.mermaid.style !== 'undefined' &&
      typeof theme.mermaid.style.light !== 'undefined'
        ? theme.mermaid.style.light
        : 'default'
    this.mermaidDarkTheme =
      typeof theme.mermaid !== 'undefined' &&
      typeof theme.mermaid.style !== 'undefined' &&
      typeof theme.mermaid.style.dark !== 'undefined'
        ? theme.mermaid.style.dark
        : 'dark'
    this.initModeStatus()
    this.initModeToggleButton()
    this.initModeAutoTrigger()
    try {
      await saveOriginalData().catch(console.error)
    } catch (error) {}
  },
}

// Exported function
export default function initModeToggle() {
  ModeToggle.init()
}
