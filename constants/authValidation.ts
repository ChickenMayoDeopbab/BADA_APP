export const emailRules = {
  required: "이메일을 입력해주세요.",
  pattern: {
    value: /^[a-zA-Z0-9+-_.]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
    message: "올바른 이메일 형식이 아닙니다.",
  },
};

export const authCodeRules = {
  required: "인증코드를 입력해주세요.",
  validate: (value: string) =>
    value.trim().length > 0 || "인증코드를 입력해주세요.",
};

export const loginUsernameRules = {
  required: "아이디를 입력해주세요.",
  validate: (value: string) =>
    value.trim().length > 0 || "아이디를 입력해주세요.",
};

export const loginPasswordRules = {
  required: "비밀번호를 입력해주세요.",
};

export const nameRules = {
  required: "이름을 입력해주세요.",
  validate: (value: string) =>
    value.trim().length >= 2 || "이름은 2자 이상이어야 합니다.",
};

export const usernameRules = {
  required: "아이디를 입력해주세요.",
  validate: (value: string) =>
    value.trim().length >= 2 || "아이디는 2자 이상이어야 합니다.",
};

export const passwordRules = {
  required: "비밀번호를 입력해주세요.",
  minLength: {
    value: 8,
    message: "비밀번호는 8자 이상이어야 합니다.",
  },
  pattern: {
    value: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
    message: "영문, 숫자를 포함해야 합니다.",
  },
};

export const newPasswordRules = {
  ...passwordRules,
  required: "새 비밀번호를 입력해주세요.",
};

export const oldPasswordRules = {
  required: "기존 비밀번호를 입력해주세요.",
};

export const createConfirmPasswordRules = (
  getPassword: () => string,
  requiredMessage = "비밀번호 확인을 입력해주세요.",
) => ({
  required: requiredMessage,
  validate: (value: string) =>
    value === getPassword() || "비밀번호가 일치하지 않습니다.",
});
