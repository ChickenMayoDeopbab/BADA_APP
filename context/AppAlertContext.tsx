import CustomModal from "@/components/common/CustomModal";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type AppAlertActionTone = "primary" | "neutral" | "danger";

interface AppAlertOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmTone?: AppAlertActionTone;
  onConfirm?: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
  closeOnBackdrop?: boolean;
}

interface AppAlertContextValue {
  showAlert: (options: AppAlertOptions) => void;
  dismissAlert: () => void;
}

const AppAlertContext = createContext<AppAlertContextValue | null>(null);

/** 앱 전역의 안내·오류 메시지를 공용 모달 UI로 표시한다. */
export function AppAlertProvider({ children }: PropsWithChildren) {
  const [alert, setAlert] = useState<AppAlertOptions | null>(null);
  const alertRef = useRef<AppAlertOptions | null>(null);

  const showAlert = useCallback((options: AppAlertOptions) => {
    alertRef.current = options;
    setAlert(options);
  }, []);

  const dismissAlert = useCallback(() => {
    const onCancel = alertRef.current?.onCancel;
    alertRef.current = null;
    setAlert(null);
    onCancel?.();
  }, []);

  const confirmAlert = useCallback(() => {
    const onConfirm = alertRef.current?.onConfirm;
    alertRef.current = null;
    setAlert(null);
    onConfirm?.();
  }, []);

  const value = useMemo(
    () => ({ showAlert, dismissAlert }),
    [dismissAlert, showAlert],
  );

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      <CustomModal
        visible={Boolean(alert)}
        title={alert?.title ?? ""}
        description={alert?.description}
        closeOnBackdrop={alert?.closeOnBackdrop}
        onClose={dismissAlert}
        secondaryAction={
          alert?.cancelLabel
            ? {
                label: alert.cancelLabel,
                tone: "neutral",
                onPress: dismissAlert,
              }
            : undefined
        }
        primaryAction={{
          label: alert?.confirmLabel ?? "확인",
          tone: alert?.confirmTone ?? "primary",
          onPress: confirmAlert,
        }}
      />
    </AppAlertContext.Provider>
  );
}

export function useAppAlert(): AppAlertContextValue {
  const context = useContext(AppAlertContext);
  if (!context) {
    throw new Error("useAppAlert must be used inside AppAlertProvider");
  }
  return context;
}
