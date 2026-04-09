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
