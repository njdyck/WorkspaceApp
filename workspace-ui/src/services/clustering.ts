// KI-Clustering Service
// Analysiert Inhalte und ordnet zusammengehörige Notizen automatisch an

import { CanvasItem } from '@/models/item';

// ============================================
// Einfaches Keyword-basiertes Clustering
// (Funktioniert ohne externe API)
// ============================================

// Stopwörter für Deutsch und Englisch
const STOPWORDS = new Set([
  // Deutsch
  'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'für', 'mit', 
  'von', 'zu', 'in', 'auf', 'an', 'ist', 'sind', 'war', 'wird', 'haben',
  'hat', 'bei', 'nach', 'über', 'unter', 'durch', 'als', 'auch', 'nur',
  'noch', 'schon', 'so', 'wie', 'wenn', 'dass', 'nicht', 'mehr', 'sehr',
  // Englisch
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'from', 'to', 'in',
  'on', 'at', 'is', 'are', 'was', 'will', 'have', 'has', 'by', 'after',
  'about', 'under', 'through', 'as', 'also', 'only', 'still', 'so', 'how',
  'if', 'that', 'not', 'more', 'very', 'this', 'it', 'be', 'been', 'being',
]);

// Extrahiert Keywords aus Text
const extractKeywords = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^\wäöüß\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOPWORDS.has(word));
};

// Berechnet Ähnlichkeit zwischen zwei Keyword-Sets (Jaccard Index)
const calculateSimilarity = (keywords1: string[], keywords2: string[]): number => {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
};

// ============================================
// Clustering-Algorithmen
// ============================================

interface ClusterResult {
  clusterId: number;
  items: CanvasItem[];
  centroid: { x: number; y: number };
  keywords: string[];
}

// Einfaches hierarchisches Clustering basierend auf Keyword-Ähnlichkeit
export const clusterItems = (items: CanvasItem[], similarityThreshold: number = 0.15): ClusterResult[] => {
  if (items.length === 0) return [];
  
  // Keywords für alle Items extrahieren
  const itemKeywords = items.map(item => ({
    item,
    keywords: extractKeywords(item.content),
  }));
  
  // Ähnlichkeitsmatrix berechnen
  const n = items.length;
  const similarities: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = calculateSimilarity(itemKeywords[i].keywords, itemKeywords[j].keywords);
      similarities[i][j] = sim;
      similarities[j][i] = sim;
    }
  }
  
  // Cluster-Zuweisung (Simple Greedy Clustering)
  const clusterAssignments: number[] = new Array(n).fill(-1);
  let currentCluster = 0;
  
  for (let i = 0; i < n; i++) {
    if (clusterAssignments[i] === -1) {
      clusterAssignments[i] = currentCluster;
      
      // Finde ähnliche Items für diesen Cluster
      for (let j = i + 1; j < n; j++) {
        if (clusterAssignments[j] === -1 && similarities[i][j] >= similarityThreshold) {
          clusterAssignments[j] = currentCluster;
        }
      }
      
      currentCluster++;
    }
  }
  
  // Cluster-Ergebnisse zusammenstellen
  const clusterMap = new Map<number, CanvasItem[]>();
  
  items.forEach((item, index) => {
    const clusterId = clusterAssignments[index];
    if (!clusterMap.has(clusterId)) {
      clusterMap.set(clusterId, []);
    }
    clusterMap.get(clusterId)!.push(item);
  });
  
  // Ergebnisse formatieren
  const results: ClusterResult[] = [];
  
  clusterMap.forEach((clusterItems, clusterId) => {
    // Centroid berechnen
    const centroid = {
      x: clusterItems.reduce((sum, item) => sum + item.x, 0) / clusterItems.length,
      y: clusterItems.reduce((sum, item) => sum + item.y, 0) / clusterItems.length,
    };
    
    // Häufigste Keywords sammeln
    const keywordCounts = new Map<string, number>();
    clusterItems.forEach(item => {
      extractKeywords(item.content).forEach(keyword => {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
      });
    });
    
    const topKeywords = [...keywordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword]) => keyword);
    
    results.push({
      clusterId,
      items: clusterItems,
      centroid,
      keywords: topKeywords,
    });
  });
  
  return results;
};

