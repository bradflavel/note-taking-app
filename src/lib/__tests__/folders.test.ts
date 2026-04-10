import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db";
import {
  createFolder,
  getAllFolders,
  renameFolder,
  softDeleteFolder,
} from "../folders";
import { createDefaultNote } from "../notes";

beforeEach(async () => {
  await db.notes.clear();
  await db.folders.clear();
});

describe("createFolder", () => {
  it("creates a top-level folder with correct defaults", async () => {
    const folder = await createFolder("Notes");

    expect(folder.id).toBeDefined();
    expect(folder.title).toBe("Notes");
    expect(folder.parentFolder).toBeNull();
    expect(folder.deletedAt).toBeNull();
    expect(folder.createdAt).toBeInstanceOf(Date);
    expect(folder.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a nested folder with parentId", async () => {
    const parent = await createFolder("Parent");
    const child = await createFolder("Child", parent.id);

    expect(child.parentFolder).toBe(parent.id);
  });
});

describe("getAllFolders", () => {
  it("returns only non-deleted folders sorted alphabetically", async () => {
    await createFolder("Zebra");
    await createFolder("Alpha");
    await createFolder("Middle");

    const deleted = await createFolder("Gone");
    await softDeleteFolder(deleted.id);

    const all = await getAllFolders();

    expect(all).toHaveLength(3);
    expect(all[0].title).toBe("Alpha");
    expect(all[1].title).toBe("Middle");
    expect(all[2].title).toBe("Zebra");
  });
});

describe("renameFolder", () => {
  it("updates title and bumps updatedAt", async () => {
    const folder = await createFolder("Old Name");
    const originalUpdatedAt = folder.updatedAt;

    await renameFolder(folder.id, "New Name");
    const updated = await db.folders.get(folder.id);

    expect(updated!.title).toBe("New Name");
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
  });
});

describe("softDeleteFolder", () => {
  it("cascade-deletes the entire subtree", async () => {
    // build a tree: parent → child, with notes in both
    const parent = await createFolder("Parent");
    const child = await createFolder("Child", parent.id);

    const noteInParent = await createDefaultNote(parent.id);
    const noteInChild = await createDefaultNote(child.id);

    // also create a root-level note that should NOT be affected
    const rootNote = await createDefaultNote();

    await softDeleteFolder(parent.id);

    // both folders should be soft-deleted
    const parentAfter = await db.folders.get(parent.id);
    const childAfter = await db.folders.get(child.id);
    expect(parentAfter!.deletedAt).toBeInstanceOf(Date);
    expect(childAfter!.deletedAt).toBeInstanceOf(Date);

    // notes inside the tree should be soft-deleted
    const noteInParentAfter = await db.notes.get(noteInParent.id);
    const noteInChildAfter = await db.notes.get(noteInChild.id);
    expect(noteInParentAfter!.deletedAt).toBeInstanceOf(Date);
    expect(noteInChildAfter!.deletedAt).toBeInstanceOf(Date);

    // root-level note should be untouched
    const rootNoteAfter = await db.notes.get(rootNote.id);
    expect(rootNoteAfter!.deletedAt).toBeNull();

    // getAllFolders should return nothing
    const allFolders = await getAllFolders();
    expect(allFolders).toHaveLength(0);
  });
});
