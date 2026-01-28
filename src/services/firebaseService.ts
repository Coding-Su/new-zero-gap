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
import type { Feature, Project, MeetingLog } from "../types";

const FEATURES_COL = "features";
const PROJECTS_COL = "projects";
const LOGS_COL = "meeting_logs";

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
    const batch = writeBatch(db);

    // 1. Feature 삭제 준비 (변수 이름을 featuresSnap으로 통일)
    const featuresQ = query(collection(db, FEATURES_COL), where("projectId", "==", projectId));
    const featuresSnap = await getDocs(featuresQ);
    featuresSnap.docs.forEach((d) => batch.delete(d.ref));

    // 2. MeetingLog 삭제 준비 (변수 이름을 logsSnap으로 통일)
    const logsQ = query(collection(db, LOGS_COL), where("projectId", "==", projectId));
    const logsSnap = await getDocs(logsQ);
    logsSnap.docs.forEach((d) => batch.delete(d.ref));

    // 3. 프로젝트 삭제 준비
    const projectRef = doc(db, PROJECTS_COL, projectId);
    batch.delete(projectRef);

    // 4. 한 번에 실행
    await batch.commit();

    console.log(`✅ 프로젝트(${projectId}) 청소 완료`);
  } catch (error) {
    console.error("삭제 중 오류:", error);
    throw error;
  }
};

/**
 * ==========================================
 * [신규] 회의록(Meeting Log) 관련 서비스 함수
 * ==========================================
 */

/**
 * 1. 회의록 원문 저장하기
 */
export const saveMeetingLogToDB = async (log: MeetingLog) => {
  try {
    await setDoc(doc(db, LOGS_COL, log.id), log);
  } catch (error) {
    console.error("회의록 저장 중 오류 발생:", error);
    throw error;
  }
};

/**
 * 2. 특정 프로젝트의 회의록 히스토리 가져오기
 */
export const fetchMeetingLogsByProjectId = async (projectId: string): Promise<MeetingLog[]> => {
  const q = query(collection(db, LOGS_COL), where("projectId", "==", projectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeetingLog));
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

/**
 * 특정 기능(Feature)과 연결된 회의록 원문 가져오기 (역추적)
 * Firestore의 array-contains 쿼리를 사용하여 해당 ID가 포함된 로그를 찾습니다.
 */
export const fetchMeetingLogByFeatureId = async (featureId: string): Promise<MeetingLog | null> => {
  try {
    const q = query(
      collection(db, LOGS_COL),
      where("derivedFeatureIds", "array-contains", featureId)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeetingLog));
      // 생성일(createdAt) 기준 내림차순 정렬 후 가장 최근 것 반환
      return logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    }
    return null;
  } catch (error) {
    console.error("회의록 역추적 중 오류:", error);
    return null;
  }
};
/**
 * ID로 특정 회의록 원문 가져오기 (버전별 역추적용)
 */
export const fetchMeetingLogById = async (logId: string): Promise<MeetingLog | null> => {
  try {
    const docRef = doc(db, LOGS_COL, logId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as MeetingLog;
    }
    return null;
  } catch (error) {
    console.error("회의록(ID) 가져오기 실패:", error);
    return null;
  }
};

/**
 * 특정 기능(Feature)과 연결된 *모든* 회의록 원문 가져오기
 * (Legacy 데이터 및 타임스탬프 매칭용)
 */
export const fetchMeetingLogsListByFeatureId = async (featureId: string): Promise<MeetingLog[]> => {
  try {
    const q = query(
      collection(db, LOGS_COL),
      where("derivedFeatureIds", "array-contains", featureId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeetingLog));
  } catch (error) {
    console.error("회의록 리스트 역추적 중 오류:", error);
    return [];
  }
};
