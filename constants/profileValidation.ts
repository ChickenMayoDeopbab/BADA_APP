export const PROFILE_NAME_MAX_LENGTH = 20;
export const PROFILE_USERNAME_MAX_LENGTH = 30;

export const toSingleLine = (value: string) =>
  value.replace(/[\r\n\u2028\u2029]/g, "");

export const validateProfileName = (value: string) => {
  const name = value.trim();
  if (name.length < 2) return "이름은 2자 이상 입력해주세요.";
  if (name.length > PROFILE_NAME_MAX_LENGTH) {
    return `이름은 최대 ${PROFILE_NAME_MAX_LENGTH}자까지 입력할 수 있어요.`;
  }
  return "";
};

export const validateProfileUsername = (value: string) => {
  const username = value.trim();
  if (username.length < 2) return "아이디는 2자 이상 입력해주세요.";
  if (username.length > PROFILE_USERNAME_MAX_LENGTH) {
    return `아이디는 최대 ${PROFILE_USERNAME_MAX_LENGTH}자까지 입력할 수 있어요.`;
  }
  if (/\s/.test(username)) return "아이디에는 공백을 사용할 수 없어요.";
  return "";
};