// ============================================
// Auto-Layout Funktionen
// ============================================

interface LayoutPosition {
  itemId: string;
  x: number;
  y: number;
}

// Berechnet neue Positionen für Items basierend auf Clustering
export const calculateClusteredLayout = (
  items: CanvasItem[],
  canvasCenter: { x: number; y: number } = { x: 500, y: 400 },
  _clusterSpacing: number = 400,
  itemSpacing: number = 30
): LayoutPosition[] => {
  const clusters = clusterItems(items);
  const positions: LayoutPosition[] = [];
  
  // Cluster in einem Kreis um das Zentrum anordnen
  const clusterCount = clusters.length;
  const angleStep = (2 * Math.PI) / Math.max(clusterCount, 1);
  const baseRadius = Math.max(200, clusterCount * 80);
  
  clusters.forEach((cluster, clusterIndex) => {
    // Position des Cluster-Zentrums
    const angle = clusterIndex * angleStep - Math.PI / 2; // Start oben
    const clusterCenterX = canvasCenter.x + Math.cos(angle) * baseRadius;
    const clusterCenterY = canvasCenter.y + Math.sin(angle) * baseRadius;
    
    // Items innerhalb des Clusters anordnen
    const itemCount = cluster.items.length;
    
    if (itemCount === 1) {
      // Einzelnes Item direkt im Cluster-Zentrum
      positions.push({
        itemId: cluster.items[0].id,
        x: clusterCenterX - cluster.items[0].width / 2,
        y: clusterCenterY - cluster.items[0].height / 2,
      });
    } else {
      // Mehrere Items in einem Grid innerhalb des Clusters
      const cols = Math.ceil(Math.sqrt(itemCount));
      const rows = Math.ceil(itemCount / cols);
      
      cluster.items.forEach((item, itemIndex) => {
        const col = itemIndex % cols;
        const row = Math.floor(itemIndex / cols);
        
        // Grid-Position relativ zum Cluster-Zentrum
        const gridWidth = cols * (item.width + itemSpacing) - itemSpacing;
        const gridHeight = rows * (item.height + itemSpacing) - itemSpacing;
        
        const x = clusterCenterX - gridWidth / 2 + col * (item.width + itemSpacing);
        const y = clusterCenterY - gridHeight / 2 + row * (item.height + itemSpacing);
        
        positions.push({ itemId: item.id, x, y });
      });
    }
  });
  
  return positions;
};

// ============================================
// Embedding-basiertes Clustering (mit OpenAI API)
// ============================================

interface EmbeddingResult {
  itemId: string;
  embedding: number[];
}

// OpenAI Embedding API aufrufen
export const getEmbeddings = async (
  items: CanvasItem[],
  apiKey: string
): Promise<EmbeddingResult[]> => {
  const texts = items.map(item => item.content);
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return items.map((item, index) => ({
      itemId: item.id,
      embedding: data.data[index].embedding,
    }));
  } catch (error) {
    console.error('Fehler beim Abrufen der Embeddings:', error);
    throw error;
  }
};

