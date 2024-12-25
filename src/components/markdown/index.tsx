'use client'

import { useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import directive from 'remark-directive'
import gfm from 'remark-gfm'
// @ts-expect-error type correct
import { throttle } from 'lodash'
import { Component } from 'react'

import CodeBlock from '@/components/markdown/CodeBlock'
import InlineCode from '@/components/markdown/InlineCode'
import Link from '@/components/markdown/Link'
import Image from './Image'
import TitleAnchor from './TitleAnchor'
import remarkCallout from './remarkPlugins/callout'
import remarkToc from './remarkPlugins/toc'

// 类型定义
type MarkdownComponentProps = {
  node?: unknown // 使用 unknown 代替 any
  className?: string
  children?: React.ReactNode
  href?: string
  src?: string
  alt?: string
  [key: string]: any
}

// 错误边界组件
class MarkdownErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <div>Error loading markdown content.</div>
    }
    return this.props.children
  }
}

// 主组件
const Markdown = ({ markdownText }: { markdownText: string }) => {
  const lastVisibleHeadingRef = useRef('')
  const isScrollingByClickRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 滚动到元素的辅助函数
  const scrollToElement = (element: HTMLElement) => {
    if (element.scrollIntoView) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    } else {
      window.scrollTo(0, element.offsetTop)
    }
  }

  const updateHash = useCallback((headingId: string) => {
    if (headingId) {
      history.replaceState(null, '', `#${headingId}`)
    }
  }, [])

  const clearTocStyles = useCallback(() => {
    document.querySelectorAll('.toc-item').forEach((toc) => {
      toc.classList.remove('active-toc-item')
    })
  }, [])

  const handleTocClick = useCallback((event: MouseEvent) => {
    const targetToc = event.target as HTMLElement
    const tocs = document.querySelectorAll('.toc-item')

    tocs.forEach((toc) => {
      toc.classList[toc.id === targetToc.id ? 'add' : 'remove']('active-toc-item')
    })

    const targetHeading = document.querySelector(`.items-center #${targetToc.id}`)
    if (!targetHeading) return

    isScrollingByClickRef.current = true

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    updateHash(targetToc.id)
    scrollToElement(targetHeading as HTMLElement)

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingByClickRef.current = false
    }, 1000)
  }, [updateHash])

  const handleScroll = useCallback(
    throttle(() => {
      if (isScrollingByClickRef.current) return

      const headings = document.querySelectorAll('h2, h3')
      const tocs = document.querySelectorAll('.toc-item')

      for (const heading of Array.from(headings)) {
        const rect = heading.getBoundingClientRect()
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= 0) {
          const currentVisibleHeading = heading.id

          if (currentVisibleHeading !== lastVisibleHeadingRef.current) {
            lastVisibleHeadingRef.current = currentVisibleHeading
            updateHash(currentVisibleHeading)

            tocs.forEach((toc) => {
              toc.classList[
                (toc as HTMLElement).textContent === currentVisibleHeading
                  ? 'add'
                  : 'remove'
              ]('active-toc-item')
            })
          }
          break
        }
      }
    }, 100),
    [updateHash]
  )

  useEffect(() => {
    clearTocStyles()

    const tocElements = document.querySelectorAll('.toc-item')
    const tocArray = Array.from(tocElements)

    tocArray.forEach(toc => {
      toc.setAttribute('role', 'button')
      toc.setAttribute('tabindex', '0')
      toc.setAttribute('aria-label', `Jump to section ${toc.textContent}`)
      toc.addEventListener('click', handleTocClick as EventListener)
    })

    window.addEventListener('load', clearTocStyles)
    window.addEventListener('scroll', handleScroll)

    // 处理初始 hash
    const initialHash = window.location.hash.slice(1)
    if (initialHash) {
      const targetHeading = document.getElementById(initialHash)
      if (targetHeading) {
        scrollToElement(targetHeading)
      }
    }

    return () => {
      window.removeEventListener('load', clearTocStyles)
      window.removeEventListener('scroll', handleScroll)
      tocArray.forEach(toc =>
        toc.removeEventListener('click', handleTocClick as EventListener)
      )

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [clearTocStyles, handleTocClick, handleScroll])

  const components = {
    code: ({ className, children, ...props }: MarkdownComponentProps) => {
      const match = /language-(\w+)(\{(.*)\})?/.exec(className || '')
      const language = match ? match[1] : 'txt'
      const highlightLines = match ? match[3] : ''
      const highlightLinesArr = highlightLines
        ? highlightLines
          .split(',')
          .map((line) => {
            if (line.includes('-')) {
              const [start, end] = line.split('-')
              return Array.from(
                { length: Number(end) - Number(start) + 1 },
                (_, i) => Number(start) + i
              )
            }
            return Number(line.trim())
          })
          .flat()
        : []

      return match ? (
        <CodeBlock
          language={language}
          highlightLines={highlightLinesArr}
          text={children as string}
          {...props}
        />
      ) : (
        <InlineCode text={children as string} {...props} />
      )
    },
    a: ({ className, children, href, ...props }: MarkdownComponentProps) => (
      <Link text={String(children)} href={href} className={className} {...props} />
    ),
    img: ({ src, alt, ...props }: MarkdownComponentProps) => (
      <Image src={src} alt={alt} {...props} />
    ),
    h2: ({ children, ...props }: MarkdownComponentProps) => (
      <TitleAnchor title={children} level={2} {...props} />
    ),
    h3: ({ children, ...props }: MarkdownComponentProps) => (
      <TitleAnchor title={children} level={3} {...props} />
    ),
  }

  return (
    <MarkdownErrorBoundary>
      <div className="relative">
        <ReactMarkdown
          className="mt-10"
          rehypePlugins={[rehypeRaw]}
          remarkPlugins={[gfm, directive, remarkCallout, remarkToc]}
          components={components}
        >
          {markdownText}
        </ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  )
}

export default Markdown