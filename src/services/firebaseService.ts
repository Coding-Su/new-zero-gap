import { db } from "../firebase";
import { 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  doc,
  deleteDoc,
  query,
  where,
  writeBatch // [추가] 대량 삭제를 위한 배치 처리
} from "firebase/firestore";
import type { Feature, Project } from "../types";

const FEATURES_COL = "features";
const PROJECTS_COL = "projects";

/**
 * ==========================================
 * [신규] 프로젝트(Project) 관련 서비스 함수
 * ==========================================
 */

/**
 * 1. 모든 프로젝트 리스트 가져오기
 */
export const fetchProjectsFromDB = async (): Promise<Project[]> => {
  const querySnapshot = await getDocs(collection(db, PROJECTS_COL));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
};

/**
 * 2. 새 프로젝트 생성 및 정보 업데이트
 */
export const saveProjectToDB = async (project: Project) => {
  await setDoc(doc(db, PROJECTS_COL, project.id), project);
};

/**
 * 3. 특정 프로젝트 삭제 (연쇄 삭제 로직 추가)
 * 프로젝트 삭제 시 해당 프로젝트에 속한 모든 Feature들도 함께 제거합니다.
 */
export const deleteProjectFromDB = async (projectId: string): Promise<void> => {
  try {
    // 1. 해당 프로젝트에 속한 모든 기능(Feature)들을 먼저 찾습니다.
    const q = query(collection(db, FEATURES_COL), where("projectId", "==", projectId));
    const querySnapshot = await getDocs(q);
    
    // 2. Firestore의 Batch 기능을 사용하여 한 번에 삭제 처리합니다. (성능 및 안정성)
    const batch = writeBatch(db);
    
    // 해당 프로젝트 소속 Feature들을 삭제 큐에 추가
    querySnapshot.docs.forEach((featureDoc) => {
      batch.delete(featureDoc.ref);
    });

    // 3. 마지막으로 프로젝트 자체를 삭제 큐에 추가
    const projectRef = doc(db, PROJECTS_COL, projectId);
    batch.delete(projectRef);

    // 4. 모든 삭제 작업을 한꺼번에 실행
    await batch.commit();
    
    console.log(`프로젝트 ${projectId}와 관련된 모든 기능이 삭제되었습니다.`);
  } catch (error) {
    console.error("프로젝트 및 하위 데이터 삭제 중 오류 발생:", error);
    throw error;
  }
};


/**
 * ==========================================
 * [유지/수정] 기능(Feature) 관련 서비스 함수
 * ==========================================
 */

/**
 * 1. [대시보드용] 특정 프로젝트에 속한 기능 리스트만 가져오기
 */
export const fetchFeaturesByProjectId = async (projectId: string): Promise<Feature[]> => {
  const q = query(collection(db, FEATURES_COL), where("projectId", "==", projectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feature));
};

/**
 * [기존 유지] 모든 기능 리스트 가져오기
 */
export const fetchFeaturesFromDB = async (): Promise<Feature[]> => {
  const querySnapshot = await getDocs(collection(db, FEATURES_COL));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feature));
};

/**
 * 2. [상세 페이지용] 특정 ID로 기능 하나만 가져오기
 */
export const fetchFeatureById = async (id: string): Promise<Feature | null> => {
  const docRef = doc(db, FEATURES_COL, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Feature;
  } else {
    console.error("해당 데이터를 찾을 수 없습니다.");
    return null;
  }
};

/**
 * 3. 기능 저장 및 업데이트하기
 */
export const saveFeatureToDB = async (feature: Feature) => {
  await setDoc(doc(db, FEATURES_COL, feature.id), feature);
};

/**
 * 4. 특정 기능 삭제하기
 */
export const deleteFeatureFromDB = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, FEATURES_COL, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("DB 삭제 중 오류 발생:", error);
    throw error;
  }
};

/**
 * 5. 특정 기능 내의 '기획 의도(History/Opinion)' 목록 전체 업데이트
 */
export const updateFeatureOpinions = async (featureId: string, updatedHistories: any[]) => {
  try {
    const docRef = doc(db, FEATURES_COL, featureId);
    await setDoc(docRef, { histories: updatedHistories }, { merge: true });
  } catch (error) {
    console.error("기획 의도 업데이트 중 오류 발생:", error);
    throw error;
  }
};