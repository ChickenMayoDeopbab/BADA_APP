const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

/** 네이티브 모듈 등록 상태를 대체하여 앱의 이미지 코드를 실행한다. */
function loadImageUtility(relativePath, { platform, isAvailable, picker }) {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const imports = [];
  const nativeChecks = [];
  const loaded = new Module(filename, module);
  loaded.require = (id) => {
    imports.push(id);
    if (id === "expo") return {
      requireOptionalNativeModule: (name) => {
        nativeChecks.push(name);
        return isAvailable(name) ? {} : null;
      },
    };
    if (id === "react-native") return { Platform: { OS: platform } };
    if (id === "expo-image-picker" && picker) return picker;
    throw new Error(`Cannot load native dependency: ${id}`);
  };
  loaded._compile(compiled, filename);
  return { api: loaded.exports, imports, nativeChecks };
}

test("loading image utilities does not require photo native modules during screen entry", () => {
  for (const filename of ["../utils/imagePicker.ts", "../utils/profileImageProcessing.ts"]) {
    const { imports, nativeChecks } = loadImageUtility(filename, {
      platform: "ios", isAvailable: () => false,
    });
    assert.deepEqual(imports, ["expo", "react-native"]);
    assert.deepEqual(nativeChecks, []);
  }
});

test("a missing image picker is reported without importing the failing native package", async () => {
  for (const platform of ["ios", "android"]) {
    const { api, imports } = loadImageUtility("../utils/imagePicker.ts", {
      platform, isAvailable: () => false,
    });
    await assert.rejects(api.pickSingleImage(), /현재 설치된 앱에서는 사진 선택 기능/);
    assert.ok(!imports.includes("expo-image-picker"));
    assert.equal(await api.getPendingImagePickerResult(), null);
  }
});

test("supported native and web pickers preserve the selected asset and single-image options", async () => {
  const selected = { canceled: false, assets: [{ uri: "file:///selected.jpg", fileName: "selected.jpg" }] };
  for (const platform of ["ios", "android", "web"]) {
    const { api, imports, nativeChecks } = loadImageUtility("../utils/imagePicker.ts", {
      platform,
      isAvailable: () => platform !== "web",
      picker: {
        UIImagePickerPreferredAssetRepresentationMode: { Compatible: "compatible" },
        launchImageLibraryAsync: async (options) => {
          assert.deepEqual(options, {
            mediaTypes: ["images"],
            allowsEditing: false,
            allowsMultipleSelection: false,
            quality: 1,
            preferredAssetRepresentationMode: "compatible",
          });
          return selected;
        },
      },
    });
    assert.ok(!imports.includes("expo-image-picker"));
    assert.equal(await api.pickSingleImage(), selected);
    assert.ok(imports.includes("expo-image-picker"));
    if (platform === "web") assert.deepEqual(nativeChecks, []);
  }
});

test("Android pending photo results are restored when the native picker is available", async () => {
  const pending = { canceled: false, assets: [{ uri: "file:///restored.jpg" }] };
  const { api } = loadImageUtility("../utils/imagePicker.ts", {
    platform: "android", isAvailable: () => true,
    picker: { getPendingResultAsync: async () => pending },
  });
  assert.equal(await api.getPendingImagePickerResult(), pending);
});

test("pending photo recovery does not load an image picker on iOS or web", async () => {
  for (const platform of ["ios", "web"]) {
    const { api, imports, nativeChecks } = loadImageUtility("../utils/imagePicker.ts", {
      platform, isAvailable: () => true,
    });
    assert.equal(await api.getPendingImagePickerResult(), null);
    assert.deepEqual(nativeChecks, []);
    assert.ok(!imports.includes("expo-image-picker"));
  }
});

test("a failing picker import produces the supported installation guidance", async () => {
  const { api } = loadImageUtility("../utils/imagePicker.ts", {
    platform: "ios", isAvailable: () => true,
  });
  await assert.rejects(api.pickSingleImage(), /앱을 다시 설치해주세요/);
});

test("missing file or manipulation native modules block photo processing without importing them", async () => {
  for (const missing of ["FileSystem", "ExpoImageManipulator"]) {
    const { api, imports } = loadImageUtility("../utils/profileImageProcessing.ts", {
      platform: "ios", isAvailable: (name) => name !== missing,
    });
    await assert.rejects(api.prepareProfileImageForUpload("file:///selected.jpg"), /최신 개발 빌드/);
    assert.ok(!imports.includes("expo-file-system"));
    assert.ok(!imports.includes("expo-image-manipulator"));
  }
});
