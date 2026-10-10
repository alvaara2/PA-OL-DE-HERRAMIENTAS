import { PhysicalAsset } from '../types/workshop';
import { getAutoReferenceImage } from './imageCatalog';

/**
 * Checks whether an error caught during storage operations is a QuotaExceededError.
 */
export function isQuotaExceededError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof DOMException) {
    return (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014
    );
  }
  const str = String(err).toLowerCase();
  return str.includes('quota') || str.includes('storage') || str.includes('exceeded');
}

export interface SaveAssetsResult {
  success: boolean;
  fallbackApplied: boolean;
  affectedAssetCode?: string;
  errorMessage?: string;
  assetsSaved: PhysicalAsset[];
}

/**
 * Safely saves assets to localStorage with automatic QuotaExceeded protection.
 * If storage quota is reached:
 * 1. Preserves all technical tool data (codes, DNI, specs, calibration, location).
 * 2. Replaces heavy base64 images with lightweight reference images or empty string.
 * 3. Guarantees the tool is never lost or deleted from the inventory.
 */
export function safeSaveAssetsToLocalStorage(
  storageKey: string,
  assetsList: PhysicalAsset[],
  targetAsset?: PhysicalAsset
): SaveAssetsResult {
  try {
    // 1. Primary attempt: save full list with images
    localStorage.setItem(storageKey, JSON.stringify(assetsList));
    return {
      success: true,
      fallbackApplied: false,
      assetsSaved: assetsList,
    };
  } catch (primaryError) {
    console.warn('Storage quota warning on primary save:', primaryError);

    const affectedCode = targetAsset?.codigoActivoFisico || 'Herramienta';

    // 2. Fallback attempt 1: Strip heavy image from the target asset only
    if (targetAsset) {
      const fallbackList1 = assetsList.map((a) => {
        if (a.id === targetAsset.id) {
          const lightweightRef = getAutoReferenceImage(a.descripcion, a.marca);
          return {
            ...a,
            fotoUrl: lightweightRef || '',
          };
        }
        return a;
      });

      try {
        localStorage.setItem(storageKey, JSON.stringify(fallbackList1));
        return {
          success: true,
          fallbackApplied: true,
          affectedAssetCode: affectedCode,
          assetsSaved: fallbackList1,
        };
      } catch (e2) {
        console.warn('Fallback 1 also exceeded quota, attempting global image sanitization:', e2);
      }
    }

    // 3. Fallback attempt 2: Strip any heavy base64 data URLs from all assets
    // preserving all IDs, codes, DNIs, categories, locations and technical specs.
    const sanitizedList = assetsList.map((a) => {
      const isHeavyDataUrl = typeof a.fotoUrl === 'string' && a.fotoUrl.startsWith('data:');
      if (isHeavyDataUrl) {
        return {
          ...a,
          fotoUrl: getAutoReferenceImage(a.descripcion, a.marca) || '',
        };
      }
      return a;
    });

    try {
      localStorage.setItem(storageKey, JSON.stringify(sanitizedList));
      return {
        success: true,
        fallbackApplied: true,
        affectedAssetCode: affectedCode,
        assetsSaved: sanitizedList,
      };
    } catch (e3) {
      console.warn('Fallback 2 failed, cleaning up secondary caches to guarantee tool retention:', e3);
    }

    // 4. Fallback attempt 3: Clear non-essential backup checkpoints from localStorage
    // (IndexedDB still holds the permanent checkpoints) and retry.
    try {
      localStorage.removeItem('panolpro_checkpoints_v45');
      localStorage.removeItem('panolpro_idb_checkpoints_fallback');
      localStorage.setItem(storageKey, JSON.stringify(sanitizedList));
      return {
        success: true,
        fallbackApplied: true,
        affectedAssetCode: affectedCode,
        assetsSaved: sanitizedList,
      };
    } catch (finalError) {
      console.error('Critical storage failure after all fallbacks:', finalError);
      return {
        success: false,
        fallbackApplied: true,
        affectedAssetCode: affectedCode,
        errorMessage: 'El almacenamiento local del navegador está completamente bloqueado.',
        assetsSaved: assetsList,
      };
    }
  }
}
