// 文本相似度算法

// 分词：简单的中英文分词
function tokenize(text: string): string[] {
  // 移除标点符号，转小写
  const cleaned = text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, " ")
    .trim()

  // 中文按字符分割，英文按空格分割
  const tokens: string[] = []
  let englishWord = ""

  for (const char of cleaned) {
    if (/[\u4e00-\u9fa5]/.test(char)) {
      // 中文字符
      if (englishWord) {
        tokens.push(englishWord)
        englishWord = ""
      }
      tokens.push(char)
    } else if (/[a-z0-9]/.test(char)) {
      // 英文/数字字符
      englishWord += char
    } else if (englishWord) {
      // 空格或其他，结束当前英文单词
      tokens.push(englishWord)
      englishWord = ""
    }
  }

  if (englishWord) {
    tokens.push(englishWord)
  }

  // 过滤掉单字符英文和常见停用词
  const stopWords = new Set([
    "的",
    "是",
    "在",
    "了",
    "和",
    "有",
    "我",
    "也",
    "不",
    "就",
    "都",
    "这",
    "要",
    "会",
    "能",
    "到",
    "说",
    "为",
    "以",
    "很",
    "但",
    "被",
    "他",
    "她",
    "它",
    "们",
    "你",
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "can",
    "need",
    "dare",
    "ought",
    "used",
    "to",
    "of",
    "in",
    "for",
    "on",
    "with",
    "at",
    "by",
    "from",
    "as",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "under",
    "again",
    "further",
    "then",
    "once",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "no",
    "nor",
    "not",
    "only",
    "own",
    "same",
    "so",
    "than",
    "too",
    "very",
    "just",
    "and",
    "but",
    "if",
    "or",
    "because",
    "as",
    "until",
    "while",
    "i",
    "me",
    "my",
    "myself",
    "we",
    "our",
    "ours",
    "ourselves",
    "you",
    "your",
    "yours",
    "yourself",
    "yourselves",
    "he",
    "him",
    "his",
    "himself",
    "she",
    "her",
    "hers",
    "herself",
    "it",
    "its",
    "itself",
    "they",
    "them",
    "their",
    "theirs",
    "themselves",
    "what",
    "which",
    "who",
    "whom",
    "this",
    "that",
    "these",
    "those",
    "am",
  ])

  return tokens
    .filter((t) => t.length > 1 || /[\u4e00-\u9fa5]/.test(t))
    .filter((t) => !stopWords.has(t))
}

// Jaccard 相似度
export function jaccardSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(tokenize(text1))
  const tokens2 = new Set(tokenize(text2))

  if (tokens1.size === 0 && tokens2.size === 0) return 1
  if (tokens1.size === 0 || tokens2.size === 0) return 0

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)))
  const union = new Set([...tokens1, ...tokens2])

  return (intersection.size / union.size) * 100
}

// 余弦相似度（基于词频向量）
export function cosineSimilarity(text1: string, text2: string): number {
  const tokens1 = tokenize(text1)
  const tokens2 = tokenize(text2)

  if (tokens1.length === 0 && tokens2.length === 0) return 100
  if (tokens1.length === 0 || tokens2.length === 0) return 0

  // 构建词频映射
  const freq1 = new Map<string, number>()
  const freq2 = new Map<string, number>()

  for (const token of tokens1) {
    freq1.set(token, (freq1.get(token) || 0) + 1)
  }
  for (const token of tokens2) {
    freq2.set(token, (freq2.get(token) || 0) + 1)
  }

  // 获取所有词汇
  const allTokens = new Set([...freq1.keys(), ...freq2.keys()])

  // 计算点积和模长
  let dotProduct = 0
  let magnitude1 = 0
  let magnitude2 = 0

  for (const token of allTokens) {
    const v1 = freq1.get(token) || 0
    const v2 = freq2.get(token) || 0
    dotProduct += v1 * v2
    magnitude1 += v1 * v1
    magnitude2 += v2 * v2
  }

  if (magnitude1 === 0 || magnitude2 === 0) return 0

  return (dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2))) * 100
}

// N-gram 相似度（基于连续字符序列）
export function ngramSimilarity(text1: string, text2: string, n: number = 2): number {
  const getNgrams = (text: string): Set<string> => {
    const cleaned = text.replace(/\s+/g, "").toLowerCase()
    const ngrams = new Set<string>()
    for (let i = 0; i <= cleaned.length - n; i++) {
      ngrams.add(cleaned.slice(i, i + n))
    }
    return ngrams
  }

  const ngrams1 = getNgrams(text1)
  const ngrams2 = getNgrams(text2)

  if (ngrams1.size === 0 && ngrams2.size === 0) return 100
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0

  const intersection = new Set([...ngrams1].filter((x) => ngrams2.has(x)))
  const union = new Set([...ngrams1, ...ngrams2])

  return (intersection.size / union.size) * 100
}

// 综合相似度（加权平均）
export function calculateSimilarity(text1: string, text2: string): number {
  const jaccard = jaccardSimilarity(text1, text2)
  const cosine = cosineSimilarity(text1, text2)
  const ngram = ngramSimilarity(text1, text2, 3)

  // 加权平均：Jaccard 30%, Cosine 40%, N-gram 30%
  return jaccard * 0.3 + cosine * 0.4 + ngram * 0.3
}

// 快速筛选：只使用 Jaccard，用于初步过滤
export function quickSimilarityCheck(
  text1: string,
  text2: string,
  threshold: number = 30,
): boolean {
  return jaccardSimilarity(text1, text2) >= threshold
}
