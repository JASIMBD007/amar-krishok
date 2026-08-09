import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export type PreparedPhoto = {
  height: number;
  sizeBytes: number;
  uri: string;
  width: number;
};

export async function photoToBase64(photo: PreparedPhoto) {
  const bytes = new Uint8Array(await (await fetch(photo.uri)).arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return globalThis.btoa(binary);
}

const targetBytes = 500_000;

async function contentLength(uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob.size;
}

export async function pickAndCompressPhoto(): Promise<PreparedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, mediaTypes: ["images"], quality: 1 });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;

  let quality = 0.72;
  let width = Math.min(asset.width, 1600);
  let output = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width } }], { compress: quality, format: ImageManipulator.SaveFormat.JPEG });
  let sizeBytes = await contentLength(output.uri);

  while (sizeBytes > targetBytes && width > 480) {
    quality = Math.max(0.2, quality - 0.1);
    width = Math.max(480, Math.round(width * 0.82));
    output = await ImageManipulator.manipulateAsync(output.uri, [{ resize: { width } }], { compress: quality, format: ImageManipulator.SaveFormat.JPEG });
    sizeBytes = await contentLength(output.uri);
  }

  if (sizeBytes > targetBytes) return null;

  return { height: output.height, sizeBytes, uri: output.uri, width: output.width };
}
