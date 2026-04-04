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
