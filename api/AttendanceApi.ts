import apiClient from "./client"
import { ApiResponse } from "./types";

export const checkAttendance = async ():Promise<void> => {
  await apiClient.post("/api/v1/attendance");
}

export const getAttendantDays = async (y: number, m: number):Promise<ApiResponse<string[]>> => {
  const response = await apiClient.get<ApiResponse<string[]>>("/api/v1/attendance", {
    params: {
      year: y,
      month: m
    }
  })

  return response.data;
};