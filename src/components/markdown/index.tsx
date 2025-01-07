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

interface MarkdownProps {
  markdownText: string
}

const Markdown = ({ markdownText }: MarkdownProps) => {
  let lastVisibleHeading = ''
  let isScrollingByClick = false
  let scrollTimeout: number | null = null

  useEffect(() => {
    const clearTocStyles = () => {
      const tocs = document.querySelectorAll('.toc-item')
      tocs.forEach((toc) => {
        toc.classList.remove('active-toc-item')
      })
    }

    const handleTocClick = (event: Event) => {
      const targetToc = event.target as HTMLElement
      const tocs = document.querySelectorAll('.toc-item')

      tocs.forEach((toc) => {
        if (toc.id === targetToc.id) {
          toc.classList.add('active-toc-item')
        } else {
          toc.classList.remove('active-toc-item')
        }
      })

      const targetHeading = document.querySelector(`.items-center #${targetToc.id}`)
      if (targetHeading) {
        isScrollingByClick = true
        if (scrollTimeout !== null) {
          clearTimeout(scrollTimeout)
        }

        targetHeading.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })

        scrollTimeout = window.setTimeout(() => {
          isScrollingByClick = false
        }, 1000)
      }
    }

    const handleScroll = () => {
      if (isScrollingByClick) return

      const headings = document.querySelectorAll('h2, h3')
      const tocs = document.querySelectorAll('.toc-item')
      let currentVisibleHeading = ''

      Array.prototype.some.call(headings, (heading) => {
        const rect = heading.getBoundingClientRect()
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= 0) {
          currentVisibleHeading = heading.id

          if (currentVisibleHeading !== lastVisibleHeading) {
            lastVisibleHeading = currentVisibleHeading
            tocs.forEach((toc) => {
              if ((toc as HTMLElement).textContent === currentVisibleHeading) {
                toc.classList.add('active-toc-item')
              } else {
                toc.classList.remove('active-toc-item')
              }
            })
          }
          return true
        }
        return false
      })
    }

    const tocs = document.querySelectorAll('.toc-item')
    tocs.forEach((toc) => {
      toc.addEventListener('click', handleTocClick)
    })

    window.addEventListener('scroll', handleScroll)

    return () => {
      tocs.forEach((toc) => {
        toc.removeEventListener('click', handleTocClick)
      })
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeout !== null) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [markdownText])

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
