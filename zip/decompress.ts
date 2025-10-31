import { exists, join } from "./deps.ts";
import { getFileNameFromPath } from "./utils.ts";
export const decompress = async (
  filePath: string,
  destinationPath: string | null = "./",
  options: any = {},
): Promise<string | false> => {
  // check if the zip file is exist
  if (!(await exists(filePath))) {
    throw "this file does not found";
  }
  // check destinationPath is not null and set './' as destinationPath
  if (!destinationPath) {
    destinationPath = "./";
  }

  // the file name with aut extension
  const fileNameWithOutExt = getFileNameFromPath(filePath);
  // get the extract file and add fileNameWithOutExt whene options.includeFileName is true
  const fullDestinationPath = options.includeFileName
    ? join(destinationPath, fileNameWithOutExt)
    : destinationPath;

  // return the unzipped file path or false whene the unzipping Process failed
  return (await decompressProcess(filePath, fullDestinationPath))
    ? fullDestinationPath
    : false;
};
// deno run -A main.ts  或至少 --allow-run
export async function decompressProcess(
  zipSourcePath: string,
  destinationPath: string,
): Promise<boolean> {
  const isWindows = Deno.build.os === "windows";

  // Windows: PowerShell Expand-Archive
  if (isWindows) {
    const cmd = new Deno.Command("pwsh", {
      args: [
        "-NoProfile",
        "-Command",
        // 使用 LiteralPath 避免转义问题，-Force 覆盖已有文件
        `Expand-Archive -LiteralPath '${zipSourcePath}' -DestinationPath '${destinationPath}' -Force`,
      ],
      stdout: "piped",
      stderr: "piped",
    });
    const { success, stdout, stderr } = await cmd.output();
    if (!success) {
      console.error(new TextDecoder().decode(stderr));
    } else {
      // 可选：查看输出
      // console.log(new TextDecoder().decode(stdout));
    }
    return success;
  }

  // Unix: 调用 unzip
  const cmd = new Deno.Command("unzip", {
    args: ["-q", "-o", zipSourcePath, "-d", destinationPath],
    stdout: "piped",
    stderr: "piped",
  });
  const { success, stderr } = await cmd.output();
  if (!success) {
    console.error(new TextDecoder().decode(stderr));
  }
  return success;
}
