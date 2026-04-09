import { db, type Note } from "./db"

export async function getFirstNote(): Promise<Note | undefined> {
  return db.notes.filter((note) => note.deletedAt === null).first()
}

export async function createDefaultNote(folderId: number | null = null): Promise<Note> {
  const now = new Date()
  const id = await db.notes.add({
    title: "Untitled",
    body: "",
    folderId,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    tags: [],
  })
  return (await db.notes.get(id)) as Note
}

export async function saveNote(id: number, body: string): Promise<void> {
  await db.notes.update(id, { body, updatedAt: new Date() })
}

// Get a single note by ID
export async function getNoteById(id: number): Promise<Note | undefined> {
  return db.notes.get(id)
}

// All active notes for the sidebar — just id/title/updatedAt, not the full body
export async function getAllNotes(): Promise<Pick<Note, "id" | "title" | "updatedAt" | "folderId">[]> {
  const notes = await db.notes
    .filter((note) => note.deletedAt === null)
    .toArray()

  // most recent first
  return notes
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map(({ id, title, updatedAt, folderId }) => ({ id, title, updatedAt, folderId }))
}

// Update just the title (called when the sidebar needs to reflect new content)
export async function updateNoteTitle(id: number, title: string): Promise<void> {
  await db.notes.update(id, { title })
}

// Soft delete — sets deletedAt so it stops showing up, but stays in the DB
export async function softDeleteNote(id: number): Promise<void> {
  await db.notes.update(id, { deletedAt: new Date() })
}

// Move a note into a folder (or pass null to move it back to top level)
export async function moveNoteToFolder(
  noteId: number,
  folderId: number | null
): Promise<void> {
  await db.notes.update(noteId, { folderId, updatedAt: new Date() })
}
