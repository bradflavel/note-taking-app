import { Dexie, type EntityTable } from "dexie"

interface Note {
  id: number 
  title: string 
  body: string
  folderId: number | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  tags: string []
}

interface Folder {
  id: number
  title: string 
  parentFolder: number | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const db = new Dexie("noteTakingDatabase") as Dexie & {
  notes: EntityTable<Note, "id">
  folders: EntityTable<Folder, "id">
}

// Schema declaration:
db.version(1).stores({
  notes: "++id, folderId, deletedAt, *tags", 
  folders: "++id, parentFolder, deletedAt", 
})

export type { Note, Folder }
export { db }
