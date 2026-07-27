const handleLogin = async () => {
  const isValid = await trigger(["username", "password"]);
  if (!isValid) return;

  setIsLoggingIn(true);

  try {
    const { username: rawUsername, password } = getValues();
    const username = rawUsername.trim();

    const response = await postLogin({
      username,
      password,
    });

    await AsyncStorage.setItem(
      "accessToken",
      response.data.accessToken,
    );
    await AsyncStorage.setItem(
      "refreshToken",
      response.data.refreshToken,
    );
    await AsyncStorage.setItem(
      "autoLogin",
      isChecked ? "true" : "false",
    );

    await setAuthenticatedUsername(username);

    const needsDiagnosis = await isDiagnosisRequired(username);

    router.replace(
      needsDiagnosis ? "/diagnosis/welcome" : "/home",
    );
  } catch (error) {
    const errorField =
      getApiErrorStatus(error) === 404 ? "username" : "password";

    setError(errorField, {
      type: "server",
      message: getApiErrorMessage(
        error,
        "아이디 또는 비밀번호가 올바르지 않습니다.",
      ),
    });
  } finally {
    setIsLoggingIn(false);
  }
};

const clearLoginServerError = () => {
  if (errors.username?.type === "server") {
    clearErrors("username");
  }

  if (errors.password?.type === "server") {
    clearErrors("password");
  }
};