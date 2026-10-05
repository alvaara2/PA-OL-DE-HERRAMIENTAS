import { SystemCheckpoint } from '../types/workshop';

const DB_NAME = 'PanolPro_IndexedDB';
const DB_VERSION = 1;
const STORE_NAME = 'checkpoints';

/**
 * Initializes and returns an IndexedDB connection
 */
export function openCheckpointDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Error al abrir la base de datos IndexedDB.'));
    };
  });
}

/**
 * Saves a checkpoint into IndexedDB
 */
export async function saveCheckpointToIndexedDB(checkpoint: SystemCheckpoint): Promise<void> {
  try {
    const db = await openCheckpointDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(checkpoint);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Fallback a localStorage para checkpoint:', err);
    // Graceful fallback to localStorage if IndexedDB is blocked
    try {
      const raw = localStorage.getItem('panolpro_idb_checkpoints_fallback') || '[]';
      const list = JSON.parse(raw);
      const filtered = list.filter((c: SystemCheckpoint) => c.id !== checkpoint.id);
      localStorage.setItem('panolpro_idb_checkpoints_fallback', JSON.stringify([checkpoint, ...filtered].slice(0, 30)));
    } catch (e) {
      console.warn('LocalStorage fallback failed', e);
    }
  }
}

/**
 * Retrieves all saved checkpoints from IndexedDB (sorted newest first)
 */
export async function getAllCheckpointsFromIndexedDB(): Promise<SystemCheckpoint[]> {
  try {
    const db = await openCheckpointDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as SystemCheckpoint[]) || [];
        // Sort descending by timestamp
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Leyendo fallback de checkpoints desde localStorage:', err);
    try {
      const raw = localStorage.getItem('panolpro_idb_checkpoints_fallback') || '[]';
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
}

/**
 * Deletes a single checkpoint from IndexedDB
 */
export async function deleteCheckpointFromIndexedDB(id: string): Promise<void> {
  try {
    const db = await openCheckpointDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error al borrar de IndexedDB', err);
    try {
      const raw = localStorage.getItem('panolpro_idb_checkpoints_fallback') || '[]';
      const list = JSON.parse(raw).filter((c: SystemCheckpoint) => c.id !== id);
      localStorage.setItem('panolpro_idb_checkpoints_fallback', JSON.stringify(list));
    } catch {
      // ignore
    }
  }
}

/**
 * Triggers automatic download of checkpoint file: checkpoint_almacen_YYYY-MM-DD.json
 */
export function downloadCheckpointFile(checkpoint: SystemCheckpoint): void {
  try {
    const d = new Date(checkpoint.timestamp);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const filename = `checkpoint_almacen_${yyyy}-${mm}-${dd}.json`;

    const jsonStr = JSON.stringify(checkpoint, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Error al generar la descarga del archivo de checkpoint:', e);
  }
}

/**
 * Parses and validates an uploaded checkpoint JSON file
 */
export function parseCheckpointFile(file: File): Promise<SystemCheckpoint> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Validation of essential checkpoint payload
        if (!parsed || !parsed.data) {
          throw new Error('El archivo no contiene un formato de checkpoint válido.');
        }

        const checkpoint: SystemCheckpoint = {
          id: parsed.id || `chk-uploaded-${Date.now()}`,
          nombre: parsed.nombre || `Restaurado de archivo: ${file.name}`,
          descripcion: parsed.descripcion || 'Punto importado desde archivo JSON externo',
          timestamp: parsed.timestamp || new Date().toISOString(),
          tipo: 'manual',
          totalActivos: Array.isArray(parsed.data.assets) ? parsed.data.assets.length : 0,
          totalVales: Array.isArray(parsed.data.dispatches) ? parsed.data.dispatches.length : 0,
          totalTecnicos: Array.isArray(parsed.data.technicians) ? parsed.data.technicians.length : 0,
          data: {
            assets: parsed.data.assets || [],
            technicians: parsed.data.technicians || [],
            dispatches: parsed.data.dispatches || [],
            storekeepers: parsed.data.storekeepers || [],
            kardex: parsed.data.kardex || [],
          },
        };

        resolve(checkpoint);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('No se pudo procesar el archivo JSON.'));
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsText(file);
  });
}
