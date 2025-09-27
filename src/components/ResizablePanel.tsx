import { useState, useRef, useEffect, ReactNode } from 'react'
import './ResizablePanel.css'

interface ResizablePanelProps {
  children: ReactNode
  direction: 'horizontal' | 'vertical'
  initialSize: number
  minSize: number
  maxSize: number
  className?: string
}

export function ResizablePanel({
  children,
  direction,
  initialSize,
  minSize,
  maxSize,
  className = ''
}: ResizablePanelProps) {
  const [size, setSize] = useState(initialSize)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const startPos = useRef(0)
  const startSize = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY
    startSize.current = size
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY
      const delta = currentPos - startPos.current
      const newSize = Math.min(maxSize, Math.max(minSize, startSize.current + delta))
      
      setSize(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, direction, minSize, maxSize])

  const style = direction === 'horizontal' 
    ? { width: `${size}px` }
    : { height: `${size}px` }

  return (
    <div 
      ref={panelRef}
      className={`resizable-panel ${direction} ${className} ${isResizing ? 'resizing' : ''}`}
      style={style}
    >
      <div className="panel-content">
        {children}
      </div>
      <div 
        className={`resize-handle ${direction}`}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}