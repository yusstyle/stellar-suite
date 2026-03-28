import JSZip from "jszip";
import { type FileNode } from "@/lib/sample-contracts";

function addNodesToZip(zip: JSZip, nodes: FileNode[], parentPath: string) {
  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    if (node.type === "folder" && node.children) {
      const folder = zip.folder(currentPath);
      if (folder) {
        addNodesToZip(zip, node.children, currentPath);
      }
    } else if (node.type === "file") {
      zip.file(currentPath, node.content ?? "");
    }
  }
}

export async function exportWorkspaceAsZip(
  files: FileNode[],
  projectName: string,
): Promise<void> {
  const zip = new JSZip();

  addNodesToZip(zip, files, "");

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${projectName}.zip`;
  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
