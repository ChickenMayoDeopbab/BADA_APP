const handleSignup = async () => {
  const {
    email: rawEmail,
    password,
    name: rawName,
    username: rawUsername,
  } = methods.getValues();

  const email = rawEmail.trim();
  const name = rawName.trim();
  const username = rawUsername.trim();

  setIsSigningUp(true);
  setSignupError("");

  try {
    await postSignup({
      username,
      password,
      email,
      name,
    });

    await markDiagnosisRequired(username);

    router.replace("/auth/login");
    return true;
  } catch (error) {
    setSignupError(
      getApiErrorMessage(
        error,
        "회원가입에 실패했습니다. 입력 정보를 확인해주세요.",
      ),
    );

    return false;
  } finally {
    setIsSigningUp(false);
  }
};