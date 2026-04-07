import { db, type Note } from "./db"

export async function getFirstNote(): Promise<Note | undefined> {
  return db.notes.filter((note) => note.deletedAt === null).first()
}

export async function createDefaultNote(): Promise<Note> {
  const now = new Date()
  const id = await db.notes.add({
    title: "Untitled",
    body: "",
    folderId: null,
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

// Look up a single note by its ID
export async function getNoteById(id: number): Promise<Note | undefined> {
  return db.notes.get(id)
}

// Fetch every non-deleted note for the sidebar (just the lightweight fields, not the full body)
export async function getAllNotes(): Promise<Pick<Note, "id" | "title" | "updatedAt">[]> {
  const notes = await db.notes
    .filter((note) => note.deletedAt === null)
    .toArray()

  // Most recently edited notes come first
  return notes
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
}

// Update a note's title in the database (used to keep sidebar titles in sync)
export async function updateNoteTitle(id: number, title: string): Promise<void> {
  await db.notes.update(id, { title })
}

// Move a note to the trash by stamping it with the current date/time.
// The note stays in the database — it just won't show up in the sidebar anymore.
export async function softDeleteNote(id: number): Promise<void> {
  await db.notes.update(id, { deletedAt: new Date() })
}
