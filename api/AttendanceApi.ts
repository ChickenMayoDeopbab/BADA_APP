import apiClient from "./client";
import { ApiResponse } from "./types";

export interface AttendanceDate {
  date: string;
}

/** 오늘의 출석을 등록합니다. */
export const checkAttendance = async (): Promise<void> => {
  await apiClient.post("/api/v1/attendance");
};

/** 지정한 연월의 출석 날짜를 조회합니다. */
export const getAttendantDays = async (
  year: number,
  month: number,
): Promise<ApiResponse<AttendanceDate[]>> => {
  const response = await apiClient.get<ApiResponse<AttendanceDate[]>>(
    "/api/v1/attendance",
    { params: { year, month } },
  );

  return response.data;
};
