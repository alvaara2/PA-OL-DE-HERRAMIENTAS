/**
 * Curated high-resolution reference images for industrial tools and sockets
 */

export interface ReferenceImageCategory {
  id: string;
  name: string;
  keywords: string[];
  imageUrl: string;
}

export const REFERENCE_CATALOG: ReferenceImageCategory[] = [
  {
    id: 'dado_impacto_individual',
    name: 'Dado de Impacto 6 Puntas (Fosfatado Negro)',
    keywords: ['impacto', 'dado impacto', 'copa impacto', 'socket impact', 'fosfatado'],
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'dado_cromo_estandar',
    name: 'Dado Métrico Cromo Vanadio',
    keywords: ['dado', 'bocallave', 'cubo', 'cromo', 'milimetrico'],
    imageUrl: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'torquimetro_industrial',
    name: 'Torquímetro de Click / Zafe Micrométrico',
    keywords: ['torquimetro', 'torquímetro', 'dinamometrica', 'torque', 'snap-on', 'proto'],
    imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'taladro_percutor',
    name: 'Taladro Percutor Industrial',
    keywords: ['taladro', 'rotomartillo', 'bosch', 'dewalt', 'makita', 'percutor'],
    imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'amoladora_angular',
    name: 'Amoladora Angular / Esmeril 4-1/2"',
    keywords: ['amoladora', 'esmeril', 'pulidora', 'disco', 'makita ga', 'dwe4020'],
    imageUrl: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'pistola_impacto_neumatica',
    name: 'Llave de Impacto Neumática 1/2" Heavy Duty',
    keywords: ['pistola', 'neumatica', 'llave impacto', 'ingersoll', 'aire comprimido'],
    imageUrl: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'llave_combinada',
    name: 'Llave Combinada Boca / Corona',
    keywords: ['llave combinada', 'llave mixta', 'corona', 'boca', 'bahco', 'stanley'],
    imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'extension_accesorios',
    name: 'Barra de Extensión y Accesorios Encastre',
    keywords: ['extension', 'extensión', 'cardan', 'trinquete', 'rache', 'barra'],
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'multimetro_digital',
    name: 'Multímetro Digital Automotriz',
    keywords: ['multimetro', 'multímetro', 'fluke', 'tester', 'amperimetrica'],
    imageUrl: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
  },
];

/**
 * Automatically suggests a reference image according to tool text or brand
 */
export function getAutoReferenceImage(description: string, brand?: string): string {
  const fullText = `${description} ${brand || ''}`.toLowerCase();

  for (const item of REFERENCE_CATALOG) {
    for (const kw of item.keywords) {
      if (fullText.includes(kw.toLowerCase())) {
        return item.imageUrl;
      }
    }
  }

  // Default fallback workshop tools image
  return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80';
}
