
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

/**
 * 날짜 문자열을 "YYYY. MM. DD. 오전/오후 hh:mm" 형식으로 변환합니다.
 * @param dateStr 
 */
export const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';

    let date = new Date(dateStr);

    // 파싱 실패 시, 한국식 toLocaleString 포맷("2026. 1. 28. 오후 9:07:31") 파싱 시도
    if (isNaN(date.getTime())) {
        const koreanDateRegex = /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{1,2})/;
        const match = dateStr.match(koreanDateRegex);
        if (match) {
            const [_, y, m, d, ampm, h, min] = match;
            let hour = parseInt(h, 10);
            if (ampm === '오후' && hour < 12) hour += 12;
            if (ampm === '오전' && hour === 12) hour = 0;
            date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), hour, parseInt(min));
        }
    }

    // 여전히 유효하지 않으면 원본 반환
    if (isNaN(date.getTime())) return dateStr;

    const yyyy = date.getFullYear();
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');

    let hour = date.getHours();
    const ampm = hour >= 12 ? '오후' : '오전';
    hour = hour % 12;
    hour = hour ? hour : 12; // 0시는 12시로 표시

    const hourStr = hour.toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');

    return `${yyyy}. ${mm}. ${dd}. ${ampm} ${hourStr}:${min}`;
};
