import { db } from "../firebase";
import { 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  doc 
} from "firebase/firestore";
import type { Feature } from "../types";

const COLLECTION_NAME = "features";

/**
 * 1. [대시보드용] 모든 기능 리스트 가져오기
 * 앱이 처음 실행될 때 전체 카드를 화면에 뿌려주기 위해 사용합니다.
 */
export const fetchFeaturesFromDB = async (): Promise<Feature[]> => {
  const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feature));
};

/**
 * 2. [상세 페이지용] 특정 ID로 기능 하나만 가져오기
 * 대시보드에서 카드를 클릭해 들어갔을 때, 해당 기능의 상세 히스토리를 불러오기 위해 사용합니다.
 */
export const fetchFeatureById = async (id: string): Promise<Feature | null> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Feature;
  } else {
    console.error("해당 데이터를 찾을 수 없습니다.");
    return null;
  }
};

/**
 * 3. [공통] 기능 저장 및 업데이트하기
 * AI 분석 결과가 나왔을 때 DB에 새로 저장하거나 기존 데이터를 갱신할 때 사용합니다.
 */
export const saveFeatureToDB = async (feature: Feature) => {
  // 문서 ID를 feature.id와 동일하게 설정하여 중복 생성을 방지합니다.
  await setDoc(doc(db, COLLECTION_NAME, feature.id), feature);
};