import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Announcement } from "../announcementTypes";
import {
  isAnnouncementLive,
  sortAnnouncementsForParty,
} from "../logic";

export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const snap = await getDocs(collection(db, "announcements"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));
}

export async function fetchLiveAnnouncements(): Promise<Announcement[]> {
  const rows = await fetchAllAnnouncements();
  const now = new Date();
  const live = rows.filter((a) => isAnnouncementLive(a, now));
  live.sort(sortAnnouncementsForParty);
  return live;
}

export async function createAnnouncement(
  data: Record<string, any>
): Promise<string> {
  const ref = await addDoc(collection(db, "announcements"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAnnouncement(
  id: string,
  data: Record<string, any>
): Promise<void> {
  await updateDoc(doc(db, "announcements", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, "announcements", id));
}


export async function fetchAnnouncementById(id: string): Promise<Announcement | null> {
  const rows = await fetchAllAnnouncements();
  return rows.find((a) => a.id === id) || null;
}
