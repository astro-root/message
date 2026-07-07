import { openDB, type IDBPDatabase } from "idb";
import type { KeyPair } from "@/features/crypto/domain/keypair";

const DB_NAME = "e2ee-keystore";
const DB_VERSION = 1;
const STORE_NAME = "keypairs";

/**
 * 秘密鍵はこのモジュールの外に出してはならない。
 * サーバーへの送信、ログ出力、他のfeatureへの受け渡しは一切禁止。
 * ここに閉じ込めることで「秘密鍵が漏れうる経路」を1箇所に限定する。
 */

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * 鍵ペアをこの端末のIndexedDBに保存する。
 * userIdをキーにして、複数アカウント切り替えにも耐えられるようにする。
 */
export async function saveKeyPair(
  userId: string,
  keyPair: KeyPair,
): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, keyPair, userId);
}

export async function loadKeyPair(userId: string): Promise<KeyPair | null> {
  const db = await getDb();
  const result = await db.get(STORE_NAME, userId);
  return result ?? null;
}

export async function deleteKeyPair(userId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, userId);
}
