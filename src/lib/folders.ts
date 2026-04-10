import { db, type Folder } from "./db"

// parentId = null means top-level, otherwise it nests inside that folder
export async function createFolder(
  title: string,
  parentId: number | null = null
): Promise<Folder> {
  const now = new Date()
  const id = await db.folders.add({
    title,
    parentFolder: parentId,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  })
  return (await db.folders.get(id)) as Folder
}

// All active folders, A-Z
export async function getAllFolders(): Promise<Folder[]> {
  const folders = await db.folders
    .filter((folder) => folder.deletedAt === null)
    .toArray()

  return folders.sort((a, b) => a.title.localeCompare(b.title))
}

// Rename a folder
export async function renameFolder(id: number, title: string): Promise<void> {
  await db.folders.update(id, { title, updatedAt: new Date() })
}

// all deleted folders for the trash view
export async function getDeletedFolders(): Promise<Folder[]> {
  const folders = await db.folders
    .filter((folder) => folder.deletedAt !== null)
    .toArray()

  return folders.sort((a, b) => b.deletedAt!.getTime() - a.deletedAt!.getTime())
}

// restore a folder and cascade-restore its children and notes.
// if the parent folder is still deleted, move this folder to top level.
export async function restoreFolder(id: number): Promise<void> {
  await db.transaction("rw", db.folders, db.notes, async () => {
    const folder = await db.folders.get(id)
    if (!folder) return

    // if parent is deleted, make this a top-level folder
    const parentUpdates: Partial<Folder> = { deletedAt: null }
    if (folder.parentFolder !== null) {
      const parent = await db.folders.get(folder.parentFolder)
      if (!parent || parent.deletedAt !== null) {
        parentUpdates.parentFolder = null
      }
    }
    await db.folders.update(id, parentUpdates)

    // BFS to restore all child folders and their notes
    const folderIds: number[] = [id]
    let index = 0

    while (index < folderIds.length) {
      const currentId = folderIds[index]

      // restore notes in this folder
      const notesInFolder = await db.notes
        .filter((n) => n.folderId === currentId && n.deletedAt !== null)
        .toArray()
      for (const note of notesInFolder) {
        await db.notes.update(note.id, { deletedAt: null })
      }

      // queue child folders and restore them
      const children = await db.folders
        .filter((f) => f.parentFolder === currentId && f.deletedAt !== null)
        .toArray()
      for (const child of children) {
        await db.folders.update(child.id, { deletedAt: null })
        folderIds.push(child.id)
      }

      index++
    }
  })
}

// permanently delete a folder and everything inside it
export async function hardDeleteFolder(id: number): Promise<void> {
  await db.transaction("rw", db.folders, db.notes, async () => {
    const folderIds: number[] = [id]
    let index = 0

    while (index < folderIds.length) {
      const currentId = folderIds[index]

      // delete notes in this folder
      const notesInFolder = await db.notes
        .filter((n) => n.folderId === currentId)
        .toArray()
      for (const note of notesInFolder) {
        await db.notes.delete(note.id)
      }

      // queue child folders
      const children = await db.folders
        .filter((f) => f.parentFolder === currentId)
        .toArray()
      for (const child of children) {
        folderIds.push(child.id)
      }

      index++
    }

    // delete all the folders
    for (const folderId of folderIds) {
      await db.folders.delete(folderId)
    }
  })
}

// Soft-delete a folder and everything inside it (notes + sub-folders).
// Uses a transaction so if anything fails, nothing gets deleted.
export async function softDeleteFolder(id: number): Promise<void> {
  const now = new Date()

  await db.transaction("rw", db.folders, db.notes, async () => {
    // BFS through the folder tree to collect everything that needs trashing
    const folderIds: number[] = [id]
    let index = 0

    while (index < folderIds.length) {
      const currentId = folderIds[index]

      // trash notes in this folder
      const notesInFolder = await db.notes
        .filter((n) => n.folderId === currentId && n.deletedAt === null)
        .toArray()
      for (const note of notesInFolder) {
        await db.notes.update(note.id, { deletedAt: now })
      }

      // queue up any child folders
      const children = await db.folders
        .filter((f) => f.parentFolder === currentId && f.deletedAt === null)
        .toArray()
      for (const child of children) {
        folderIds.push(child.id)
      }

      index++
    }

    // finally, trash the folders themselves
    for (const folderId of folderIds) {
      await db.folders.update(folderId, { deletedAt: now })
    }
  })
}
