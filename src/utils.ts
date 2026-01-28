
/**
 * Calculates the similarity between two strings using Jaccard index on character n-grams.
 * Returns a value between 0 and 1, where 1 means identical.
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().replace(/\s+/g, '');
    const s2 = str2.toLowerCase().replace(/\s+/g, '');

    if (s1 === s2) return 1;

    // Use bigrams
    const getBigrams = (str: string) => {
        const bigrams = new Set<string>();
        for (let i = 0; i < str.length - 1; i++) {
            bigrams.add(str.substring(i, i + 2));
        }
        return bigrams;
    };

    const bg1 = getBigrams(s1);
    const bg2 = getBigrams(s2);

    const intersection = new Set([...bg1].filter(x => bg2.has(x)));
    const union = new Set([...bg1, ...bg2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
};
