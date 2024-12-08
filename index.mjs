#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { program } from "commander";

import { scanForAlteredFiles, scanForFiles, hasSrcDir } from "./src/git.mjs";
import { readComponentsManifest } from "./src/components.mjs";
import { createDiff } from "./src/create-diff.mjs";
import { execSync } from "node:child_process";


program.option("-n, --name <name>").option('--init');
program.parse();

const options = program.opts();

const runCommand = (command) => {
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(`Failed to execute command: ${command}`);
    process.exit(1);
  }
};

const ensureGitignore = () => {
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    console.log(".gitignore file is missing. Creating one...");
    const content = `
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`;
    fs.writeFileSync(gitignorePath, content, "utf8");
    console.log(".gitignore file created with default rules.");
  } else {
    console.log(".gitignore file already exists.");
  }
};

const main = () => {
  if (options.init) {
    console.log("Initializing git repository for new component");
    // Cross-platform logic
    if (process.platform === "win32") {
      runCommand("rmdir /s /q .git && git init && git add . && git commit -m \"Initial commit\"");
    } else {
      runCommand("rm -fr .git && git init && git add . && git commit -m \"Initial commit\"");
    }
    ensureGitignore()
    return;
  }

  const name = options.name || path.basename(process.cwd());

  const { alteredFiles, specificFiles } = scanForAlteredFiles([
    "./package.json",
  ]);
  const currentFiles = scanForFiles(process.cwd());

  const currentPackageJson = fs.readFileSync("./package.json", "utf-8");

  const config = readComponentsManifest(process.cwd());
  config.isSrcDir = hasSrcDir(process.cwd());

  const output = createDiff({
    name,
    config,
    alteredFiles,
    currentFiles,
    specificFiles,
    currentPackageJson,
  });

  console.log(JSON.stringify(output, null, 2));
};

main();
