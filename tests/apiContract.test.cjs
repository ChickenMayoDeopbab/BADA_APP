const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const filename = path.resolve(__dirname, "../api/requestBuilders.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const loaded = new Module(filename, module);
loaded._compile(compiled, filename);

const {
  createDiagnosisSubmitRequest,
  createEmailSendRequest,
  createEmailVerificationRequest,
} = loaded.exports;

test("email send request always includes a verification type", () => {
  assert.deepEqual(createEmailSendRequest(" user@example.com ", "SIGNUP"), {
    email: "user@example.com",
    type: "SIGNUP",
  });
});

test("email check request normalizes values and keeps its purpose", () => {
  assert.deepEqual(
    createEmailVerificationRequest(
      " user@example.com ",
      " 123456 ",
      "RESET_PASSWORD",
    ),
    {
      email: "user@example.com",
      authNum: "123456",
      type: "RESET_PASSWORD",
    },
  );
});

test("diagnosis request contains only fields accepted by the server", () => {
  const answers = [1, 2, 3];
  const request = createDiagnosisSubmitRequest(
    "session-id",
    "SIGNUP",
    answers,
  );

  assert.deepEqual(request, {
    sessionId: "session-id",
    type: "SIGNUP",
    answers: [1, 2, 3],
  });
  assert.notEqual(request.answers, answers);
});
