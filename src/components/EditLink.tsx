'use client'

import { IconEditCircle } from '@tabler/icons-react'

const EditLink = ({ filePath }: { filePath: string }) => {
  // /blog/:slug?admin=1
  const isAdmin =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('admin') === '1' : false

  if (!isAdmin) return null

  return (
    <div className="my-4 flex justify-end">
      <a
        href={`https://stackblitz.com/github/haydenull/blog/tree/main?file=${encodeURIComponent(filePath)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-base text-colorful-500 hover:text-colorful-700 dark:text-colorful-600 dark:hover:text-colorful-500"
      >
        <IconEditCircle /> Edit on StackBlitz
      </a>
    </div>
  )
}

export default EditLink
