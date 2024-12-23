'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false)
  const { resolvedTheme } = useTheme()

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }

  const scrollToTop = () => {
    // 只进行平滑滚动，不修改 URL
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility)
    return () => {
      window.removeEventListener('scroll', toggleVisibility)
    }
  }, [])

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className={`fixed bottom-8 right-8 z-50 rounded-full p-3 shadow-lg transition-all duration-300 ${
            resolvedTheme === 'dark'
              ? 'bg-zinc-700/80 text-zinc-200 hover:bg-zinc-600'
              : 'bg-zinc-200/80 text-zinc-800 hover:bg-zinc-300'
          }`}
          aria-label="返回顶部"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </>
  )
}

export default ScrollToTop
