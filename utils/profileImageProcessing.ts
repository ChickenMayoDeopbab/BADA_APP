import { File } from "expo-file-system";

const MAX_UPLOAD_BYTES = 850 * 1024;

const OUTPUT_PASSES = [
  { maxSide: 1080, compress: 0.68 },
  { maxSide: 720, compress: 0.52 },
] as const;

const jpegName = (fileName?: string) => {
  const baseName = fileName?.replace(/\.[^/.]+$/, "").trim() || "profile";
  return `${baseName}.jpg`;
};

export async function prepareProfileImageForUpload(
  uri: string,
  fileName?: string,
) {
  let imageManipulatorModule: typeof import("expo-image-manipulator");

  try {
    imageManipulatorModule = await import("expo-image-manipulator");
  } catch {
    throw new Error(
      "프로필 사진 기능을 사용하려면 앱을 최신 개발 빌드로 다시 설치해주세요.",
    );
  }

  const { ImageManipulator, SaveFormat } = imageManipulatorModule;
  const source = await ImageManipulator.manipulate(uri).renderAsync();

  for (const pass of OUTPUT_PASSES) {
    const context = ImageManipulator.manipulate(source);
    if (Math.max(source.width, source.height) > pass.maxSide) {
      context.resize(
        source.width >= source.height
          ? { width: pass.maxSide }
          : { height: pass.maxSide },
      );
    }

    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      compress: pass.compress,
      format: SaveFormat.JPEG,
    });
    const size = new File(result.uri).size;

    if (size <= MAX_UPLOAD_BYTES) {
      return { uri: result.uri, fileName: jpegName(fileName) };
    }
  }

  throw new Error("사진 용량을 충분히 줄이지 못했어요. 다른 사진을 선택해주세요.");
}
