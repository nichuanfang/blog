'use client'

import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import directive from 'remark-directive'
import gfm from 'remark-gfm'

import CodeBlock from '@/components/markdown/CodeBlock'
import InlineCode from '@/components/markdown/InlineCode'
import Link from '@/components/markdown/Link'

import Image from './Image'
import TitleAnchor from './TitleAnchor'
import remarkCallout from './remarkPlugins/callout'
import remarkToc from './remarkPlugins/toc'

const Markdown = ({ markdownText }: { markdownText: string }) => {
  let lastVisibleHeading = ''
  let isScrollingByClick = false
  let scrollTimeout: NodeJS.Timeout | null = null

  useEffect(() => {
    // 点击事件处理
    // @ts-expect-error 类型来自 remark
    const handleTocClick = (event) => {
      const targetToc = event.target
      const tocs = document.querySelectorAll('.toc-item')

      tocs.forEach((toc) => {
        if (toc.id === targetToc.id) {
          toc.classList.add('active-toc-item')
        } else {
          toc.classList.remove('active-toc-item')
        }
      })

      // 滚动到对应的标题位置
      const targetHeading = document.querySelector(`.items-center #${targetToc.id}`)
      if (targetHeading) {
        isScrollingByClick = true

        // 清除之前的定时器
        if (scrollTimeout) {
          clearTimeout(scrollTimeout)
        }

        targetHeading.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })

        // 设置一个合理的延时来恢复滚动事件监听
        // 这个延时应该足够长，以确保平滑滚动完成
        scrollTimeout = setTimeout(() => {
          isScrollingByClick = false
        }, 1000) // 1秒的延时，可以根据需要调整
      }
    }

    // 滚动事件处理
    const handleScroll = () => {
      if (isScrollingByClick) return

      const headings = document.querySelectorAll('h2, h3')
      const tocs = document.querySelectorAll('.toc-item')
      let currentVisibleHeading = ''

      // 使用 some 来替代 forEach
      Array.prototype.some.call(headings, (heading) => {
        const rect = heading.getBoundingClientRect()
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= 0) {
          currentVisibleHeading = heading.id
          if (currentVisibleHeading !== lastVisibleHeading) {
            lastVisibleHeading = currentVisibleHeading

            tocs.forEach((toc) => {
              // @ts-expect-error 类型来自 remark
              if (toc.text === currentVisibleHeading) {
                toc.classList.add('active-toc-item')
              } else {
                toc.classList.remove('active-toc-item')
              }
            })
          }
          return true // 返回 true 来停止 some 的迭代
        }
        return false // 返回 false 继续迭代
      })
    }

    // 给 TOC 添加点击事件
    const tocs = document.querySelectorAll('.toc-item')
    tocs.forEach((toc) => {
      toc.addEventListener('click', handleTocClick)
    })

    // 滚动事件监听
    window.addEventListener('scroll', handleScroll)

    // 清理事件监听
    return () => {
      tocs.forEach((toc) => {
        toc.removeEventListener('click', handleTocClick)
      })
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [])

  return (
    <div className="relative">
      <ReactMarkdown
        className="mt-10"
        rehypePlugins={[rehypeRaw]}
        remarkPlugins={[gfm, directive, remarkCallout, remarkToc]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)(\{(.*)\})?/.exec(className || '')
            const language = match ? match[1] : 'txt'
            const highlightLines = match ? match[3] : ''
            const highlightLinesArr = highlightLines
              ? highlightLines
                  .split(',')
                  .map((line) => {
                    if (line.includes('-')) {
                      const [start, end] = line.split('-')
                      return Array.from({ length: Number(end) - Number(start) + 1 }, (_, i) => Number(start) + i)
                    }
                    return Number(line.trim())
                  })
                  .flat()
              : []
            return match ? (
              <CodeBlock language={language} highlightLines={highlightLinesArr} text={children as string} {...props} />
            ) : (
              <InlineCode text={children as string} {...props} />
            )
          },
          a({ node, className, children, href, ...props }) {
            return <Link text={String(children)} href={href} className={className} {...props} />
          },
          img({ node, src, alt, ...props }) {
            return <Image src={src} alt={alt} {...props} />
          },
          h2({ node, children, ...props }) {
            return <TitleAnchor title={children} level={2} {...props} />
          },
          h3({ node, children, ...props }) {
            return <TitleAnchor title={children} level={3} {...props} />
          },
        }}
      >
        {markdownText}
      </ReactMarkdown>
    </div>
  )
}

export default Markdown