// Kosinus-Ähnlichkeit zwischen zwei Vektoren
const cosineSimilarity = (a: number[], b: number[]): number => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// K-Means Clustering auf Embeddings
export const clusterByEmbeddings = (
  embeddings: EmbeddingResult[],
  k: number = 5,
  maxIterations: number = 100
): Map<string, number> => {
  if (embeddings.length === 0) return new Map();
  
  const n = embeddings.length;
  const dim = embeddings[0].embedding.length;
  
  // Anzahl Cluster auf Anzahl Items begrenzen
  k = Math.min(k, n);
  
  // Zufällige Initialisierung der Zentroide
  const centroids: number[][] = [];
  const usedIndices = new Set<number>();
  
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * n);
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      centroids.push([...embeddings[idx].embedding]);
    }
  }
  
  // Cluster-Zuweisungen
  let assignments = new Array(n).fill(0);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Zuweisungsschritt: Jedes Item dem nächsten Zentroid zuweisen
    const newAssignments = embeddings.map((emb) => {
      let bestCluster = 0;
      let bestSimilarity = -Infinity;
      
      centroids.forEach((centroid, clusterIdx) => {
        const similarity = cosineSimilarity(emb.embedding, centroid);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = clusterIdx;
        }
      });
      
      return bestCluster;
    });
    
    // Prüfen ob Konvergenz erreicht
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;
    
    if (!changed) break;
    
    // Update-Schritt: Zentroide neu berechnen
    for (let c = 0; c < k; c++) {
      const clusterEmbeddings = embeddings.filter((_, i) => assignments[i] === c);
      
      if (clusterEmbeddings.length > 0) {
        const newCentroid = new Array(dim).fill(0);
        clusterEmbeddings.forEach((emb) => {
          emb.embedding.forEach((val, i) => {
            newCentroid[i] += val;
          });
        });
        centroids[c] = newCentroid.map(v => v / clusterEmbeddings.length);
      }
    }
  }
  
  // Ergebnis als Map
  const result = new Map<string, number>();
  embeddings.forEach((emb, idx) => {
    result.set(emb.itemId, assignments[idx]);
  });
  
  return result;
};

// ============================================
// Haupt-Export: Auto-Cluster Funktion
// ============================================

export interface AutoClusterOptions {
  useAI?: boolean;
  apiKey?: string;
  clusterCount?: number;
  canvasCenter?: { x: number; y: number };
}

export const autoClusterItems = async (
  items: CanvasItem[],
  options: AutoClusterOptions = {}
): Promise<LayoutPosition[]> => {
  const { useAI = false, apiKey, clusterCount = 5, canvasCenter = { x: 500, y: 400 } } = options;
  
  if (items.length === 0) return [];
  
  if (useAI && apiKey) {
    try {
      // Embedding-basiertes Clustering
      const embeddings = await getEmbeddings(items, apiKey);
      const clusters = clusterByEmbeddings(embeddings, clusterCount);
      
      // Nach Clustern gruppieren
      const clusterGroups = new Map<number, CanvasItem[]>();
      items.forEach(item => {
        const clusterId = clusters.get(item.id) || 0;
        if (!clusterGroups.has(clusterId)) {
          clusterGroups.set(clusterId, []);
        }
        clusterGroups.get(clusterId)!.push(item);
      });
      
      // Layout berechnen
      const positions: LayoutPosition[] = [];
      const clusterArray = Array.from(clusterGroups.entries());
      const angleStep = (2 * Math.PI) / Math.max(clusterArray.length, 1);
      const baseRadius = Math.max(200, clusterArray.length * 80);
      
      clusterArray.forEach(([_, clusterItems], clusterIndex) => {
        const angle = clusterIndex * angleStep - Math.PI / 2;
        const clusterCenterX = canvasCenter.x + Math.cos(angle) * baseRadius;
        const clusterCenterY = canvasCenter.y + Math.sin(angle) * baseRadius;
        
        const cols = Math.ceil(Math.sqrt(clusterItems.length));
        
        clusterItems.forEach((item, itemIndex) => {
          const col = itemIndex % cols;
          const row = Math.floor(itemIndex / cols);
          
          positions.push({
            itemId: item.id,
            x: clusterCenterX + col * (item.width + 30) - (cols * (item.width + 30)) / 2,
            y: clusterCenterY + row * (item.height + 30) - (Math.ceil(clusterItems.length / cols) * (item.height + 30)) / 2,
          });
        });
      });
      
      return positions;
    } catch (error) {
      console.warn('AI-Clustering fehlgeschlagen, verwende Keyword-Clustering:', error);
      // Fallback auf Keyword-Clustering
    }
  }
  
  // Keyword-basiertes Clustering (Default)
  return calculateClusteredLayout(items, canvasCenter);
};

