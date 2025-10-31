import { exists, join } from "./deps.ts";
interface CompressOptions {
  overwrite?: boolean;
}

// 假设你仍在用 std 的 exists / join：
// import { exists } from "jsr:@std/fs/exists";
// import { join } from "jsr:@std/path/join";

export async function compressProcess(
  files: string | string[],
  archiveName = "./archive.zip",
  options?: CompressOptions,
): Promise<boolean> {
  // 1) 处理覆盖逻辑
  if (await exists(archiveName)) {
    if (!options?.overwrite) {
      throw `The archive file ${join(
        Deno.cwd(),
        archiveName,
      )} already exists. Use { overwrite: true } to overwrite the existing archive file.`;
    } else {
      // zip/Compress-Archive 会更新或报错，这里主动删掉老文件更干净
      await Deno.remove(archiveName, { recursive: false }).catch(() => {});
    }
  }

  // 2) 统一把 files 变成数组
  const fileList = Array.isArray(files) ? files : [files];

  // 3) Windows: 使用 PowerShell Compress-Archive
  if (Deno.build.os === "windows") {
    // PowerShell 字符串安全转义（单引号 -> 两个单引号）
    const psq = (s: string) => s.replaceAll("'", "''");
    // Compress-Archive 支持数组，这里用 PowerShell Array 文字量 @('a','b')
    const psArray = `@(${fileList.map((p) => `'${psq(p)}'`).join(",")})`;
    const cmd = new Deno.Command("powershell", {
      args: [
        "-NoProfile",
        "-Command",
        // -Force 覆盖；使用 -LiteralPath 避免通配问题
        `Compress-Archive -LiteralPath ${psArray} -DestinationPath '${psq(
          archiveName,
        )}' ${options?.overwrite ? "-Force" : ""}`,
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { success, stderr } = await cmd.output();
    if (!success) {
      console.error(new TextDecoder().decode(stderr));
    }
    return success;
  }

  // 4) *nix: 调用 zip -q -r archiveName <files...>
  // zip 会创建新文件；我们上面已删除旧文件（当 overwrite=true 时）
  const cmd = new Deno.Command("zip", {
    args: ["-q", "-r", archiveName, ...fileList],
    stdout: "piped",
    stderr: "piped",
  });

  const { success, stderr } = await cmd.output();
  if (!success) {
    console.error(new TextDecoder().decode(stderr));
  }
  return success;
}

export const compress = async (
  files: string | string[],
  archiveName: string = "./archive.zip",
  options?: CompressOptions,
): Promise<boolean> => {
  return await compressProcess(files, archiveName, options);
};
