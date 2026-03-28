import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { type FileNode } from "@/lib/sample-contracts";

// Re-implement the core traversal logic for testing without DOM dependency
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

const sampleTree: FileNode[] = [
  {
    name: "hello_world",
    type: "folder",
    children: [
      {
        name: "src",
        type: "folder",
        children: [
          {
            name: "lib.rs",
            type: "file",
            language: "rust",
            content: '#![no_std]\nuse soroban_sdk::{contract, contractimpl};\n\n#[contract]\npub struct HelloWorld;\n\n#[contractimpl]\nimpl HelloWorld {\n    pub fn hello() -> u32 { 42 }\n}\n',
          },
        ],
      },
      {
        name: "Cargo.toml",
        type: "file",
        language: "toml",
        content: '[package]\nname = "hello_world"\nversion = "0.1.0"\n',
      },
      {
        name: ".gitignore",
        type: "file",
        content: "target/\n",
      },
    ],
  },
];

describe("exportZip", () => {
  it("preserves deep recursive folder paths in the ZIP", async () => {
    const zip = new JSZip();
    addNodesToZip(zip, sampleTree, "");

    const paths = Object.keys(zip.files).filter(
      (p) => !zip.files[p].dir,
    );

    expect(paths).toContain("hello_world/src/lib.rs");
    expect(paths).toContain("hello_world/Cargo.toml");
  });

  it("includes hidden files like .gitignore", async () => {
    const zip = new JSZip();
    addNodesToZip(zip, sampleTree, "");

    const paths = Object.keys(zip.files).filter(
      (p) => !zip.files[p].dir,
    );

    expect(paths).toContain("hello_world/.gitignore");
  });

  it("preserves file content correctly", async () => {
    const zip = new JSZip();
    addNodesToZip(zip, sampleTree, "");

    const cargoContent = await zip.file("hello_world/Cargo.toml")?.async("string");
    expect(cargoContent).toContain('[package]');
    expect(cargoContent).toContain('name = "hello_world"');
  });

  it("creates folder entries for nested directories", async () => {
    const zip = new JSZip();
    addNodesToZip(zip, sampleTree, "");

    const dirs = Object.keys(zip.files).filter(
      (p) => zip.files[p].dir,
    );

    expect(dirs).toContain("hello_world/");
    expect(dirs).toContain("hello_world/src/");
  });
});
