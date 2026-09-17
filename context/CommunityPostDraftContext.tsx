import type { ScenarioInfo, TrainingRecordItem } from "@/api/types";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface CommunityPostDraftContextValue {
  selectedScenario: ScenarioInfo | null;
  selectScenario: (scenario: ScenarioInfo) => void;
  clearScenario: () => void;
  selectedTrainingRecord: TrainingRecordItem | null;
  selectTrainingRecord: (record: TrainingRecordItem) => void;
  clearTrainingRecord: () => void;
  selectedPhotoUri: string | null;
  selectedPhotoName: string | null;
  selectedPhotoFileId: number | null;
  selectPhoto: (uri: string, fileName?: string, fileId?: number) => void;
  clearPhoto: () => void;
}

const CommunityPostDraftContext =
  createContext<CommunityPostDraftContextValue | null>(null);

export function CommunityPostDraftProvider({ children }: PropsWithChildren) {
  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioInfo | null>(null);
  const [selectedTrainingRecord, setSelectedTrainingRecord] =
    useState<TrainingRecordItem | null>(null);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [selectedPhotoName, setSelectedPhotoName] = useState<string | null>(
    null,
  );
  const [selectedPhotoFileId, setSelectedPhotoFileId] = useState<number | null>(
    null,
  );
  const selectScenario = useCallback((scenario: ScenarioInfo) => {
    setSelectedScenario(scenario);
  }, []);
  const clearScenario = useCallback(() => {
    setSelectedScenario(null);
  }, []);
  const selectTrainingRecord = useCallback((record: TrainingRecordItem) => {
    setSelectedTrainingRecord(record);
  }, []);
  const clearTrainingRecord = useCallback(() => {
    setSelectedTrainingRecord(null);
  }, []);
  const selectPhoto = useCallback((
    uri: string,
    fileName?: string,
    fileId?: number,
  ) => {
    setSelectedPhotoUri(uri);
    setSelectedPhotoName(fileName ?? null);
    setSelectedPhotoFileId(fileId ?? null);
  }, []);
  const clearPhoto = useCallback(() => {
    setSelectedPhotoUri(null);
    setSelectedPhotoName(null);
    setSelectedPhotoFileId(null);
  }, []);
  const value = useMemo(
    () => ({
      selectedScenario,
      selectScenario,
      clearScenario,
      selectedTrainingRecord,
      selectTrainingRecord,
      clearTrainingRecord,
      selectedPhotoUri,
      selectedPhotoName,
      selectedPhotoFileId,
      selectPhoto,
      clearPhoto,
    }),
    [
      clearScenario,
      clearPhoto,
      clearTrainingRecord,
      selectPhoto,
      selectScenario,
      selectedScenario,
      selectedPhotoName,
      selectedPhotoFileId,
      selectedPhotoUri,
      selectedTrainingRecord,
      selectTrainingRecord,
    ],
  );

  return (
    <CommunityPostDraftContext.Provider value={value}>
      {children}
    </CommunityPostDraftContext.Provider>
  );
}

export const useCommunityPostDraft = () => {
  const context = useContext(CommunityPostDraftContext);
  if (!context) {
    throw new Error(
      "useCommunityPostDraft must be used inside CommunityPostDraftProvider",
    );
  }
  return context;
};
