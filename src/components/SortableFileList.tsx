import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

export interface ListItem {
  id: string
  name: string
  detail?: string
  previewUrl?: string
}

interface SortableFileListProps<T extends ListItem> {
  items: T[]
  onChange: (items: T[]) => void
  icon?: ReactNode
}

export function SortableFileList<T extends ListItem>({ items, onChange, icon }: SortableFileListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    onChange(arrayMove(items, from, to))
  }

  function move(index: number, delta: number) {
    const to = index + delta
    if (to < 0 || to >= items.length) return
    onChange(arrayMove(items, index, to))
  }

  if (items.length === 0) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Files, in output order">
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
              total={items.length}
              icon={icon}
              onMove={(delta) => move(index, delta)}
              onRemove={() => onChange(items.filter((i) => i.id !== item.id))}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

interface SortableItemProps {
  item: ListItem
  index: number
  total: number
  icon?: ReactNode
  onMove: (delta: number) => void
  onRemove: () => void
}

function SortableItem({ item, index, total, icon, onMove, onRemove }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${
        isDragging ? 'z-10 opacity-80 shadow-lg' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`${item.name}, position ${index + 1} of ${total}. Drag to reorder.`}
        className="relative flex aspect-[4/3] cursor-grab touch-none items-center justify-center bg-slate-100 active:cursor-grabbing dark:bg-slate-800"
      >
        {item.previewUrl ? (
          <img src={item.previewUrl} alt="" className="absolute inset-0 h-full w-full object-contain p-1" draggable={false} />
        ) : (
          icon
        )}
        <span className="absolute top-2 left-2 rounded bg-slate-900/70 px-1.5 text-xs font-semibold text-white">
          {index + 1}
        </span>
      </div>
      <div className="flex items-center gap-1 p-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={item.name}>
            {item.name}
          </p>
          {item.detail && <p className="text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>}
        </div>
        <IconButton label={`Move ${item.name} earlier`} disabled={index === 0} onClick={() => onMove(-1)}>
          <path d="m15 18-6-6 6-6" />
        </IconButton>
        <IconButton label={`Move ${item.name} later`} disabled={index === total - 1} onClick={() => onMove(1)}>
          <path d="m9 18 6-6-6-6" />
        </IconButton>
        <IconButton label={`Remove ${item.name}`} onClick={onRemove}>
          <path d="M18 6 6 18M6 6l12 12" />
        </IconButton>
      </div>
    </li>
  )
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-slate-800 dark:hover:text-white"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  )
}
