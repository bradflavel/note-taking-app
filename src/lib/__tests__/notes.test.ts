import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db";
import {
  createDefaultNote,
  getNoteById,
  saveNote,
  updateNoteTitle,
  getAllNotes,
  softDeleteNote,
  searchNotes,
  moveNoteToFolder,
  updateNoteTags,
} from "../notes";
import { createFolder } from "../folders";

beforeEach(async () => {
  await db.notes.clear();
  await db.folders.clear();
});

describe("createDefaultNote", () => {
  it("creates a note with correct defaults", async () => {
    const note = await createDefaultNote();

    expect(note.id).toBeDefined();
    expect(note.title).toBe("Untitled");
    expect(note.body).toBe("");
    expect(note.tags).toEqual([]);
    expect(note.folderId).toBeNull();
    expect(note.deletedAt).toBeNull();
    expect(note.createdAt).toBeInstanceOf(Date);
    expect(note.updatedAt).toBeInstanceOf(Date);
  });

  it("assigns folderId when provided", async () => {
    const folder = await createFolder("Test Folder");
    const note = await createDefaultNote(folder.id);

    expect(note.folderId).toBe(folder.id);
  });
});

describe("getNoteById", () => {
  it("returns the note that was created", async () => {
    const created = await createDefaultNote();
    const fetched = await getNoteById(created.id);

    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.title).toBe("Untitled");
  });
});

describe("saveNote", () => {
  it("updates body and bumps updatedAt", async () => {
    const note = await createDefaultNote();
    const originalUpdatedAt = note.updatedAt;

    await saveNote(note.id, "# Hello World");
    const updated = await getNoteById(note.id);

    expect(updated!.body).toBe("# Hello World");
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
  });
});

describe("updateNoteTitle", () => {
  it("updates the title", async () => {
    const note = await createDefaultNote();

    await updateNoteTitle(note.id, "My Note");
    const updated = await getNoteById(note.id);

    expect(updated!.title).toBe("My Note");
  });
});

describe("getAllNotes", () => {
  it("returns only non-deleted notes sorted most-recent-first", async () => {
    const older = await createDefaultNote();
    await saveNote(older.id, "older note");

    const newer = await createDefaultNote();
    await saveNote(newer.id, "newer note");

    // soft-delete a third note — it shouldn't appear
    const deleted = await createDefaultNote();
    await softDeleteNote(deleted.id);

    const all = await getAllNotes();

    expect(all).toHaveLength(2);
    // most recent first
    expect(all[0].id).toBe(newer.id);
    expect(all[1].id).toBe(older.id);
    // only sidebar fields, no body
    expect(all[0]).toHaveProperty("id");
    expect(all[0]).toHaveProperty("title");
    expect(all[0]).toHaveProperty("updatedAt");
    expect(all[0]).toHaveProperty("folderId");
    expect(all[0]).not.toHaveProperty("body");
  });
});

describe("softDeleteNote", () => {
  it("sets deletedAt and hides from getAllNotes", async () => {
    const note = await createDefaultNote();

    await softDeleteNote(note.id);

    const raw = await getNoteById(note.id);
    expect(raw!.deletedAt).toBeInstanceOf(Date);

    const all = await getAllNotes();
    expect(all).toHaveLength(0);
  });
});

describe("searchNotes", () => {
  it("matches on title, body, and tags", async () => {
    const note1 = await createDefaultNote();
    await updateNoteTitle(note1.id, "JavaScript Guide");

    const note2 = await createDefaultNote();
    await saveNote(note2.id, "Learning about TypeScript");

    const note3 = await createDefaultNote();
    await updateNoteTags(note3.id, ["react", "frontend"]);

    // title match
    expect(await searchNotes("javascript")).toHaveLength(1);
    // body match
    expect(await searchNotes("typescript")).toHaveLength(1);
    // tag match
    expect(await searchNotes("react")).toHaveLength(1);
    // no match
    expect(await searchNotes("python")).toHaveLength(0);
  });

  it("excludes deleted notes", async () => {
    const note = await createDefaultNote();
    await updateNoteTitle(note.id, "Searchable Title");

    await softDeleteNote(note.id);

    const results = await searchNotes("Searchable");
    expect(results).toHaveLength(0);
  });
});

describe("moveNoteToFolder", () => {
  it("updates folderId and bumps updatedAt", async () => {
    const note = await createDefaultNote();
    const folder = await createFolder("Destination");
    const originalUpdatedAt = note.updatedAt;

    await moveNoteToFolder(note.id, folder.id);
    const updated = await getNoteById(note.id);

    expect(updated!.folderId).toBe(folder.id);
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
  });

  it("moves back to root with null", async () => {
    const folder = await createFolder("Temp");
    const note = await createDefaultNote(folder.id);

    await moveNoteToFolder(note.id, null);
    const updated = await getNoteById(note.id);

    expect(updated!.folderId).toBeNull();
  });
});

describe("updateNoteTags", () => {
  it("replaces the tags array", async () => {
    const note = await createDefaultNote();

    await updateNoteTags(note.id, ["tag1", "tag2"]);
    let updated = await getNoteById(note.id);
    expect(updated!.tags).toEqual(["tag1", "tag2"]);

    await updateNoteTags(note.id, ["tag3"]);
    updated = await getNoteById(note.id);
    expect(updated!.tags).toEqual(["tag3"]);
  });
});
